import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { logAdminAction } from '@/lib/logger';

export async function GET() {
    try {
        const shifts = await prisma.shift.findMany({
            orderBy: { name: 'asc' },
        });
        return NextResponse.json(shifts);
    } catch (error) {
        return NextResponse.json({ error: 'Failed to fetch shifts' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { name, description } = body;

        if (!name?.trim()) {
            return NextResponse.json({ error: 'Shift name is required' }, { status: 400 });
        }

        const shift = await prisma.shift.create({
            data: { name: name.trim(), description: description?.trim() || null },
        });

        await logAdminAction('CREATE', 'Shift', shift.id, `Created shift: ${shift.name}`);

        return NextResponse.json(shift, { status: 201 });
    } catch (error: any) {
        if (error.code === 'P2002') {
            return NextResponse.json({ error: 'A shift with this name already exists' }, { status: 409 });
        }
        return NextResponse.json({ error: 'Failed to create shift' }, { status: 500 });
    }
}
