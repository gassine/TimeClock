import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
    try {
        const certifications = await prisma.certification.findMany({
            include: {
                memberCertifications: true,
            },
            orderBy: { order: 'asc' },
        });
        return NextResponse.json(certifications);
    } catch (error) {
        console.error('Failed to fetch certifications:', error);
        return NextResponse.json({ error: 'Failed to fetch certifications' }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const { name } = await req.json();
        if (!name?.trim()) {
            return NextResponse.json({ error: 'Name is required' }, { status: 400 });
        }
        const maxOrder = await prisma.certification.aggregate({ _max: { order: true } });
        const cert = await prisma.certification.create({
            data: { name: name.trim(), order: (maxOrder._max.order ?? 0) + 1 },
            include: { memberCertifications: true },
        });
        return NextResponse.json(cert);
    } catch (error) {
        console.error('Failed to create certification:', error);
        return NextResponse.json({ error: 'Failed to create certification' }, { status: 500 });
    }
}
