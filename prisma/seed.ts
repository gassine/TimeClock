import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    const roles = [
        { name: 'Firefighter' },
        { name: 'Captain' },
        { name: 'Lieutenant' },
        { name: 'Chief' },
    ]

    for (const role of roles) {
        await prisma.role.upsert({
            where: { name: role.name },
            update: {},
            create: role,
        })
    }

    console.log('Roles seeded successfully')

    const statuses = [
        { name: 'Received', color: 'bg-yellow-500', order: 1, isDefault: true },
        { name: 'In Progress', color: 'bg-blue-500', order: 2, isDefault: false },
        { name: 'Fixed', color: 'bg-green-500', order: 3, isDefault: false },
        { name: 'Archived', color: 'bg-gray-500', order: 4, isDefault: false },
    ]

    for (const status of statuses) {
        await prisma.issueStatus.upsert({
            where: { name: status.name },
            update: {},
            create: status,
        })
    }

    console.log('Issue Statuses seeded successfully')

    // Create Default Admin User
    const firefighterRole = await prisma.role.findUnique({ where: { name: 'Firefighter' } })
    if (firefighterRole) {
        await prisma.firefighter.upsert({
            where: { pin: '0000' }, // Default Admin PIN
            update: {},
            create: {
                name: 'System Admin',
                pin: '0000',
                roleId: firefighterRole.id,
                isActive: true,
                isAdmin: true, // Admin access is now per-user
            },
        })
        console.log('Default Admin user seeded (PIN: 0000)')
    }
}

main()
    .then(async () => {
        await prisma.$disconnect()
    })
    .catch(async (e) => {
        console.error(e)
        await prisma.$disconnect()
        process.exit(1)
    })
