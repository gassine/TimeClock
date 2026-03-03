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

        // Fetch Status to determine if we are saving a Draft
        let statusId = body.statusId;
        let targetStatus;
        if (statusId) {
            targetStatus = await prisma.reportStatus.findUnique({ where: { id: statusId } });
        } else {
            targetStatus = await prisma.reportStatus.findFirst({ where: { name: 'Draft' } });
            statusId = targetStatus?.id;
        }

        if (!targetStatus) {
            return NextResponse.json({ error: 'Status not found in database' }, { status: 500 });
        }

        // Only enforce strict validation if we are NOT saving as a draft
        if (!targetStatus.isDraftLike) {
            const missingFields: string[] = [];
            if (!body.incidentTypeId) missingFields.push('Incident Type');
            if (!body.date) missingFields.push('Date');
            if (!body.location) missingFields.push('Location');
            if (!body.district) missingFields.push('District');
            if (!body.assignedApparatus || body.assignedApparatus.length === 0) missingFields.push('Assigned Apparatus');

            if (missingFields.length > 0) {
                return NextResponse.json({
                    error: `Missing required fields: ${missingFields.join(', ')}`
                }, { status: 400 });
            }
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
