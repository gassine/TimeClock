import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthUser } from '@/lib/auth';
import { logAdminAction } from '@/lib/logger';
import { format } from 'date-fns';

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
    const user = await getAuthUser();
    if (!user?.isAdmin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    try {
        const { id } = await params;
        const { status } = await request.json();
        if (status !== 'APPROVED') return NextResponse.json({ error: 'Invalid review status' }, { status: 400 });

        const problem = await prisma.timeProblem.update({
            where: { id },
            data: { status: 'APPROVED', reviewedAt: new Date(), reviewedById: user.id },
            include: {
                timeEntry: { include: { firefighter: { select: { name: true } } } },
                reviewedBy: { select: { name: true } },
            },
        });
        await logAdminAction(
            'APPROVE', 'TimeEntry', problem.timeEntryId,
            `Approved ${problem.timeEntry.firefighter.name}'s long shift from ${format(problem.timeEntry.clockIn, 'MMM dd, yyyy h:mm a')} to ${problem.timeEntry.clockOut ? format(problem.timeEntry.clockOut, 'MMM dd, yyyy h:mm a') : 'active'}.`,
            user.id
        );
        return NextResponse.json(problem);
    } catch (error) {
        console.error('Failed to approve time problem:', error);
        return NextResponse.json({ error: 'Failed to approve time record' }, { status: 500 });
    }
}
