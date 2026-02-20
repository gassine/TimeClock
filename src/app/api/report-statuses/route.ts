import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

export async function GET() {
    try {
        const statuses = await prisma.reportStatus.findMany({
            orderBy: { order: 'asc' }
        });
        return NextResponse.json(statuses);
    } catch (error) {
        return NextResponse.json({ error: 'Failed to fetch report statuses' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        // Validation could be added here
        const status = await prisma.reportStatus.create({
            data: body
        });
        return NextResponse.json(status);
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: 'Failed to create report status' }, { status: 500 });
    }
}
