import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { logAdminAction } from '@/lib/logger';
import { format } from 'date-fns';

export async function PUT(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const body = await request.json();
        const { clockIn, clockOut } = body;

        if (!clockIn) {
            return NextResponse.json({ error: 'Clock In time is required' }, { status: 400 });
        }

        const clockInDate = new Date(clockIn);
        const clockOutDate = clockOut ? new Date(clockOut) : null;

        if (clockOutDate && clockOutDate <= clockInDate) {
            return NextResponse.json({ error: 'Clock Out time must be after Clock In time' }, { status: 400 });
        }

        const timeEntry = await prisma.timeEntry.update({
            where: { id },
            data: {
                clockIn: clockInDate,
                clockOut: clockOutDate,
            },
            include: {
                firefighter: true // Return with firefighter data to update UI efficiently
            }
        });


        const formatDate = (d: Date | null) => d ? format(d, 'MMM dd, hh:mm a') : 'Active';

        await logAdminAction(
            'UPDATE',
            'TimeEntry',
            id,
            `Updated time entry: In ${formatDate(timeEntry.clockIn)} - Out ${formatDate(timeEntry.clockOut)}`
        );

        return NextResponse.json(timeEntry);
    } catch (error) {
        console.error('Error updating time entry:', error);
        return NextResponse.json({ error: 'Failed to update time entry' }, { status: 500 });
    }
}

export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        await prisma.timeEntry.delete({
            where: { id },
        });

        await logAdminAction(
            'DELETE',
            'TimeEntry',
            id,
            'Deleted time entry'
        );

        return NextResponse.json({ message: 'Time entry deleted successfully' });
    } catch (error) {
        console.error('Error deleting time entry:', error);
        return NextResponse.json({ error: 'Failed to delete time entry' }, { status: 500 });
    }
}
