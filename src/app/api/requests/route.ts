import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const firefighterId = searchParams.get('firefighterId');
    const status = searchParams.get('status');

    try {
        const where: any = {};
        if (firefighterId) where.firefighterId = firefighterId;
        if (status) where.status = status;

        const requests = await prisma.timeChangeRequest.findMany({
            where,
            include: {
                firefighter: true,
                timeEntry: true
            },
            orderBy: { createdAt: 'desc' }
        });

        return NextResponse.json(requests);
    } catch (error) {
        return NextResponse.json({ error: 'Failed to fetch requests' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { firefighterId, timeEntryId, requestedClockIn, requestedClockOut, reason } = body;

        const newRequest = await prisma.timeChangeRequest.create({
            data: {
                firefighterId,
                timeEntryId: timeEntryId || null,
                requestedClockIn: requestedClockIn ? new Date(requestedClockIn) : null,
                requestedClockOut: requestedClockOut ? new Date(requestedClockOut) : null,
                reason,
                status: 'PENDING'
            }
        });

        return NextResponse.json(newRequest);
    } catch (error) {
        return NextResponse.json({ error: 'Failed to create request' }, { status: 500 });
    }
}
