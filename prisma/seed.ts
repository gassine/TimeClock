import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    const roles = [
        { name: 'Firefighter', isAdmin: false },
        { name: 'Captain', isAdmin: false },
        { name: 'Lieutenant', isAdmin: false },
        { name: 'Admin', isAdmin: true },
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
    const adminRole = await prisma.role.findUnique({ where: { name: 'Admin' } })
    if (adminRole) {
        await prisma.firefighter.upsert({
            where: { pin: '0000' }, // Default Admin PIN
            update: {},
            create: {
                name: 'System Admin',
                pin: '0000',
                roleId: adminRole.id,
                isActive: true,
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
