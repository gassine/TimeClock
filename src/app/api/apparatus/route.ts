import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { logAdminAction } from '@/lib/logger';

export async function GET(request: Request) {
    try {
        const apparatus = await prisma.apparatus.findMany({
            include: {
                station: true
            },
            orderBy: {
                name: 'asc'
            }
        });
        return NextResponse.json(apparatus);
    } catch (error) {
        console.error('Error fetching apparatus:', error);
        return NextResponse.json({ error: 'Failed to fetch apparatus' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { name, stationId, status } = body;

        if (!name || !stationId) {
            return NextResponse.json({ error: 'Name and Station are required' }, { status: 400 });
        }

        const existing = await prisma.apparatus.findUnique({
            where: { name }
        });

        if (existing) {
            return NextResponse.json({ error: 'Apparatus with this name already exists' }, { status: 400 });
        }

        const newApparatus = await prisma.apparatus.create({
            data: {
                name,
                stationId,
                status: status || 'In Service'
            },
            include: {
                station: true
            }
        });

        await logAdminAction(
            'CREATE',
            'Apparatus',
            newApparatus.id,
            `Created new apparatus: ${newApparatus.name} at ${newApparatus.station.name}`
        );

        return NextResponse.json(newApparatus);
    } catch (error: any) {
        console.error('Error creating apparatus:', error);
        return NextResponse.json({ error: error.message || 'Failed to create apparatus' }, { status: 500 });
    }
}
