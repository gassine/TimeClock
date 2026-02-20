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
