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
        const { name, address } = body;

        const station = await prisma.station.update({
            where: { id },
            data: { name, address },
        });

        await logAdminAction(
            'UPDATE',
            'Station',
            id,
            `Updated station: ${station.name}`
        );

        return NextResponse.json(station);
    } catch (error: any) {
        if (error.code === 'P2002') {
            return NextResponse.json({ error: 'A station with this name already exists' }, { status: 409 });
        }
        return NextResponse.json({ error: 'Failed to update station' }, { status: 500 });
    }
}

export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;

        // Schema is set to SetNull on delete, so we can just delete.
        await prisma.station.delete({
            where: { id },
        });

        await logAdminAction(
            'DELETE',
            'Station',
            id,
            'Deleted station'
        );

        return NextResponse.json({ message: 'Station deleted successfully' });
    } catch (error) {
        return NextResponse.json({ error: 'Failed to delete station' }, { status: 500 });
    }
}
