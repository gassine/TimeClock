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
        const { name, order, isEditable } = body;

        if (!name || order === undefined || isEditable === undefined) {
            return NextResponse.json(
                { error: 'Name, order, and isEditable are required' },
                { status: 400 }
            );
        }

        const status = await prisma.reportStatus.create({
            data: {
                name,
                order: Number(order),
                isEditable: Boolean(isEditable)
            }
        });
        return NextResponse.json(status);
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: 'Failed to create report status' }, { status: 500 });
    }
}
