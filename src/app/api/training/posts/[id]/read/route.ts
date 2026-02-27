import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

// Helper to get current user session
async function getCurrentUser() {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('session')?.value;
    if (!sessionCookie) return null;
    try {
        const session = JSON.parse(sessionCookie);
        const user = await prisma.firefighter.findUnique({
            where: { id: session.id },
            include: { role: true },
        });
        return user as typeof user & { isAdmin: boolean };
    } catch {
        return null;
    }
}

// POST: Mark a post as read by the current user
export async function POST(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const currentUser = await getCurrentUser();
        if (!currentUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const resolvedParams = await params;
        const postId = resolvedParams.id;

        // Upsert the read status so it doesn't crash if they click twice
        await prisma.trainingReadStatus.upsert({
            where: {
                postId_userId: {
                    postId,
                    userId: currentUser.id
                }
            },
            update: {
                readAt: new Date()
            },
            create: {
                postId,
                userId: currentUser.id
            }
        });

        return NextResponse.json({ success: true });

    } catch (error) {
        console.error('Error marking post read:', error);
        return NextResponse.json({ error: 'Failed to mark read' }, { status: 500 });
    }
}

// GET (Admin Only): Fetch all read receipts for this post to see who has/hasn't read it
export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const currentUser = await getCurrentUser();
        if (!currentUser?.isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

        const resolvedParams = await params;
        const postId = resolvedParams.id;

        // Get everyone who has read it
        const readers = await prisma.trainingReadStatus.findMany({
            where: { postId },
            include: { user: { select: { id: true, name: true, role: { select: { name: true } } } } },
            orderBy: { readAt: 'desc' }
        });

        // Optimization: Admins might want to know who HASN'T read it. 
        // We'll return the readers here, the UI can diff it against the total roster
        return NextResponse.json(readers);

    } catch (error) {
        console.error('Error fetching read statuses:', error);
        return NextResponse.json({ error: 'Failed to fetch read statuses' }, { status: 500 });
    }
}
