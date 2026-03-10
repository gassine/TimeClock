import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';

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
export async function GET() {
    try {
        const notices = await prisma.notice.findMany({
            include: { author: { select: { name: true } } },
            orderBy: [
                { isPinned: 'desc' },
                { order: 'asc' },
                { createdAt: 'desc' },
            ],
        });

        return NextResponse.json(notices);
    } catch (error) {
        console.error('Failed to fetch notices:', error);
        return NextResponse.json({ error: 'Failed to fetch notices' }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const currentUser = await getCurrentUser();
        if (!currentUser) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const data = await req.json();

        // Ensure user is allowed to post
        const settings = await prisma.noticeSettings.findFirst();
        if (!currentUser.isAdmin && !settings?.everyoneCanPost) {
            return NextResponse.json({ error: 'Only admins can post notices' }, { status: 403 });
        }

        const newNotice = await prisma.notice.create({
            data: {
                text: data.text,
                authorId: currentUser.id,
                isPinned: data.isPinned || false,
                order: data.order || 0,
            },
            include: { author: { select: { name: true } } }
        });

        return NextResponse.json(newNotice);
    } catch (error) {
        console.error('Failed to create notice:', error);
        return NextResponse.json({ error: 'Failed to create notice' }, { status: 500 });
    }
}

export async function PUT(req: Request) {
    try {
        const currentUser = await getCurrentUser();
        if (!currentUser || !currentUser.isAdmin) {
            return NextResponse.json({ error: 'Only admins can reorder notices' }, { status: 403 });
        }

        const data = await req.json();

        // Expected data format: { notices: [{ id: '1', order: 0 }, { id: '2', order: 1 }] }
        if (!data.notices || !Array.isArray(data.notices)) {
            return NextResponse.json({ error: 'Invalid data format' }, { status: 400 });
        }

        // Perform updates in a transaction
        const updatePromises = data.notices.map((notice: { id: string, order: number }) =>
            prisma.notice.update({
                where: { id: notice.id },
                data: { order: notice.order }
            })
        );

        await prisma.$transaction(updatePromises);

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Failed to reorder notices:', error);
        return NextResponse.json({ error: 'Failed to reorder notices' }, { status: 500 });
    }
}
