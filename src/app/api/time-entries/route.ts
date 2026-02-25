import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const firefighterId = searchParams.get('firefighterId');
    const start = searchParams.get('start');
    const end = searchParams.get('end');
    const includeArchived = searchParams.get('includeArchived') === 'true';
    const activeOnly = searchParams.get('activeOnly') === 'true';

    try {
        const where: any = {};

        // By default, only show entries for active firefighters unless specifically requested
        if (!includeArchived) {
            where.firefighter = {
                isActive: true
            };
        }

        if (firefighterId) {
            where.firefighterId = firefighterId;
            // If we are looking up a specific firefighter, we might want to ignore the global 'isActive' filter 
            // if we want to see their history even if archived. 
            // However, the prompt implies "archived with the user", so hiding them is safer default.
            // But if I am on the "Reports" page and select an Archived user (if possible), I'd want to see them.
            // let's stick to the strict "hide if archived" rule for now unless includeArchived is true.
        }

        if (start || end) {
            where.clockIn = {};
            if (start) where.clockIn.gte = new Date(start);
            if (end) where.clockIn.lte = new Date(end);
        }

        // If filtering, remove the 'take' limit to get accurate totals
        const limit = (start || end || firefighterId || activeOnly) ? undefined : 50;

        if (activeOnly) {
            where.clockOut = null;
        }

        const timeEntries = await prisma.timeEntry.findMany({
            where,
            include: {
                firefighter: {
                    select: {
                        name: true,
                        role: { select: { name: true } }
                    },
                },
            },
            orderBy: { clockIn: 'desc' },
            take: limit,
        });
        return NextResponse.json(timeEntries);
    } catch (error) {
        return NextResponse.json({ error: 'Failed to fetch time entries' }, { status: 500 });
    }
}
