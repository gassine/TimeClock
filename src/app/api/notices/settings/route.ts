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
export async function GET() {
    try {
        let settings = await prisma.noticeSettings.findFirst();

        // If settings don't exist yet, create a default set
        if (!settings) {
            settings = await prisma.noticeSettings.create({
                data: {
                    everyoneCanPost: false,
                    everyoneCanDelete: false
                }
            });
        }

        return NextResponse.json(settings);
    } catch (error) {
        console.error('Failed to fetch notice settings:', error);
        return NextResponse.json({ error: 'Failed to fetch notice settings' }, { status: 500 });
    }
}

export async function PATCH(req: Request) {
    try {
        const currentUser = await getCurrentUser();
        // Only admins can change notice settings
        if (!currentUser || !currentUser.isAdmin) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        }

        const data = await req.json();

        let settings = await prisma.noticeSettings.findFirst();

        if (!settings) {
            settings = await prisma.noticeSettings.create({
                data: {
                    everyoneCanPost: data.everyoneCanPost ?? false,
                    everyoneCanDelete: data.everyoneCanDelete ?? false
                }
            });
        } else {
            settings = await prisma.noticeSettings.update({
                where: { id: settings.id },
                data: {
                    everyoneCanPost: data.everyoneCanPost !== undefined ? data.everyoneCanPost : settings.everyoneCanPost,
                    everyoneCanDelete: data.everyoneCanDelete !== undefined ? data.everyoneCanDelete : settings.everyoneCanDelete
                }
            });
        }

        broadcastNoticeChange('settings');

        return NextResponse.json(settings);
    } catch (error) {
        console.error('Failed to update notice settings:', error);
        return NextResponse.json({ error: 'Failed to update notice settings' }, { status: 500 });
    }
}
