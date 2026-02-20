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
        const { name, isAdmin } = body;

        const role = await prisma.role.update({
            where: { id },
            data: { name, isAdmin },
        });

        await logAdminAction(
            'UPDATE',
            'Role',
            id,
            `Updated role: ${role.name}`
        );

        return NextResponse.json(role);
    } catch (error: any) {
        if (error.code === 'P2002') {
            return NextResponse.json({ error: 'A role with this name already exists' }, { status: 409 });
        }
        return NextResponse.json({ error: 'Failed to update role' }, { status: 500 });
    }
}

export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;

        // Check if role is in use
        const userCount = await prisma.firefighter.count({
            where: { roleId: id },
        });

        if (userCount > 0) {
            return NextResponse.json(
                { error: `Cannot delete role: It is assigned to ${userCount} firefighter(s). Reassign them first.` },
                { status: 400 }
            );
        }

        await prisma.role.delete({
            where: { id },
        });

        await logAdminAction(
            'DELETE',
            'Role',
            id,
            'Deleted role'
        );

        return NextResponse.json({ message: 'Role deleted successfully' });
    } catch (error) {
        return NextResponse.json({ error: 'Failed to delete role' }, { status: 500 });
    }
}
