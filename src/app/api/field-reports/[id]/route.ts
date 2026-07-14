import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

type AuditLogWithActorName = {
    actorId: string;
    actorName?: string | null;
};

async function withAuditActorNames<T extends { auditLogs?: AuditLogWithActorName[] }>(report: T) {
    const auditLogs = report.auditLogs || [];
    const actorIds = Array.from(new Set(
        auditLogs
            .map(log => log.actorId)
            .filter((actorId): actorId is string => Boolean(actorId) && !['ADMIN', 'SYSTEM', 'UNKNOWN'].includes(actorId))
    ));

    const actors = actorIds.length > 0
        ? await prisma.firefighter.findMany({
            where: { id: { in: actorIds as string[] } },
            select: { id: true, name: true }
        })
        : [];

    const actorNames = new Map(actors.map(actor => [actor.id, actor.name]));

    return {
        ...report,
        auditLogs: auditLogs.map(log => ({
            ...log,
            actorName: actorNames.get(log.actorId) || (
                log.actorId === 'ADMIN' ? 'Administrator' :
                    log.actorId === 'SYSTEM' ? 'System' :
                        log.actorId === 'UNKNOWN' ? 'Unknown user' :
                            null
            )
        }))
    };
}

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
        return NextResponse.json(await withAuditActorNames(report));
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
                ...(date && { date: new Date(date + 'T12:00:00.000Z') }),
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

        return NextResponse.json(updatedReport ? await withAuditActorNames(updatedReport) : null);
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
