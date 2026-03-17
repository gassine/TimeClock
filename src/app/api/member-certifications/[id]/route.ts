import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const { certDate, expiryDate } = await req.json();
        const mc = await prisma.memberCertification.update({
            where: { id },
            data: {
                certDate: certDate ? new Date(certDate + 'T12:00:00.000Z') : null,
                expiryDate: expiryDate ? new Date(expiryDate + 'T12:00:00.000Z') : null,
            },
        });
        return NextResponse.json(mc);
    } catch (error) {
        console.error('Failed to update member certification:', error);
        return NextResponse.json({ error: 'Failed to update certification' }, { status: 500 });
    }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        await prisma.memberCertification.delete({ where: { id } });
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Failed to delete member certification:', error);
        return NextResponse.json({ error: 'Failed to revoke certification' }, { status: 500 });
    }
}
