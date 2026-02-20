import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { logAdminAction } from '@/lib/logger';

export async function PUT(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const body = await request.json();
        const { name, stationId, status } = body;

        const apparatus = await prisma.apparatus.update({
            where: { id },
            data: {
                name,
                stationId,
                status
            },
            include: {
                station: true
            }
        });

        await logAdminAction(
            'UPDATE',
            'Apparatus',
            id,
            `Updated apparatus details for ${apparatus.name}`
        );

        return NextResponse.json(apparatus);
    } catch (error) {
        console.error('Error updating apparatus:', error);
        return NextResponse.json({ error: 'Failed to update apparatus' }, { status: 500 });
    }
}

export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;

        const apparatus = await prisma.apparatus.findUnique({ where: { id } });

        await prisma.apparatus.delete({
            where: { id }
        });

        await logAdminAction(
            'DELETE',
            'Apparatus',
            id,
            `Deleted apparatus: ${apparatus?.name || 'Unknown'}`
        );

        return NextResponse.json({ message: 'Apparatus deleted successfully' });
    } catch (error) {
        console.error('Error deleting apparatus:', error);
        return NextResponse.json({ error: 'Failed to delete apparatus' }, { status: 500 });
    }
}
