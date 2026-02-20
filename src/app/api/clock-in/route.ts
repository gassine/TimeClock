import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { pin, stationId } = body;

        if (!pin) {
            return NextResponse.json({ error: 'PIN (Radio ID) is required' }, { status: 400 });
        }

        // Find firefighter by PIN
        const firefighter = await prisma.firefighter.findUnique({
            where: { pin },
        });

        if (!firefighter) {
            return NextResponse.json({ error: 'Invalid PIN' }, { status: 401 });
        }

        if (!firefighter.isActive) {
            return NextResponse.json({ error: 'User is archived/disabled' }, { status: 403 });
        }

        // Check for active shift
        const activeShift = await prisma.timeEntry.findFirst({
            where: {
                firefighterId: firefighter.id,
                clockOut: null,
            },
        });

        if (activeShift) {
            return NextResponse.json({ error: 'Already clocked in' }, { status: 409 });
        }

        const timeEntry = await prisma.timeEntry.create({
            data: {
                firefighterId: firefighter.id,
                stationId,
                clockIn: new Date(),
            },
            include: {
                firefighter: true,
            },
        });

        return NextResponse.json(timeEntry, { status: 201 });
    } catch (error) {
        console.error('Clock-in error:', error);
        return NextResponse.json({ error: 'Failed to clock in' }, { status: 500 });
    }
}
