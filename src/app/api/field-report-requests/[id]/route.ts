import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';

export async function PUT(request: Request, props: { params: Promise<{ id: string }> }) {
    const params = await props.params;

    try {
        const user = await getAuthUser();
        const body = await request.json();
        const { status, adminNotes } = body;

        if (!status || !['APPROVED', 'DENIED'].includes(status)) {
            return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
        }

        const modRequest = await prisma.fieldReportModRequest.findUnique({
            where: { id: params.id },
            include: { report: true } // verify report exists
        });

        if (!modRequest) return NextResponse.json({ error: 'Request not found' }, { status: 404 });

        if (status === 'APPROVED' && modRequest.requestType === 'general_edit' && modRequest.proposedChanges) {
            const changes = JSON.parse(modRequest.proposedChanges);

            // Transaction: Update Request status AND Apply Changes to Report
            const { assignedApparatus, ...scalarChanges } = changes;

            // Clean up scalar changes - remove unupdatable fields if any (like id, createdAt)
            // Or just extract allowed fields.
            // For now, filtering safe fields.
            const {
                incidentTypeId, date, alarmTime, location, district,
                officerInCharge, incidentSummary, statusId, esoReportCompleted
            } = scalarChanges;

            await prisma.$transaction([
                prisma.fieldReportModRequest.update({
                    where: { id: params.id },
                    data: { status: 'APPROVED', adminNotes }
                }),
                prisma.fieldReport.update({
                    where: { id: modRequest.reportId },
                    data: {
                        ...(incidentTypeId && { incidentTypeId }),
                        ...(date && { date: new Date(date) }),
                        ...(alarmTime && { alarmTime }),
                        ...(location && { location }),
                        ...(district && { district }),
                        ...(officerInCharge && { officerInCharge }),
                        ...(incidentSummary && { incidentSummary }),
                        ...(statusId && { statusId }),
                        ...(typeof esoReportCompleted === 'boolean' && { esoReportCompleted }),

                        ...(assignedApparatus && {
                            assignedApparatus: {
                                deleteMany: {},
                                create: assignedApparatus.map((app: any) => ({
                                    apparatusId: app.apparatusId,
                                    personnel: {
                                        create: app.personnel.map((p: any) => ({
                                            firefighterId: p.firefighterId,
                                            firefighterRadioId: p.firefighterRadioId
                                        }))
                                    }
                                }))
                            }
                        })
                    }
                }),
                // Optional: Audit Log
                prisma.fieldReportAuditLog.create({
                    data: {
                        reportId: modRequest.reportId,
                        action: 'MODIFICATION_APPROVED',
                        actorId: user?.id || 'ADMIN',
                        details: `Request ${modRequest.id} approved. Reason: ${modRequest.reason}`
                    }
                })
            ]);
        } else if (status === 'APPROVED' && (!modRequest.proposedChanges || modRequest.requestType !== 'general_edit')) {
            // Handle Reopen Requests (or other requests handled by just changing status to an editable one)
            const draftStatus = await prisma.reportStatus.findFirst({
                where: { isEditable: true },
                orderBy: { order: 'asc' } // Try to get the first open status
            });

            if (!draftStatus) {
                return NextResponse.json({ error: 'Editable status not found in database.' }, { status: 500 });
            }

            await prisma.$transaction([
                prisma.fieldReportModRequest.update({
                    where: { id: params.id },
                    data: { status: 'APPROVED', adminNotes }
                }),
                prisma.fieldReport.update({
                    where: { id: modRequest.reportId },
                    data: { statusId: draftStatus.id }
                }),
                prisma.fieldReportAuditLog.create({
                    data: {
                        reportId: modRequest.reportId,
                        action: 'REOPEN_APPROVED',
                        actorId: user?.id || 'ADMIN',
                        details: `Reopen request ${modRequest.id} approved. Reverted to draft.`
                    }
                })
            ]);
        } else {
            // Just update status (Denied or other types not fully implemented yet)
            await prisma.fieldReportModRequest.update({
                where: { id: params.id },
                data: { status, adminNotes }
            });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error updating request:', error);
        return NextResponse.json({ error: 'Failed' }, { status: 500 });
    }
}
