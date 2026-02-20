import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

export async function GET() {
    try {
        const roles = await prisma.role.findMany({
            orderBy: { name: 'asc' },
        });
        return NextResponse.json(roles);
    } catch (error) {
        return NextResponse.json({ error: 'Failed to fetch roles' }, { status: 500 });
    }
}

import { logAdminAction } from '@/lib/logger';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { name, isAdmin } = body;

        const role = await prisma.role.create({
            data: {
                name,
                isAdmin: isAdmin || false,
            },
        });

        await logAdminAction(
            'CREATE',
            'Role',
            role.id,
            `Created role: ${role.name}`
        );

        return NextResponse.json(role, { status: 201 });
    } catch (error) {
        return NextResponse.json({ error: 'Failed to create role' }, { status: 500 });
    }
}
