import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

const LONG_SHIFT_MS = 12 * 60 * 60 * 1000;

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { pin } = body;

        if (!pin) {
            return NextResponse.json({ error: 'PIN (Radio ID) is required' }, { status: 400 });
        }

        // Find firefighter by PIN
        const firefighter = await prisma.firefighter.findUnique({
            where: { pin },
        });

        if (!firefighter) {
            return NextResponse.json({ error: 'Invalid PIN' }, { status: 404 });
        }

        // Find active shift
        const activeShift = await prisma.timeEntry.findFirst({
            where: {
                firefighterId: firefighter.id,
                clockOut: null,
            },
        });

        if (!activeShift) {
            return NextResponse.json({ error: 'No active shift found' }, { status: 404 });
        }

        const clockOut = new Date();
        const updatedEntry = await prisma.$transaction(async (tx) => {
            const entry = await tx.timeEntry.update({
                where: { id: activeShift.id },
                data: { clockOut },
                include: { firefighter: true },
            });

            if (clockOut.getTime() - activeShift.clockIn.getTime() > LONG_SHIFT_MS) {
                await tx.timeProblem.upsert({
                    where: { timeEntryId: activeShift.id },
                    create: { timeEntryId: activeShift.id },
                    update: { status: 'PENDING', reviewedAt: null, reviewedById: null },
                });
            }

            return entry;
        });

        return NextResponse.json(updatedEntry, { status: 200 });
    } catch (error) {
        console.error('Clock-out error:', error);
        return NextResponse.json({ error: 'Failed to clock out' }, { status: 500 });
    }
}
