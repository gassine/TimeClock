import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const { name } = await req.json();
        if (!name?.trim()) {
            return NextResponse.json({ error: 'Name is required' }, { status: 400 });
        }
        const cert = await prisma.certification.update({
            where: { id },
            data: { name: name.trim() },
            include: { memberCertifications: true },
        });
        return NextResponse.json(cert);
    } catch (error) {
        console.error('Failed to update certification:', error);
        return NextResponse.json({ error: 'Failed to update certification' }, { status: 500 });
    }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        await prisma.certification.delete({ where: { id } });
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Failed to delete certification:', error);
        return NextResponse.json({ error: 'Failed to delete certification' }, { status: 500 });
    }
}
