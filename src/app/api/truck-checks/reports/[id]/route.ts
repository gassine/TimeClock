import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const report = await prisma.truckCheckReport.findUnique({
            where: { id },
            include: {
                apparatus: true,
                template: true,
                items: {
                    include: {
                        templateItem: true
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
        console.error('Error fetching report:', error);
        return NextResponse.json({ error: 'Failed to fetch report' }, { status: 500 });
    }
}

// PUT: Update a specific truck check report (e.g., change status)
export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const data = await request.json();

        const report = await prisma.truckCheckReport.update({
            where: { id },
            data: {
                status: data.status
            }
        });

        return NextResponse.json(report);
    } catch (error) {
        console.error('Error updating truck check report:', error);
        return NextResponse.json({ error: 'Failed to update report' }, { status: 500 });
    }
}

// DELETE: Completely remove a truck check report and all its items
export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;

        // Prisma relation on cascade delete will handle the ReportItems
        await prisma.truckCheckReport.delete({
            where: { id }
        });

        return NextResponse.json({ success: true, message: 'Report deleted successfully' });
    } catch (error) {
        console.error('Error deleting truck check report:', error);
        return NextResponse.json({ error: 'Failed to delete report' }, { status: 500 });
    }
}
