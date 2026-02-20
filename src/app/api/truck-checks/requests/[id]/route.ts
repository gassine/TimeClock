import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

// Request to reopen a closed report (POST from User context)
export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
    try {
        const { id: reportId } = await context.params;
        const { requestedByUserId } = await request.json();

        const report = await prisma.truckCheckReport.findUnique({
            where: { id: reportId }
        });

        if (!report) {
            return NextResponse.json({ error: 'Report not found' }, { status: 404 });
        }

        if (report.status !== 'Closed') {
            return NextResponse.json({ error: 'Report is not closed' }, { status: 400 });
        }

        const reopenRequest = await prisma.truckCheckRequest.create({
            data: {
                reportId,
                requestedByUserId,
                status: 'PENDING'
            },
            include: {
                requestedByUser: true,
                report: {
                    include: { apparatus: true }
                }
            }
        });

        return NextResponse.json(reopenRequest);
    } catch (error) {
        console.error('Request reopen error:', error);
        return NextResponse.json({ error: 'Failed to request reopen' }, { status: 500 });
    }
}

// Fetch reopen requests (GET for Admin dashboard context)
export async function GET() {
    try {
        const requests = await prisma.truckCheckRequest.findMany({
            where: { status: 'PENDING' },
            include: {
                requestedByUser: true,
                report: {
                    include: { apparatus: true }
                }
            },
            orderBy: { createdAt: 'desc' }
        });

        return NextResponse.json(requests);
    } catch (error) {
        console.error('Fetch reopen requests error:', error);
        return NextResponse.json({ error: 'Failed to fetch reopen requests' }, { status: 500 });
    }
}

// Admin approves or denies a reopen request
export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
    try {
        // Here ID is the request ID, not the report ID
        const { id: requestId } = await context.params;
        const { status, adminNotes } = await request.json(); // "APPROVED" or "DENIED"

        if (!['APPROVED', 'DENIED'].includes(status)) {
            return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
        }

        // Transaction to update request and report simultaneously
        const updatedRequest = await prisma.$transaction(async (tx) => {
            const req = await tx.truckCheckRequest.update({
                where: { id: requestId },
                data: { status, adminNotes },
                include: { report: true }
            });

            if (status === 'APPROVED') {
                await tx.truckCheckReport.update({
                    where: { id: req.reportId },
                    data: { status: 'Open' }
                });
            }

            return req;
        });

        return NextResponse.json(updatedRequest);
    } catch (error) {
        console.error('Process reopen request error:', error);
        return NextResponse.json({ error: 'Failed to process request' }, { status: 500 });
    }
}
