import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { content, issueId, authorId } = body;

        if (!content || !issueId || !authorId) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        const newComment = await prisma.issueComment.create({
            data: {
                content,
                issueId,
                authorId
            },
            include: {
                author: true
            }
        });

        return NextResponse.json(newComment);
    } catch (error) {
        console.error('Error creating comment:', error);
        return NextResponse.json({ error: 'Failed to create comment' }, { status: 500 });
    }
}
