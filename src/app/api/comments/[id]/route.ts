import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

export async function PUT(request: Request, props: { params: Promise<{ id: string }> }) {
    const params = await props.params;
    try {
        const body = await request.json();
        const { content, authorId } = body;

        if (!content || !authorId) {
            return NextResponse.json({ error: 'Content and Author ID are required' }, { status: 400 });
        }

        const comment = await prisma.issueComment.findUnique({
            where: { id: params.id }
        });

        if (!comment) {
            return NextResponse.json({ error: 'Comment not found' }, { status: 404 });
        }

        if (comment.authorId !== authorId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        }

        const updatedComment = await prisma.issueComment.update({
            where: { id: params.id },
            data: { content },
            include: { author: true }
        });

        return NextResponse.json(updatedComment);
    } catch (error) {
        console.error('Error updating comment:', error);
        return NextResponse.json({ error: 'Failed to update comment' }, { status: 500 });
    }
}

export async function DELETE(request: Request, props: { params: Promise<{ id: string }> }) {
    const params = await props.params;
    try {
        const { searchParams } = new URL(request.url);
        const authorId = searchParams.get('authorId');

        if (!authorId) {
            return NextResponse.json({ error: 'Author ID is required' }, { status: 400 });
        }

        const comment = await prisma.issueComment.findUnique({
            where: { id: params.id }
        });

        if (!comment) {
            return NextResponse.json({ error: 'Comment not found' }, { status: 404 });
        }

        if (comment.authorId !== authorId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        }

        await prisma.issueComment.delete({
            where: { id: params.id }
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error deleting comment:', error);
        return NextResponse.json({ error: 'Failed to delete comment' }, { status: 500 });
    }
}
