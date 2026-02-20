import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { logAdminAction } from '@/lib/logger';

export async function PUT(request: Request, props: { params: Promise<{ id: string }> }) {
    const params = await props.params;
    try {
        const body = await request.json();
        const { name, color, order } = body;
        const adminId = request.headers.get('x-user-id');

        const status = await prisma.issueStatus.update({
            where: { id: params.id },
            data: {
                name,
                color,
                order
            }
        });

        if (adminId) {
            await logAdminAction(
                'UPDATE',
                'IssueStatus',
                status.id,
                `Updated issue status: ${status.name}`,
                adminId
            );
        }

        return NextResponse.json(status);
    } catch (error) {
        console.error('Error updating issue status:', error);
        return NextResponse.json({ error: 'Failed to update issue status' }, { status: 500 });
    }
}

export async function DELETE(request: Request, props: { params: Promise<{ id: string }> }) {
    const params = await props.params;
    try {
        const adminId = request.headers.get('x-user-id');

        // Check if status is used
        const usedCount = await prisma.issue.count({
            where: { statusId: params.id }
        });

        if (usedCount > 0) {
            return NextResponse.json({ error: 'Cannot delete status that is in use' }, { status: 400 });
        }

        const status = await prisma.issueStatus.delete({
            where: { id: params.id }
        });

        if (adminId) {
            await logAdminAction(
                'DELETE',
                'IssueStatus',
                status.id,
                `Deleted issue status: ${status.name}`,
                adminId
            );
        }

        return NextResponse.json(status);
    } catch (error) {
        console.error('Error deleting issue status:', error);
        return NextResponse.json({ error: 'Failed to delete issue status' }, { status: 500 });
    }
}
