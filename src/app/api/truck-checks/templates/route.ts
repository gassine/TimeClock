import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const archived = searchParams.get('archived') === 'true';

        const templates = await prisma.truckCheckTemplate.findMany({
            where: { isArchived: archived },
            include: {
                apparatus: true,
                items: {
                    include: { location: true },
                    orderBy: { order: 'asc' }
                }
            },
            orderBy: { createdAt: 'desc' }
        });
        return NextResponse.json(templates);
    } catch (error) {
        console.error('Fetch templates error:', error);
        return NextResponse.json({ error: 'Failed to fetch templates' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const { apparatusId, items } = await request.json();

        if (!apparatusId) {
            return NextResponse.json({ error: 'Apparatus is required' }, { status: 400 });
        }

        // Check if an active template already exists for this apparatus
        const existing = await prisma.truckCheckTemplate.findFirst({
            where: { apparatusId, isArchived: false }
        });

        if (existing) {
            return NextResponse.json({ error: 'A template already exists for this Apparatus.' }, { status: 400 });
        }

        const template = await prisma.truckCheckTemplate.create({
            data: {
                apparatusId,
                items: {
                    create: items.map((item: any, index: number) => ({
                        itemName: item.itemName,
                        itemDescription: item.itemDescription,
                        adminPhotoUrl: item.adminPhotoUrl,
                        locationId: item.locationId || null,
                        order: index
                    }))
                }
            },
            include: {
                apparatus: true,
                items: {
                    include: {
                        location: true
                    }
                }
            }
        });

        return NextResponse.json(template);
    } catch (error) {
        console.error('Create template error:', error);
        return NextResponse.json({ error: 'Failed to create template' }, { status: 500 });
    }
}
