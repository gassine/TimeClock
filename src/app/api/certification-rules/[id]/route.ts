import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const { daysBeforeExpiry, color, label } = await req.json();
        const rule = await prisma.certificationReminderRule.update({
            where: { id },
            data: {
                daysBeforeExpiry: daysBeforeExpiry !== undefined ? parseInt(daysBeforeExpiry) : undefined,
                color: color || undefined,
                label: label !== undefined ? (label || null) : undefined,
            },
        });
        return NextResponse.json(rule);
    } catch (error) {
        console.error('Failed to update certification rule:', error);
        return NextResponse.json({ error: 'Failed to update rule' }, { status: 500 });
    }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        await prisma.certificationReminderRule.delete({ where: { id } });
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Failed to delete certification rule:', error);
        return NextResponse.json({ error: 'Failed to delete rule' }, { status: 500 });
    }
}
