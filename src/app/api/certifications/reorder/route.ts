import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function PATCH(req: Request) {
    try {
        const items: { id: string; order: number }[] = await req.json();
        await Promise.all(
            items.map(({ id, order }) =>
                prisma.certification.update({ where: { id }, data: { order } })
            )
        );
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Failed to reorder certifications:', error);
        return NextResponse.json({ error: 'Failed to reorder' }, { status: 500 });
    }
}
