import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const apparatusId = searchParams.get('apparatusId');

        let locations;
        if (apparatusId) {
            locations = await prisma.apparatusLocation.findMany({
                where: { apparatusId },
                orderBy: { name: 'asc' }
            });
        } else {
            locations = await prisma.apparatusLocation.findMany({
                orderBy: { name: 'asc' },
                include: { apparatus: true }
            });
        }

        return NextResponse.json(locations);
    } catch (error) {
        console.error('Error fetching apparatus locations:', error);
        return NextResponse.json({ error: 'Failed to fetch locations' }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { apparatusId, name } = body;

        if (!apparatusId || !name) {
            return NextResponse.json({ error: 'Apparatus ID and Name are required' }, { status: 400 });
        }

        const location = await prisma.apparatusLocation.create({
            data: {
                apparatusId,
                name
            }
        });

        return NextResponse.json(location);
    } catch (error) {
        console.error('Error creating apparatus location:', error);
        return NextResponse.json({ error: 'Failed to create location' }, { status: 500 });
    }
}
