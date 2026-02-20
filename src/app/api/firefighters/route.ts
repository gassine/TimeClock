import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

export async function GET() {
    try {
        const firefighters = await prisma.firefighter.findMany({
            include: { role: true },
            orderBy: { name: 'asc' },
        });
        return NextResponse.json(firefighters);
    } catch (error) {
        return NextResponse.json({ error: 'Failed to fetch firefighters' }, { status: 500 });
    }
}

import { logAdminAction } from '@/lib/logger';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { name, roleId, stationId, pin } = body;

        if (!pin) {
            return NextResponse.json({ error: 'PIN (Radio ID) is required' }, { status: 400 });
        }

        if (!roleId) {
            return NextResponse.json({ error: 'Role is required' }, { status: 400 });
        }

        const firefighter = await prisma.firefighter.create({
            data: {
                name,
                roleId,
                stationId: stationId || null,
                pin,
                isActive: true,
            },
            include: { role: true },
        });

        await logAdminAction(
            'CREATE',
            'Firefighter',
            firefighter.id,
            `Created firefighter: ${firefighter.name} (Role: ${firefighter.role.name})`
        );

        return NextResponse.json(firefighter, { status: 201 });
    } catch (error: any) {
        if (error.code === 'P2002') {
            return NextResponse.json({ error: 'A firefighter with this Radio ID (PIN) already exists' }, { status: 409 });
        }
        return NextResponse.json({ error: 'Failed to create firefighter' }, { status: 500 });
    }
}
