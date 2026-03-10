import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const start = searchParams.get('start');
        const end = searchParams.get('end');
        const firefighterId = searchParams.get('firefighterId');

        if (!start) {
            return NextResponse.json({ error: 'Start date is required' }, { status: 400 });
        }

        const startDate = new Date(start);
        const endDate = end ? new Date(end) : new Date();

        const where: any = {
            reportApparatus: {
                report: {
                    date: {
                        gte: startDate,
                        lte: endDate
                    },
                    status: {
                        isEditable: false
                    }
                }
            }
        };

        if (firefighterId) {
            where.firefighterId = firefighterId;
        }

        // Find all personnel records attached to reports in this date range
        // filtering out drafts
        const personnelRecords = await prisma.fieldReportApparatusPersonnel.findMany({
            where,
            select: {
                firefighterId: true
            }
        });

        // Aggregate counts in memory (since we might have many records, but usually not millions for this scope)
        // Alternatively we can use groupBy if Prisma supports it for this relation structure easily, 
        // but finding many with select is often simple enough for aggregation if dataset isn't huge.
        // Actually, prisma.groupBy on FieldReportApparatusPersonnel might not allow deep filtering on relation (report.date).
        // So fetching filtered ID list and reducing is a safe robust pattern for now.

        const counts: Record<string, number> = {};
        personnelRecords.forEach(r => {
            if (r.firefighterId) {
                counts[r.firefighterId] = (counts[r.firefighterId] || 0) + 1;
            }
        });

        return NextResponse.json(counts);
    } catch (error) {
        console.error('Error fetching call counts:', error);
        return NextResponse.json({ error: 'Failed to fetch call counts' }, { status: 500 });
    }
}
