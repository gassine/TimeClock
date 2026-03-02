import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await context.params;
        const { items } = await request.json();

        // Check if there are any reports associated with this template
        const reportCount = await prisma.truckCheckReport.count({
            where: { templateId: id }
        });

        if (reportCount > 0) {
            // This template has historical data (reports). Modifying items directly will
            // CASCADE delete the ancient items within the history of the truck check report.
            // We must VERSION this template.

            // Get the old template so we know the apparatus ID
            const oldTemplate = await prisma.truckCheckTemplate.findUnique({
                where: { id }
            });

            if (!oldTemplate) {
                return NextResponse.json({ error: 'Template not found' }, { status: 404 });
            }

            // 1. Archive the old template so it's locked in history but preserved for past reports
            await prisma.truckCheckTemplate.update({
                where: { id },
                data: { isArchived: true }
            });

            // 2. Create the completely new active template representing the "new version"
            const newTemplate = await prisma.truckCheckTemplate.create({
                data: {
                    apparatusId: oldTemplate.apparatusId,
                    isArchived: false,
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
                        include: { location: true },
                        orderBy: { order: 'asc' }
                    }
                }
            });

            return NextResponse.json(newTemplate);

        } else {
            // NO reports exist. It is 100% safe to do an in-place mutation of items 
            // without destroying historical audit data.
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
        }

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
