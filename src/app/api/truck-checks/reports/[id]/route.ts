import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await context.params;

        const report = await prisma.truckCheckReport.findUnique({
            where: { id },
            include: {
                apparatus: true,
                items: {
                    include: {
                        templateItem: {
                            include: {
                                location: true
                            }
                        },
                        completedByUser: true
                    },
                    orderBy: {
                        templateItem: { order: 'asc' }
                    }
                }
            }
        });

        if (!report) {
            return NextResponse.json({ error: 'Report not found' }, { status: 404 });
        }

        return NextResponse.json(report);
    } catch (error) {
        console.error('Fetch report error:', error);
        return NextResponse.json({ error: 'Failed to fetch report' }, { status: 500 });
    }
}

export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await context.params;
        const { status } = await request.json();

        if (!status || !['Open', 'Closed'].includes(status)) {
            return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
        }

        const report = await prisma.truckCheckReport.update({
            where: { id },
            data: { status },
            include: { apparatus: true }
        });

        return NextResponse.json(report);
    } catch (error) {
        console.error('Update report status error:', error);
        return NextResponse.json({ error: 'Failed to update status' }, { status: 500 });
    }
}

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await context.params;

        const report = await prisma.truckCheckReport.findUnique({
            where: { id }
        });

        if (!report) {
            return NextResponse.json({ error: 'Report not found' }, { status: 404 });
        }

        if (report.status !== 'Open') {
            return NextResponse.json({ error: 'Only open reports can be deleted' }, { status: 400 });
        }

        await prisma.truckCheckReport.delete({
            where: { id }
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Delete report error:', error);
        return NextResponse.json({ error: 'Failed to delete report' }, { status: 500 });
    }
}
