import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { logAdminAction } from '@/lib/logger';

export async function PUT(request: Request, props: { params: Promise<{ id: string }> }) {
    const params = await props.params;
    try {
        const body = await request.json();
        const { statusId, isArchived, title, description, reportedById } = body;
        const adminId = request.headers.get('x-user-id');

        // Check if editing as reporter
        if (reportedById) {
            const currentIssue = await prisma.issue.findUnique({ where: { id: params.id } });
            if (!currentIssue || currentIssue.reportedById !== reportedById) {
                return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
            }
        }

        const issue = await prisma.issue.update({
            where: { id: params.id },
            data: {
                ...(statusId && { statusId }),
                ...(typeof isArchived === 'boolean' && { isArchived }),
                ...(title && { title }),
                ...(description && { description })
            },
            include: {
                status: true
            }
        });

        if (adminId) {
            await logAdminAction(
                'UPDATE',
                'Issue',
                issue.id,
                `Updated issue status to ${issue.status.name} (Archived: ${issue.isArchived})`,
                adminId
            );
        }

        return NextResponse.json(issue);
    } catch (error) {
        console.error('Error updating issue:', error);
        return NextResponse.json({ error: 'Failed to update issue' }, { status: 500 });
    }
}

export async function DELETE(request: Request, props: { params: Promise<{ id: string }> }) {
    const params = await props.params;
    try {
        const { searchParams } = new URL(request.url);
        const adminId = request.headers.get('x-user-id');
        const reportedById = searchParams.get('reportedById');

        // Check if deleting as reporter
        if (reportedById) {
            const currentIssue = await prisma.issue.findUnique({ where: { id: params.id } });
            if (!currentIssue || currentIssue.reportedById !== reportedById) {
                return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
            }
        }

        const issue = await prisma.issue.delete({
            where: { id: params.id },
            include: { status: true }
        });

        if (adminId) {
            await logAdminAction(
                'DELETE',
                'Issue',
                issue.id,
                `Deleted issue: ${issue.title}`,
                adminId
            );
        }

        return NextResponse.json(issue);
    } catch (error) {
        console.error('Error deleting issue:', error);
        return NextResponse.json({ error: 'Failed to delete issue' }, { status: 500 });
    }
}
