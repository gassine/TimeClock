import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { logAdminAction } from '@/lib/logger';
import { getAuthUser } from '@/lib/auth';

export async function PUT(request: Request, props: { params: Promise<{ id: string }> }) {
    const params = await props.params;
    try {
        const user = await getAuthUser();
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { statusId, isArchived, isVisibleToEveryone, title, description } = body;

        const currentIssue = await prisma.issue.findUnique({ where: { id: params.id } });
        if (!currentIssue) {
            return NextResponse.json({ error: 'Issue not found' }, { status: 404 });
        }

        const hasAdminUpdate = statusId !== undefined || isArchived !== undefined || isVisibleToEveryone !== undefined;
        if (hasAdminUpdate && !user.isAdmin) {
            return NextResponse.json({ error: 'Only an administrator can change issue status, visibility, or archive state' }, { status: 403 });
        }

        const hasContentUpdate = title !== undefined || description !== undefined;
        if (hasContentUpdate && !user.isAdmin && currentIssue.reportedById !== user.id) {
            return NextResponse.json({ error: 'Only the reporter or an administrator can edit this issue' }, { status: 403 });
        }

        if (title !== undefined && !title.trim()) {
            return NextResponse.json({ error: 'Title is required' }, { status: 400 });
        }
        if (description !== undefined && !description.trim()) {
            return NextResponse.json({ error: 'Description is required' }, { status: 400 });
        }

        const issue = await prisma.issue.update({
            where: { id: params.id },
            data: {
                ...(statusId && { statusId }),
                ...(typeof isArchived === 'boolean' && { isArchived }),
                ...(typeof isVisibleToEveryone === 'boolean' && { isVisibleToEveryone }),
                ...(title !== undefined && { title: title.trim() }),
                ...(description !== undefined && { description: description.trim() })
            },
            include: {
                status: true
            }
        });

        if (user.isAdmin) {
            await logAdminAction(
                'UPDATE',
                'Issue',
                issue.id,
                `Updated "${issue.title}": status is ${issue.status.name}, visible to everyone is ${issue.isVisibleToEveryone ? 'yes' : 'no'}, and archived is ${issue.isArchived ? 'yes' : 'no'}.`,
                user.id
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
        const user = await getAuthUser();
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const currentIssue = await prisma.issue.findUnique({ where: { id: params.id } });
        if (!currentIssue) {
            return NextResponse.json({ error: 'Issue not found' }, { status: 404 });
        }
        if (!user.isAdmin && currentIssue.reportedById !== user.id) {
            return NextResponse.json({ error: 'Only the reporter or an administrator can delete this issue' }, { status: 403 });
        }

        const issue = await prisma.issue.delete({
            where: { id: params.id },
            include: { status: true }
        });

        if (user.isAdmin) {
            await logAdminAction(
                'DELETE',
                'Issue',
                issue.id,
                `Deleted issue: ${issue.title}`,
                user.id
            );
        }

        return NextResponse.json(issue);
    } catch (error) {
        console.error('Error deleting issue:', error);
        return NextResponse.json({ error: 'Failed to delete issue' }, { status: 500 });
    }
}
