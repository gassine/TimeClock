import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { logAdminAction } from '@/lib/logger';

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const body = await request.json();
        const { status, adminComment } = body; // APPROVED, REJECTED

        // 1. Update Request Status
        const changeRequest = await prisma.timeChangeRequest.update({
            where: { id },
            data: {
                status,
                adminComment
            },
            include: { timeEntry: true, firefighter: true }
        });

        // 2. If APPROVED, Apply changes to TimeEntry
        if (status === 'APPROVED') {
            if (changeRequest.timeEntryId) {
                // Update Existing Entry
                const updateData: any = {};
                if (changeRequest.requestedClockIn) updateData.clockIn = changeRequest.requestedClockIn;
                if (changeRequest.requestedClockOut) updateData.clockOut = changeRequest.requestedClockOut;

                await prisma.timeEntry.update({
                    where: { id: changeRequest.timeEntryId },
                    data: updateData
                });

            } else {
                // Create NEW Entry
                if (changeRequest.requestedClockIn) {
                    await prisma.timeEntry.create({
                        data: {
                            firefighterId: changeRequest.firefighterId,
                            clockIn: changeRequest.requestedClockIn,
                            clockOut: changeRequest.requestedClockOut
                        }
                    });
                }
            }
        }

        await logAdminAction(
            status, // APPROVED or REJECTED
            'TimeChangeRequest',
            id,
            `${status} request from ${changeRequest.firefighter?.name || 'Unknown'}`
        );

        return NextResponse.json(changeRequest);
    } catch (error) {
        console.error('Error updating request:', error);
        return NextResponse.json({ error: 'Failed to update request' }, { status: 500 });
    }
}
