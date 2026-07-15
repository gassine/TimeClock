import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';
import { broadcastNoticeChange } from '@/lib/noticeStreams';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-key-change-this';

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
export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const currentUser = await getCurrentUser();
        if (!currentUser) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const resolvedParams = await params;
        const noticeId = resolvedParams.id;
        if (!noticeId) {
            return NextResponse.json({ error: 'Notice ID required' }, { status: 400 });
        }

        const settings = await prisma.noticeSettings.findFirst();

        // Find notice author
        const notice = await prisma.notice.findUnique({
            where: { id: noticeId }
        });

        if (!notice) {
            return NextResponse.json({ error: 'Notice not found' }, { status: 404 });
        }

        // Must be admin or "everyoneCanDelete" must be true
        if (!currentUser.isAdmin && !settings?.everyoneCanDelete && notice.authorId !== currentUser.id) {
            return NextResponse.json({ error: 'Cannot delete this notice' }, { status: 403 });
        }

        await prisma.notice.delete({
            where: { id: noticeId }
        });

        broadcastNoticeChange('deleted');

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Failed to delete notice:', error);
        return NextResponse.json({ error: 'Failed to delete notice' }, { status: 500 });
    }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const currentUser = await getCurrentUser();
        if (!currentUser || !currentUser.isAdmin) {
            return NextResponse.json({ error: 'Only admins can modify notice pin status' }, { status: 403 });
        }

        const resolvedParams = await params;
        const noticeId = resolvedParams.id;
        if (!noticeId) {
            return NextResponse.json({ error: 'Notice ID required' }, { status: 400 });
        }

        const data = await req.json();

        // Update the isPinned status
        const updatedNotice = await prisma.notice.update({
            where: { id: noticeId },
            data: {
                isPinned: data.isPinned
            }
        });

        broadcastNoticeChange('pinned');

        return NextResponse.json(updatedNotice);
    } catch (error) {
        console.error('Failed to update notice:', error);
        return NextResponse.json({ error: 'Failed to update notice' }, { status: 500 });
    }
}
