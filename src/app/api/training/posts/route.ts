import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { logAdminAction } from '@/lib/logger';

import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-key-change-this';

// Helper to get current user session
async function getCurrentUser() {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth_session')?.value;
    if (!token) return null;
    try {
        const decoded = jwt.verify(token, JWT_SECRET) as any;
        const user = await prisma.firefighter.findUnique({
            where: { id: decoded.id },
            include: { role: true },
        });
        return user as typeof user & { isAdmin: boolean };
    } catch {
        return null;
    }
}

// GET: Fetch posts (Search/Filter capable), strictly enforcing Category read permissions
export async function GET(request: Request) {
    try {
        const currentUser = await getCurrentUser();
        if (!currentUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const { searchParams } = new URL(request.url);
        const categoryId = searchParams.get('categoryId');
        const search = searchParams.get('search');
        const isDraft = searchParams.get('isDraft') === 'true';

        // Drafts Mode: Ignore category limits and return only the user's drafts
        if (isDraft) {
            const drafts = await prisma.trainingPost.findMany({
                where: {
                    isDeleted: false,
                    status: 'DRAFT',
                    authorId: currentUser.id
                },
                include: {
                    author: { select: { id: true, name: true, role: { select: { name: true, id: true } } } },
                    category: { select: { name: true, id: true } },
                    _count: { select: { replies: { where: { isDeleted: false } } } },
                    readStatuses: {
                        where: { userId: currentUser.id },
                        select: { id: true }
                    }
                },
                orderBy: { updatedAt: 'desc' }
            });
            return NextResponse.json(drafts.map(post => ({ ...post, isUnread: false })));
        }

        // --- Standard Active Posts Mode ---
        // 1. Identify which categories the user is allowed to read.
        // Admins can read all.
        let allowedCategoryIds: string[] = [];

        if (currentUser.isAdmin) {
            const allCats = await prisma.trainingCategory.findMany({ select: { id: true } });
            allowedCategoryIds = allCats.map(c => c.id);
        } else {
            const allActive = await prisma.trainingCategory.findMany({
                where: { isDeleted: false, isActive: true, isAdminOnly: false },
                select: { id: true, isEveryone: true, viewRoles: true }
            });

            allowedCategoryIds = allActive.filter(cat => {
                if (cat.isEveryone) return true;
                try {
                    const allowedRoles = JSON.parse(cat.viewRoles || '[]');
                    return allowedRoles.includes(currentUser.roleId);
                } catch {
                    return false;
                }
            }).map(c => c.id);
        }

        // If they asked for a specific category, verify they have access to it
        if (categoryId && !allowedCategoryIds.includes(categoryId)) {
            return NextResponse.json({ error: 'Forbidden Category' }, { status: 403 });
        }

        // 2. Build Query
        const whereClause: any = {
            isDeleted: false,
            categoryId: categoryId ? categoryId : { in: allowedCategoryIds },
            // In standard mode, always filter for ACTIVE unless they are Admin
            ...(!currentUser.isAdmin && { status: 'ACTIVE' }),
        };

        if (search) {
            whereClause.OR = [
                { title: { contains: search } },
                { content: { contains: search } }
            ];
        }

        // 3. Execute
        const posts = await prisma.trainingPost.findMany({
            where: whereClause,
            include: {
                author: { select: { id: true, name: true, role: { select: { name: true, id: true } } } },
                category: { select: { name: true, id: true } },
                _count: { select: { replies: { where: { isDeleted: false } } } },
                readStatuses: {
                    where: { userId: currentUser.id },
                    select: { id: true }
                }
            },
            orderBy: [
                { isPinned: 'desc' },
                { order: 'asc' },
                { createdAt: 'desc' }
            ]
        });

        // Map read statuses to a simple boolean
        const formattedPosts = posts.map(post => ({
            ...post,
            isUnread: post.readStatuses.length === 0
        }));

        return NextResponse.json(formattedPosts);

    } catch (error) {
        console.error('Error fetching posts:', error);
        return NextResponse.json({ error: 'Failed to fetch' }, { status: 500 });
    }
}

// POST: Create a new post. Must have POST permission in that category.
export async function POST(request: Request) {
    try {
        const currentUser = await getCurrentUser();
        if (!currentUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const body = await request.json();
        const { categoryId, title, content, status, isPinned, allowReplies, expiresAt } = body;

        // Verify POST permissions for this category
        const category = await prisma.trainingCategory.findUnique({
            where: { id: categoryId }
        });

        if (!category || category.isDeleted) return NextResponse.json({ error: 'Category not found' }, { status: 404 });

        if (!currentUser.isAdmin) {
            console.log(`[POST TrainingPost] User ${currentUser.name} (Role: ${currentUser.roleId}) attempting to post.`);
            if (!category.isActive) {
                console.log(`[POST TrainingPost] -> Rejected: Category inactive.`);
                return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
            }

            try {
                const postRoles = JSON.parse(category.postRoles || '[]');
                console.log(`[POST TrainingPost] -> Category postRoles configured as:`, postRoles);

                if (postRoles.includes('ADMIN_ONLY')) {
                    console.log(`[POST TrainingPost] -> Rejected: Admin Only mode enabled.`);
                    return NextResponse.json({ error: 'Forbidden - Admin Only' }, { status: 403 });
                }

                if (!postRoles.includes('EVERYONE') && !postRoles.includes(currentUser.roleId)) {
                    console.log(`[POST TrainingPost] -> Rejected: Missing EVERYONE or explicit Role ID.`);
                    return NextResponse.json({ error: 'Forbidden - No Posting Rights' }, { status: 403 });
                }

                console.log(`[POST TrainingPost] -> Accepted: Permissions OK.`);
            } catch (err) {
                console.error(`[POST TrainingPost] JSON Parse Error for postRoles:`, err);
                return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
            }
        }

        // Auto-assign order (bottom of category)
        const lastPost = await prisma.trainingPost.findFirst({
            where: { categoryId },
            orderBy: { order: 'desc' }
        });
        const order = lastPost ? lastPost.order + 1 : 0;

        const newPost = await prisma.trainingPost.create({
            data: {
                title,
                content,
                status: status || 'ACTIVE',
                isPinned: currentUser.isAdmin ? (isPinned ?? false) : false, // Only admins can pin
                allowReplies: allowReplies ?? true,
                expiresAt: expiresAt ? new Date(expiresAt) : null,
                order,
                categoryId,
                authorId: currentUser.id,
            }
        });

        // Automatically mark as read for the author
        await prisma.trainingReadStatus.create({
            data: {
                postId: newPost.id,
                userId: currentUser.id
            }
        });

        return NextResponse.json(newPost);

    } catch (error) {
        console.error('Error creating post:', error);
        return NextResponse.json({ error: 'Failed to create' }, { status: 500 });
    }
}

// PUT: Bulk reorder posts or update a specific post.
export async function PUT(request: Request) {
    try {
        const currentUser = await getCurrentUser();
        if (!currentUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const body = await request.json();

        // Handle Reorder Array (Admins Only)
        if (Array.isArray(body)) {
            if (!currentUser.isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
            const updates = body.map((id: string, idx: number) =>
                prisma.trainingPost.update({
                    where: { id },
                    data: { order: idx },
                })
            );
            await prisma.$transaction(updates);
            return NextResponse.json({ success: true });
        }

        // Handle Single Update (Author or Admin)
        const { id, title, content, status, isPinned, isDeleted, allowReplies, expiresAt } = body;

        const existingPost = await prisma.trainingPost.findUnique({ where: { id } });
        if (!existingPost) return NextResponse.json({ error: 'Not found' }, { status: 404 });

        const isAuthor = existingPost.authorId === currentUser.id;
        if (!currentUser.isAdmin && !isAuthor) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        // If content or title changed, save a Version History snapshot first
        if ((title && title !== existingPost.title) || (content && content !== existingPost.content)) {
            await prisma.trainingPostVersion.create({
                data: {
                    postId: id,
                    title: existingPost.title,
                    content: existingPost.content,
                    editorId: currentUser.id
                }
            });
        }

        const updateData: any = {};
        if (title !== undefined) updateData.title = title;
        if (content !== undefined) updateData.content = content;
        if (status !== undefined) updateData.status = status;
        if (allowReplies !== undefined) updateData.allowReplies = allowReplies;
        if (expiresAt !== undefined) updateData.expiresAt = expiresAt ? new Date(expiresAt) : null;

        // Admin only fields
        if (currentUser.isAdmin) {
            if (isPinned !== undefined) updateData.isPinned = isPinned;
            if (isDeleted !== undefined) {
                updateData.isDeleted = isDeleted;
                if (isDeleted) {
                    await logAdminAction('DELETE', 'TrainingPost', id, `Soft deleted post: ${existingPost.title}`);
                }
            }
        }

        const updated = await prisma.trainingPost.update({
            where: { id },
            data: updateData,
            include: {
                author: { select: { id: true, name: true, role: { select: { name: true, id: true } } } },
                category: { select: { name: true, id: true } },
                _count: { select: { replies: { where: { isDeleted: false } } } }
            }
        });

        return NextResponse.json(updated);

    } catch (error) {
        console.error('Error updating post:', error);
        return NextResponse.json({ error: 'Failed to update' }, { status: 500 });
    }
}

// DELETE: Soft delete a specific post (Authors or Admins)
export async function DELETE(request: Request) {
    try {
        const currentUser = await getCurrentUser();
        if (!currentUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');

        if (!id) return NextResponse.json({ error: 'Missing ID' }, { status: 400 });

        const existingPost = await prisma.trainingPost.findUnique({ where: { id } });
        if (!existingPost) return NextResponse.json({ error: 'Not found' }, { status: 404 });

        const isAuthor = existingPost.authorId === currentUser.id;
        if (!currentUser.isAdmin && !isAuthor) {
            return NextResponse.json({ error: 'Forbidden - Cannot delete others posts' }, { status: 403 });
        }

        // Technically we soft-delete here so we don't break database constraints visually immediately
        const deleted = await prisma.trainingPost.update({
            where: { id },
            data: { isDeleted: true }
        });

        if (currentUser.isAdmin) {
            await logAdminAction('DELETE', 'TrainingPost', id, `Admin strictly soft deleted post: ${existingPost.title}`);
        }

        return NextResponse.json({ success: true, deletedId: deleted.id });

    } catch (error) {
        console.error('Error deleting post:', error);
        return NextResponse.json({ error: 'Failed to delete' }, { status: 500 });
    }
}
