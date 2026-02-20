import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

export async function PUT(request: Request, props: { params: Promise<{ id: string }> }) {
    const params = await props.params;
    try {
        const body = await request.json();
        const status = await prisma.reportStatus.update({
            where: { id: params.id },
            data: body
        });
        return NextResponse.json(status);
    } catch (error) {
        return NextResponse.json({ error: 'Failed to update report status' }, { status: 500 });
    }
}

export async function DELETE(request: Request, props: { params: Promise<{ id: string }> }) {
    const params = await props.params;
    try {
        await prisma.reportStatus.delete({
            where: { id: params.id }
        });
        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: 'Failed to delete report status' }, { status: 500 });
    }
}
