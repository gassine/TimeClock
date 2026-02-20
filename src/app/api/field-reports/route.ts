import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const userId = searchParams.get('userId');
        const statusId = searchParams.get('statusId');
        const limit = parseInt(searchParams.get('limit') || '10');
        const offset = parseInt(searchParams.get('offset') || '0');

        const viewerId = searchParams.get('viewerId');

        const where: any = {};
        if (userId) where.createdByUserId = userId;
        if (statusId) where.statusId = statusId;

        // Filtering by Draft Status
        const isDraft = searchParams.get('isDraft'); // 'true' or 'false'

        if (isDraft === 'true') {
            // Drafts: Only show my own
            where.status = { isDraftLike: true };
            if (viewerId) where.createdByUserId = viewerId;
        } else if (isDraft === 'false') {
            // Recent (Submitted): Show all non-drafts
            where.status = { isDraftLike: false };
        } else if (viewerId) {
            // Fallback: Mixed view
            where.OR = [
                { status: { isDraftLike: false } },
                { createdByUserId: viewerId }
            ];
        }

        // Date Range Filtering
        const start = searchParams.get('start');
        const end = searchParams.get('end');
        if (start || end) {
            where.date = {};
            if (start) where.date.gte = new Date(start);
            if (end) where.date.lte = new Date(end);
        }

        // Access Control Logic to be refined: 
        // Admin sees all. Users see their own drafts, but all submitted reports?
        // For now, fetching based on simple filters. Secure access control layer needed.

        const reports = await prisma.fieldReport.findMany({
            where,
            include: {
                incidentType: true,
                status: true,
                createdByUser: { select: { name: true } },
                assignedApparatus: {
                    include: {
                        apparatus: true,
                        personnel: {
                            include: { firefighter: true }
                        }
                    }
                }
            },
            orderBy: { date: 'desc' },
            take: limit,
            skip: offset
        });

        const total = await prisma.fieldReport.count({ where });

        return NextResponse.json({ reports, total });
    } catch (error) {
        console.error('Error fetching reports:', error);
        return NextResponse.json({ error: 'Failed to fetch reports' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json();

        // Basic Validation
        if (!body.incidentTypeId || !body.date || !body.location || !body.district || !body.assignedApparatus) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        // Fetch Default Draft Status if not provided (though FE should usually provide or we default server-side)
        let statusId = body.statusId;
        let draftStatus; // Declare draftStatus here
        if (!statusId) {
            draftStatus = await prisma.reportStatus.findFirst({ where: { name: 'Draft' } }); // Fallback
            statusId = draftStatus?.id;
        }

        // If draftStatus was not fetched because statusId was provided, and we need draftStatus for the log, fetch it.
        // Or, if statusId was provided, we can use that statusId for the log details.
        // For simplicity, let's assume if statusId is not 'Draft', the log will still say 'Initial Draft Created'
        // or we can make the log more dynamic. Sticking to the provided instruction for now.
        if (!draftStatus) {
            draftStatus = await prisma.reportStatus.findFirst({ where: { name: 'Draft' } });
        }
        if (!draftStatus) {
            return NextResponse.json({ error: 'Draft status not found in database' }, { status: 500 });
        }


        const reportWithLog = await prisma.fieldReport.create({
            data: {
                incidentTypeId: body.incidentTypeId,
                date: new Date(body.date),
                alarmTime: body.alarmTime,
                location: body.location,
                district: body.district,
                officerInCharge: body.officerInCharge,
                incidentSummary: body.incidentSummary,
                statusId: statusId, // Use the resolved statusId
                createdByUserId: body.createdByUserId,
                createdByRadioId: body.createdByRadioId || 'N/A',
                esoReportCompleted: body.esoReportCompleted || false,
                assignedApparatus: {
                    create: body.assignedApparatus?.map((app: any) => ({
                        apparatusId: app.apparatusId,
                        personnel: {
                            create: app.personnel.map((p: any) => ({
                                firefighterId: p.firefighterId,
                                firefighterRadioId: p.firefighterRadioId
                            }))
                        }
                    }))
                },
                auditLogs: {
                    create: {
                        action: 'REPORT_CREATED',
                        actorId: body.createdByUserId,
                        details: 'Initial Draft Created'
                    }
                }
            },
            include: {
                incidentType: true,
                status: true
            }
        });

        return NextResponse.json(reportWithLog);
    } catch (error) {
        console.error('Error creating report:', error);
        return NextResponse.json({ error: 'Failed to create report' }, { status: 500 });
    }
}
