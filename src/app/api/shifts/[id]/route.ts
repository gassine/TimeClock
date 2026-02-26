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
        const { name, description } = body;

        if (!name?.trim()) {
            return NextResponse.json({ error: 'Shift name is required' }, { status: 400 });
        }

        const shift = await prisma.shift.update({
            where: { id },
            data: { name: name.trim(), description: description?.trim() || null },
        });

        await logAdminAction('UPDATE', 'Shift', id, `Updated shift: ${shift.name}`);

        return NextResponse.json(shift);
    } catch (error: any) {
        if (error.code === 'P2002') {
            return NextResponse.json({ error: 'A shift with this name already exists' }, { status: 409 });
        }
        return NextResponse.json({ error: 'Failed to update shift' }, { status: 500 });
    }
}

export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;

        await prisma.shift.delete({ where: { id } });

        await logAdminAction('DELETE', 'Shift', id, 'Deleted shift');

        return NextResponse.json({ message: 'Shift deleted successfully' });
    } catch (error) {
        return NextResponse.json({ error: 'Failed to delete shift' }, { status: 500 });
    }
}
