import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function PUT(
    request: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await context.params;
        const { name } = await request.json();
        if (!name?.trim()) return NextResponse.json({ error: 'Name required' }, { status: 400 });
        const updated = await prisma.apparatusLocation.update({ where: { id }, data: { name: name.trim() } });
        return NextResponse.json(updated);
    } catch (error) {
        console.error('Error updating location:', error);
        return NextResponse.json({ error: 'Failed to update location' }, { status: 500 });
    }
}

export async function DELETE(
    request: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await context.params;

        await prisma.apparatusLocation.delete({
            where: { id }
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error deleting location:', error);
        return NextResponse.json({ error: 'Failed to delete location' }, { status: 500 });
    }
}
