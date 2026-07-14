import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthUser } from '@/lib/auth';

const LONG_SHIFT_MS = 12 * 60 * 60 * 1000;

export async function GET() {
    const user = await getAuthUser();
    if (!user?.isAdmin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    try {
        const unreviewedEntries = await prisma.timeEntry.findMany({
            where: { clockOut: { not: null }, timeProblem: { is: null } },
            select: { id: true, clockIn: true, clockOut: true },
        });
        const longEntries = unreviewedEntries.filter((entry) =>
            entry.clockOut && entry.clockOut.getTime() - entry.clockIn.getTime() > LONG_SHIFT_MS
        );
        if (longEntries.length > 0) {
            await prisma.$transaction(longEntries.map((entry) =>
                prisma.timeProblem.create({ data: { timeEntryId: entry.id } })
            ));
        }

        const problems = await prisma.timeProblem.findMany({
            where: { status: { in: ['PENDING', 'APPROVED'] } },
            include: {
                timeEntry: { include: { firefighter: { select: { id: true, name: true } } } },
                reviewedBy: { select: { name: true } },
            },
            orderBy: [{ status: 'desc' }, { detectedAt: 'desc' }],
        });
        return NextResponse.json(problems);
    } catch (error) {
        console.error('Failed to fetch time problems:', error);
        return NextResponse.json({ error: 'Failed to fetch potential time problems' }, { status: 500 });
    }
}
