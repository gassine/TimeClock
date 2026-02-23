import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await context.params;
        const { items } = await request.json();

        // Transaction to delete old items and recreate new ones for simple full-sync
        await prisma.$transaction(async (tx) => {
            await tx.truckCheckItemTemplate.deleteMany({
                where: { templateId: id }
            });

            if (items && items.length > 0) {
                await tx.truckCheckItemTemplate.createMany({
                    data: items.map((item: any, index: number) => ({
                        templateId: id,
                        itemName: item.itemName,
                        itemDescription: item.itemDescription,
                        adminPhotoUrl: item.adminPhotoUrl,
                        locationId: item.locationId || null,
                        order: index
                    }))
                });
            }
        });

        // Fetch the updated template
        const updated = await prisma.truckCheckTemplate.findUnique({
            where: { id },
            include: {
                apparatus: true,
                items: {
                    include: { location: true },
                    orderBy: { order: 'asc' }
                }
            }
        });

        return NextResponse.json(updated);
    } catch (error) {
        console.error('Update template error:', error);
        return NextResponse.json({ error: 'Failed to update template' }, { status: 500 });
    }
}

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await context.params;

        await prisma.truckCheckTemplate.update({
            where: { id },
            data: { isArchived: true }
        });

        return NextResponse.json({ success: true, message: 'Template archived successfully' });
    } catch (error) {
        console.error('Delete template error:', error);
        return NextResponse.json({ error: 'Failed to delete template' }, { status: 500 });
    }
}
