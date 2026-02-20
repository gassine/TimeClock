import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('Seeding Field Report Types and Statuses...');

    // 1. Incident Types
    const incidentTypes = [
        'Structure Fire',
        'Medical Emergency',
        'Motor Vehicle Accident',
        'Fire Alarm',
        'Training',
        'Service Call',
        'HazMat',
        'Other'
    ];

    for (const name of incidentTypes) {
        const existing = await prisma.incidentType.findUnique({ where: { name } });
        if (!existing) {
            await prisma.incidentType.create({ data: { name } });
            console.log(`Created Incident Type: ${name}`);
        }
    }

    // 2. Report Statuses
    const statuses = [
        {
            name: 'Draft',
            isDraftLike: true,
            userCanEditOwn: true,
            isFinal: false,
            order: 10
        },
        {
            name: 'Submitted',
            isDraftLike: false,
            userCanEditOwn: false,
            isFinal: false,
            order: 20
        },
        {
            name: 'Under Review',
            isDraftLike: false,
            userCanEditOwn: false,
            isFinal: false,
            order: 30
        },
        {
            name: 'Approved',
            isDraftLike: false,
            userCanEditOwn: false,
            isFinal: true,
            order: 40
        },
        {
            name: 'Rejected',
            isDraftLike: true, // Only visible to author/admin so they can fix it? Or should it be public? Let's say private for rework.
            userCanEditOwn: true,
            isFinal: false,
            order: 50
        }
    ];

    for (const status of statuses) {
        const existing = await prisma.reportStatus.findUnique({ where: { name: status.name } });
        if (!existing) {
            await prisma.reportStatus.create({ data: status });
            console.log(`Created Report Status: ${status.name}`);
        } else {
            // Update existing to match defining properties if needed? For now, skip.
        }
    }

    console.log('Seeding completed.');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
