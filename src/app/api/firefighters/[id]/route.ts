import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { logAdminAction } from '@/lib/logger';

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const body = await request.json();
        const { name, roleId, stationId, pin, isActive, password } = body;

        const updateData: any = {
            name,
            roleId,
            stationId: stationId || null,
            pin,
            isActive: isActive !== undefined ? isActive : undefined,
        };

        // If password is provided, hash it
        if (password) {
            const hashedPassword = await bcrypt.hash(password, 10);
            updateData.password = hashedPassword;
        } else if (password === "") {
            // Allow clearing password if explicitly sent as empty string
            updateData.password = null;
        }

        const updatedFirefighter = await prisma.firefighter.update({
            where: { id },
            data: updateData,
            include: { role: true },
        });

        await logAdminAction(
            'UPDATE',
            'Firefighter',
            id,
            `Updated firefighter: ${updatedFirefighter.name}`
        );

        return NextResponse.json(updatedFirefighter);
    } catch (error) {
        return NextResponse.json({ error: 'Failed to update firefighter' }, { status: 500 });
    }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;

        // Transaction: Delete Time Entries first, then the Firefighter
        await prisma.$transaction([
            prisma.timeEntry.deleteMany({ where: { firefighterId: id } }),
            prisma.firefighter.delete({ where: { id } })
        ]);

        await logAdminAction(
            'DELETE',
            'Firefighter',
            id,
            'Deleted firefighter'
        );

        return NextResponse.json({ message: 'Firefighter deleted successfully' });
    } catch (error) {
        return NextResponse.json({ error: 'Failed to delete firefighter' }, { status: 500 });
    }
}
