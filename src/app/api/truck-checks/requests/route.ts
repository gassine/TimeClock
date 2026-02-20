import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const status = searchParams.get('status') || 'PENDING';

        const requests = await prisma.truckCheckRequest.findMany({
            where: { status },
            include: {
                requestedByUser: true,
                report: {
                    include: { apparatus: true }
                }
            },
            orderBy: { createdAt: 'desc' },
            take: 100 // Hard limit for safety
        });

        return NextResponse.json(requests);
    } catch (error) {
        console.error('Fetch reopen requests error:', error);
        return NextResponse.json({ error: 'Failed to fetch reopen requests' }, { status: 500 });
    }
}
