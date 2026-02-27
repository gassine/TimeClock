import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

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

// GET (Admin Only): Fetch historical versions of a specific post
export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const currentUser = await getCurrentUser();
        // Only Admins can view previous version histories for moderation
        if (!currentUser?.isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

        const resolvedParams = await params;
        const postId = resolvedParams.id;

        const versions = await prisma.trainingPostVersion.findMany({
            where: { postId },
            include: { editor: { select: { id: true, name: true } } },
            orderBy: { createdAt: 'desc' }
        });

        return NextResponse.json(versions);

    } catch (error) {
        console.error('Error fetching version history:', error);
        return NextResponse.json({ error: 'Failed to fetch versions' }, { status: 500 });
    }
}
