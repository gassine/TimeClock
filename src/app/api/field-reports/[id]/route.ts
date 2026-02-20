import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

export async function GET(request: Request, props: { params: Promise<{ id: string }> }) {
    const params = await props.params;
    try {
        const report = await prisma.fieldReport.findUnique({
            where: { id: params.id },
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
                },
                modificationRequests: {
                    include: { requestedByUser: { select: { name: true } } },
                    orderBy: { createdAt: 'desc' }
                },
                comments: {
                    include: { author: { select: { name: true } } },
                    orderBy: { createdAt: 'asc' }
                },
                auditLogs: {
                    orderBy: { createdAt: 'desc' }
                }

            }
        });

        if (!report) return NextResponse.json({ error: 'Report not found' }, { status: 404 });
        return NextResponse.json(report);
    } catch (error) {
        return NextResponse.json({ error: 'Failed to fetch report' }, { status: 500 });
    }
}

export async function PUT(request: Request, props: { params: Promise<{ id: string }> }) {
    const params = await props.params;
    try {
        const body = await request.json();
        const { statusId, incidentTypeId, location, district, incidentSummary, officerInCharge, alarmTime, date, esoReportCompleted } = body;

        // Note: Complex relations (apparatus/personnel) updates are tricky in a simple PUT
        // Usually safer to handle them via dedicated endpoints or strictly structured payload.
        // For now, updating core scalar fields.

        const report = await prisma.fieldReport.update({
            where: { id: params.id },
            data: {
                ...(statusId && { statusId }),
                ...(incidentTypeId && { incidentTypeId }),
                ...(location && { location }),
                ...(district && { district }),
                ...(incidentSummary && { incidentSummary }),
                ...(officerInCharge && { officerInCharge }),
                ...(alarmTime && { alarmTime }),
                ...(date && { date: new Date(date) }),
                ...(typeof esoReportCompleted === 'boolean' && { esoReportCompleted }),
                ...(body.assignedApparatus && {
                    assignedApparatus: {
                        deleteMany: {},
                        create: body.assignedApparatus.map((app: any) => ({
                            apparatusId: app.apparatusId,
                            personnel: {
                                create: app.personnel.map((p: any) => ({
                                    firefighterId: p.firefighterId,
                                    firefighterRadioId: p.firefighterRadioId
                                }))
                            }
                        }))
                    }
                }),
                auditLogs: {
                    create: {
                        action: statusId ? 'STATUS_CHANGED' : 'REPORT_UPDATED',
                        actorId: body.updatedByUserId || 'UNKNOWN',
                        details: statusId ? 'Status changed' : 'Report content updated'
                    }
                }
            }
        });

        // Refetch full object with relations to return to frontend
        const updatedReport = await prisma.fieldReport.findUnique({
            where: { id: params.id },
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
                },
                modificationRequests: {
                    include: { requestedByUser: { select: { name: true } } },
                    orderBy: { createdAt: 'desc' }
                },
                comments: {
                    include: { author: { select: { name: true } } },
                    orderBy: { createdAt: 'asc' }
                },
                auditLogs: {
                    orderBy: { createdAt: 'desc' }
                }
            }
        });

        return NextResponse.json(updatedReport);
    } catch (error) {
        console.error('Error updating report:', error);
        return NextResponse.json({ error: 'Failed to update report' }, { status: 500 });
    }
}

export async function DELETE(request: Request, props: { params: Promise<{ id: string }> }) {
    const params = await props.params;
    try {
        // Add auth check here (Admin or Owner if Draft)
        await prisma.fieldReport.delete({
            where: { id: params.id }
        });
        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: 'Failed to delete report' }, { status: 500 });
    }
}
