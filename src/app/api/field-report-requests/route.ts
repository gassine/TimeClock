import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const status = searchParams.get('status');
        const reportId = searchParams.get('reportId');

        const where: any = {};
        if (status) where.status = status;
        if (reportId) where.reportId = reportId;

        const requests = await prisma.fieldReportModRequest.findMany({
            where,
            include: {
                report: {
                    include: { incidentType: true }
                },
                requestedByUser: { select: { name: true, radioId: true } }
            },
            orderBy: { createdAt: 'desc' }
        });

        return NextResponse.json(requests);
    } catch (error) {
        console.error('Error fetching requests:', error);
        return NextResponse.json({ error: 'Failed to fetch requests' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json();

        if (!body.reportId || !body.requestedByUserId || !body.requestType) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        const modRequest = await prisma.fieldReportModRequest.create({
            data: {
                reportId: body.reportId,
                requestedByUserId: body.requestedByUserId,
                requestedByRadioId: body.requestedByRadioId || 'N/A',
                requestType: body.requestType,
                reason: body.reason,
                proposedChanges: body.proposedChanges ? JSON.stringify(body.proposedChanges) : null,
                apparatusId: body.apparatusId,
                status: 'PENDING'
            }
        });

        return NextResponse.json(modRequest);
    } catch (error) {
        console.error('Error creating request:', error);
        return NextResponse.json({ error: 'Failed to create request' }, { status: 500 });
    }
}
