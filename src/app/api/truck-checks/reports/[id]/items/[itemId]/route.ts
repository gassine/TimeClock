import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { broadcastToReport } from '../../stream/route';

export async function PUT(request: Request, context: { params: Promise<{ id: string, itemId: string }> }) {
    try {
        const { id: reportId, itemId } = await context.params;
        const { status, comments, completedByUserId, completedByRadioId } = await request.json();

        // 1. Validate report exists and is Open
        const report = await prisma.truckCheckReport.findUnique({
            where: { id: reportId }
        });

        if (!report) {
            return NextResponse.json({ error: 'Report not found' }, { status: 404 });
        }

        if (report.status === 'Closed') {
            return NextResponse.json({ error: 'Cannot edit a closed report' }, { status: 403 });
        }

        // 2. Perform the update
        const updatedItem = await prisma.truckCheckReportItem.update({
            where: {
                id: itemId,
                reportId: reportId // Safety check
            },
            data: {
                status,
                comments,
                completedByUserId,
                completedByRadioId,
                completedAt: new Date()
            },
            include: {
                completedByUser: true
            }
        });

        // 3. Broadcast the update to all clients listening to this report's SSE
        broadcastToReport(reportId, updatedItem);

        // 4. Return success
        return NextResponse.json(updatedItem);

    } catch (error) {
        console.error('Update report item error:', error);
        return NextResponse.json({ error: 'Failed to update item' }, { status: 500 });
    }
}
