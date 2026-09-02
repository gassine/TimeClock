import { prisma } from '@/lib/prisma';
import { formatPhoneNumber, isValidPhoneNumber } from '@/lib/utils';
import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { logAdminAction } from '@/lib/logger';
import { getAuthUser } from '@/lib/auth';

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const user = await getAuthUser();
        if (!user?.isAdmin) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { id } = await params;
        const body = await request.json();
        const { name, roleId, stationId, shiftId, pin, isActive, password, phoneNumber, startDate, isHiddenFromDirectory, isAdmin } = body;

        if (phoneNumber !== undefined && !isValidPhoneNumber(phoneNumber)) {
            return NextResponse.json({ error: 'Invalid phone number format. Must be 10 or 11 digits.' }, { status: 400 });
        }

        const updateData: Record<string, unknown> = {};
        if (name !== undefined) updateData.name = name;
        if (roleId !== undefined) updateData.roleId = roleId;
        if (stationId !== undefined) updateData.stationId = stationId || null;
        if (shiftId !== undefined) updateData.shiftId = shiftId || null;
        if (pin !== undefined) updateData.pin = pin;
        if (isActive !== undefined) updateData.isActive = isActive;
        if (isAdmin !== undefined) updateData.isAdmin = isAdmin;
        if (phoneNumber !== undefined) updateData.phoneNumber = formatPhoneNumber(phoneNumber);
        if (startDate !== undefined) updateData.startDate = startDate ? new Date(startDate) : null;
        if (isHiddenFromDirectory !== undefined) updateData.isHiddenFromDirectory = isHiddenFromDirectory;

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
            omit: { password: true },
            include: { role: true, station: true, shift: true },
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
        const user = await getAuthUser();
        if (!user?.isAdmin) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

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
