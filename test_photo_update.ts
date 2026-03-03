import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    // 1. Find a template that has an item but no photo
    const templates = await prisma.truckCheckTemplate.findMany({
        include: { items: true },
        where: { items: { some: {} } },
        take: 1
    });

    if (templates.length === 0) {
        console.log("No templates found with items.");
        return;
    }

    const template = templates[0];
    const itemId = template.items[0].id;
    console.log(`Testing with Template ID: ${template.id}`);
    console.log(`Updating Item ID: ${itemId}`);

    // Simulate the PUT payload
    const payloadItems = template.items.map(i => {
        if (i.id === itemId) {
            return {
                ...i,
                adminPhotoUrl: '/uploads/test-photo.jpg' // Simulated real upload URL
            };
        }
        return i;
    });

    console.log("Payload items:");
    console.log(payloadItems.map(i => ({ name: i.itemName, photo: i.adminPhotoUrl })));

    // Do what the PUT API does for a template with no reports:
    const txRes = await prisma.$transaction(async (tx) => {
        await tx.truckCheckItemTemplate.deleteMany({
            where: { templateId: template.id }
        });

        if (payloadItems && payloadItems.length > 0) {
            await tx.truckCheckItemTemplate.createMany({
                data: payloadItems.map((item: any, index: number) => ({
                    templateId: template.id,
                    itemName: item.itemName,
                    itemDescription: item.itemDescription,
                    adminPhotoUrl: item.adminPhotoUrl, // Important
                    locationId: item.locationId || null,
                    order: index
                }))
            });
        }
    });

    const updated = await prisma.truckCheckTemplate.findUnique({
        where: { id: template.id },
        include: { items: true }
    });

    console.log("\nUpdated items:");
    console.log(updated?.items.map(i => ({ name: i.itemName, photo: i.adminPhotoUrl })));
}

main()
    .catch(e => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
