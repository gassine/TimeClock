import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(req: Request) {
    try {
        const { firefighterId, certificationId, certDate, expiryDate } = await req.json();
        if (!firefighterId || !certificationId) {
            return NextResponse.json({ error: 'firefighterId and certificationId are required' }, { status: 400 });
        }
        const mc = await prisma.memberCertification.upsert({
            where: { firefighterId_certificationId: { firefighterId, certificationId } },
            create: {
                firefighterId,
                certificationId,
                certDate: certDate ? new Date(certDate + 'T12:00:00.000Z') : null,
                expiryDate: expiryDate ? new Date(expiryDate + 'T12:00:00.000Z') : null,
            },
            update: {
                certDate: certDate ? new Date(certDate + 'T12:00:00.000Z') : null,
                expiryDate: expiryDate ? new Date(expiryDate + 'T12:00:00.000Z') : null,
            },
        });
        return NextResponse.json(mc);
    } catch (error) {
        console.error('Failed to create member certification:', error);
        return NextResponse.json({ error: 'Failed to grant certification' }, { status: 500 });
    }
}
