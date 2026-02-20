import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

export async function PUT(request: Request, props: { params: Promise<{ id: string }> }) {
    const params = await props.params;
    try {
        const { name } = await request.json();
        const type = await prisma.incidentType.update({
            where: { id: params.id },
            data: { name }
        });
        return NextResponse.json(type);
    } catch (error) {
        return NextResponse.json({ error: 'Failed to update incident type' }, { status: 500 });
    }
}

export async function DELETE(request: Request, props: { params: Promise<{ id: string }> }) {
    const params = await props.params;
    try {
        await prisma.incidentType.delete({
            where: { id: params.id }
        });
        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: 'Failed to delete incident type' }, { status: 500 });
    }
}
