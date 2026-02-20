
import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

export async function GET() {
    try {
        const logs = await prisma.auditLog.findMany({
            include: {
                admin: {
                    select: { name: true }
                }
            },
            orderBy: { createdAt: 'desc' },
            take: 100 // Limit to last 100 logs for now
        });
        return NextResponse.json(logs);
    } catch (error) {
        return NextResponse.json({ error: 'Failed to fetch audit logs' }, { status: 500 });
    }
}
