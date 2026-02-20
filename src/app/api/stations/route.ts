import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

export async function GET() {
    try {
        const stations = await prisma.station.findMany({
            orderBy: { name: 'asc' },
        });
        return NextResponse.json(stations);
    } catch (error) {
        return NextResponse.json({ error: 'Failed to fetch stations' }, { status: 500 });
    }
}

import { logAdminAction } from '@/lib/logger';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { name, address } = body;

        const station = await prisma.station.create({
            data: {
                name,
                address,
            },
        });

        await logAdminAction(
            'CREATE',
            'Station',
            station.id,
            `Created station: ${station.name}`
        );

        return NextResponse.json(station, { status: 201 });
    } catch (error) {
        return NextResponse.json({ error: 'Failed to create station' }, { status: 500 });
    }
}
