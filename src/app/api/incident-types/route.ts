import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

export async function GET() {
    try {
        const types = await prisma.incidentType.findMany({
            orderBy: { name: 'asc' }
        });
        return NextResponse.json(types);
    } catch (error) {
        return NextResponse.json({ error: 'Failed to fetch incident types' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const { name } = await request.json();
        const type = await prisma.incidentType.create({
            data: { name }
        });
        return NextResponse.json(type);
    } catch (error) {
        return NextResponse.json({ error: 'Failed to create incident type' }, { status: 500 });
    }
}
