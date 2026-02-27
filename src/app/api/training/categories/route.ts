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
        // Type narrowing for the boolean field that TS occasionally chokes on
        return user as typeof user & { isAdmin: boolean };
    } catch {
        return null;
    }
}

// GET: Fetch all active categories the user is authorized for
export async function GET() {
    try {
        const currentUser = await getCurrentUser();
        if (!currentUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        // Admins can see EVERYTHING including inactive and deleted
        if (currentUser.isAdmin) {
            const categories = await prisma.trainingCategory.findMany({
                where: { isDeleted: false },
                orderBy: { order: 'asc' },
                include: {
                    _count: {
                        select: { posts: { where: { isDeleted: false } } }
                    }
                }
            });
            return NextResponse.json(categories);
        }

        // Standard users only see ACTIVE categories where:
        // isEveryone === true OR viewRoles contains their Role ID
        const allActive = await prisma.trainingCategory.findMany({
            where: { isDeleted: false, isActive: true, isAdminOnly: false },
            orderBy: { order: 'asc' },
            include: {
                _count: {
                    select: { posts: { where: { isDeleted: false, status: 'ACTIVE' } } }
                }
            }
        });

        // Filter server-side
        const allowed = allActive.filter(cat => {
            if (cat.isEveryone) return true;
            try {
                const allowedRoles = JSON.parse(cat.viewRoles || '[]');
                return allowedRoles.includes(currentUser.roleId);
            } catch {
                return false;
            }
        });

        return NextResponse.json(allowed);

    } catch (error) {
        console.error('Error fetching categories:', error);
        return NextResponse.json({ error: 'Failed to fetch' }, { status: 500 });
    }
}

// POST: Create a new category (Admin Only)
export async function POST(request: Request) {
    try {
        const currentUser = await getCurrentUser();
        if (!currentUser?.isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

        const body = await request.json();
        const { name, description, isAdminOnly, isEveryone, viewRoles, postRoles } = body;

        // Auto-assign order to the end
        const lastCategory = await prisma.trainingCategory.findFirst({
            orderBy: { order: 'desc' },
        });
        const order = lastCategory ? lastCategory.order + 1 : 0;

        const newCategory = await prisma.trainingCategory.create({
            data: {
                name,
                description,
                isAdminOnly: isAdminOnly ?? false,
                isEveryone: isEveryone ?? true,
                viewRoles: typeof viewRoles === 'string' ? viewRoles : JSON.stringify(viewRoles || []),
                postRoles: typeof postRoles === 'string' ? postRoles : JSON.stringify(postRoles || []),
                order,
            },
        });

        await logAdminAction('CREATE', 'TrainingCategory', newCategory.id, `Created training category: ${name}`);
        return NextResponse.json(newCategory);

    } catch (error) {
        console.error('Error creating category:', error);
        return NextResponse.json({ error: 'Failed to create' }, { status: 500 });
    }
}

// PUT: Bulk reorder categories or update a specific one (Admin Only)
export async function PUT(request: Request) {
    try {
        const currentUser = await getCurrentUser();
        if (!currentUser?.isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

        const body = await request.json();

        // Handle Reorder Array
        if (Array.isArray(body)) {
            const updates = body.map((id: string, idx: number) =>
                prisma.trainingCategory.update({
                    where: { id },
                    data: { order: idx },
                })
            );
            await prisma.$transaction(updates);
            await logAdminAction('UPDATE', 'TrainingCategory', 'bulk', 'Reordered training categories');
            return NextResponse.json({ success: true });
        }

        // Handle Single Update
        const { id, name, description, isActive, isDeleted, isAdminOnly, isEveryone, viewRoles, postRoles } = body;

        const updateData: any = {};
        if (name !== undefined) updateData.name = name;
        if (description !== undefined) updateData.description = description;
        if (isActive !== undefined) updateData.isActive = isActive;
        if (isDeleted !== undefined) updateData.isDeleted = isDeleted;
        if (isAdminOnly !== undefined) updateData.isAdminOnly = isAdminOnly;
        if (isEveryone !== undefined) updateData.isEveryone = isEveryone;
        if (viewRoles !== undefined) updateData.viewRoles = JSON.stringify(viewRoles);
        if (postRoles !== undefined) updateData.postRoles = JSON.stringify(postRoles);

        const updated = await prisma.trainingCategory.update({
            where: { id },
            data: updateData,
        });

        await logAdminAction('UPDATE', 'TrainingCategory', id, `Updated training category: ${updated.name}`);
        return NextResponse.json(updated);

    } catch (error) {
        console.error('Error updating category:', error);
        return NextResponse.json({ error: 'Failed to update' }, { status: 500 });
    }
}

// DELETE: Hard-delete a category and all nested posts/replies (Admin Only)
export async function DELETE(request: Request) {
    try {
        const currentUser = await getCurrentUser();
        if (!currentUser?.isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

        const url = new URL(request.url);
        const id = url.searchParams.get('id');

        if (!id) {
            return NextResponse.json({ error: 'Category ID is required' }, { status: 400 });
        }

        // We use a transaction to ensure clean cascading deletion.
        // Even though Prisma supports direct cascading if schema.prisma has onDelete: Cascade,
        // it's safer to manually wipe children to enforce business rules and log the action.

        // 1. Find all Posts belonging to this category
        const posts = await prisma.trainingPost.findMany({
            where: { categoryId: id },
            select: { id: true }
        });
        const postIds = posts.map(p => p.id);

        if (postIds.length > 0) {
            await prisma.$transaction([
                // Wipe Read Statuses
                prisma.trainingReadStatus.deleteMany({ where: { postId: { in: postIds } } }),
                // Wipe Versions
                prisma.trainingPostVersion.deleteMany({ where: { postId: { in: postIds } } }),
                // Wipe Replies
                prisma.trainingReply.deleteMany({ where: { postId: { in: postIds } } }),
                // Wipe Posts
                prisma.trainingPost.deleteMany({ where: { categoryId: id } }),
                // Finally, wipe the Category itself
                prisma.trainingCategory.delete({ where: { id } })
            ]);
        } else {
            // No posts, just wipe the category
            await prisma.trainingCategory.delete({ where: { id } });
        }

        await logAdminAction('DELETE', 'TrainingCategory', id, `Permanently deleted Training Category and its associated posts/replies.`);

        return NextResponse.json({ success: true });

    } catch (error) {
        console.error('Error deleting category:', error);
        return NextResponse.json({ error: 'Failed to delete category' }, { status: 500 });
    }
}
