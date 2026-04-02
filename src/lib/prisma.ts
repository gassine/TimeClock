import { PrismaClient } from '@prisma/client'

const globalForPrisma = global as unknown as { prisma: PrismaClient }

function createPrismaClient() {
    const client = new PrismaClient()

    // Apply SQLite safety pragmas on every new connection.
    // WAL mode: allows reads and writes to happen at the same time without locking each other out.
    // busy_timeout: if two writes collide, wait up to 10s instead of immediately failing.
    // synchronous=NORMAL: safe durability level when combined with WAL.
    // foreign_keys=ON: enforce relational integrity (Prisma doesn't enable this by default on SQLite).
    client.$connect().then(() => {
        client.$executeRawUnsafe('PRAGMA journal_mode=WAL;').catch(() => {})
        client.$executeRawUnsafe('PRAGMA busy_timeout=10000;').catch(() => {})
        client.$executeRawUnsafe('PRAGMA synchronous=NORMAL;').catch(() => {})
        client.$executeRawUnsafe('PRAGMA foreign_keys=ON;').catch(() => {})
    }).catch(() => {})

    return client
}

export const prisma = globalForPrisma.prisma || createPrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
