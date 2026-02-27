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

// GET: Fetch all active replies for a given post
export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const currentUser = await getCurrentUser();
        if (!currentUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const resolvedParams = await params;
        const postId = resolvedParams.id;

        // Verify the user actually has access to the POST's category
        const post = await prisma.trainingPost.findUnique({
            where: { id: postId },
            include: { category: true }
        });

        if (!post || post.isDeleted) return NextResponse.json({ error: 'Post not found' }, { status: 404 });

        if (!currentUser.isAdmin && !post.category.isEveryone && !post.category.isAdminOnly) {
            try {
                const viewRoles = JSON.parse(post.category.viewRoles || '[]');
                if (!viewRoles.includes(currentUser.roleId)) {
                    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
                }
            } catch {
                return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
            }
        }

        const replies = await prisma.trainingReply.findMany({
            where: {
                postId,
                ...(!currentUser.isAdmin && { isDeleted: false }) // Admins see all, users see active
            },
            include: {
                author: { select: { id: true, name: true, role: { select: { name: true, id: true } } } }
            },
            orderBy: { createdAt: 'asc' }
        });

        return NextResponse.json(replies);

    } catch (error) {
        console.error('Error fetching replies:', error);
        return NextResponse.json({ error: 'Failed to fetch replies' }, { status: 500 });
    }
}

// POST: Add a new reply to a post
export async function POST(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const currentUser = await getCurrentUser();
        if (!currentUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const resolvedParams = await params;
        const postId = resolvedParams.id;
        const body = await request.json();
        const { content } = body;

        const post = await prisma.trainingPost.findUnique({
            where: { id: postId },
            include: { category: true }
        });

        if (!post || post.isDeleted || post.status !== 'ACTIVE') {
            return NextResponse.json({ error: 'Post not found or closed' }, { status: 404 });
        }

        if (!post.allowReplies && !currentUser.isAdmin) {
            return NextResponse.json({ error: 'Replies are locked for this post' }, { status: 403 });
        }

        // Verify category access
        if (!currentUser.isAdmin && !post.category.isEveryone && !post.category.isAdminOnly) {
            try {
                const viewRoles = JSON.parse(post.category.viewRoles || '[]');
                if (!viewRoles.includes(currentUser.roleId)) {
                    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
                }
            } catch {
                return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
            }
        }

        const reply = await prisma.trainingReply.create({
            data: {
                content,
                postId,
                authorId: currentUser.id
            },
            include: {
                author: { select: { id: true, name: true, role: { select: { name: true, id: true } } } }
            }
        });

        return NextResponse.json(reply);

    } catch (error) {
        console.error('Error creating reply:', error);
        return NextResponse.json({ error: 'Failed to create reply' }, { status: 500 });
    }
}

// DELETE: Soft delete a specific reply
export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const currentUser = await getCurrentUser();
        if (!currentUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const resolvedParams = await params;
        const postId = resolvedParams.id;
        const { searchParams } = new URL(request.url);
        const replyId = searchParams.get('id');

        if (!replyId) return NextResponse.json({ error: 'Missing Reply ID' }, { status: 400 });

        const existingReply = await prisma.trainingReply.findUnique({
            where: { id: replyId }
        });

        if (!existingReply || existingReply.postId !== postId) {
            return NextResponse.json({ error: 'Reply not found' }, { status: 404 });
        }

        const isAuthor = existingReply.authorId === currentUser.id;
        if (!currentUser.isAdmin && !isAuthor) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        // Technically soft-delete so it preserves structure if needed, or hard delete
        // In the schema, replies have `isDeleted`
        const deleted = await prisma.trainingReply.update({
            where: { id: replyId },
            data: { isDeleted: true }
        });

        if (currentUser.isAdmin) {
            await logAdminAction('DELETE', 'TrainingReply', replyId, `Admin soft deleted reply from post ${postId}`);
        }

        return NextResponse.json({ success: true, deletedId: deleted.id });

    } catch (error) {
        console.error('Error deleting reply:', error);
        return NextResponse.json({ error: 'Failed to delete' }, { status: 500 });
    }
}
