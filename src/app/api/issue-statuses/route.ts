import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { logAdminAction } from '@/lib/logger';

export async function GET(request: Request) {
    try {
        const statuses = await prisma.issueStatus.findMany({
            orderBy: {
                order: 'asc'
            }
        });
        return NextResponse.json(statuses);
    } catch (error) {
        console.error('Error fetching issue statuses:', error);
        return NextResponse.json({ error: 'Failed to fetch issue statuses' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { name, color, order } = body;
        const adminId = request.headers.get('x-user-id'); // Assuming middleware sets this or we parse it

        if (!name || !color) {
            return NextResponse.json({ error: 'Name and Color are required' }, { status: 400 });
        }

        const newStatus = await prisma.issueStatus.create({
            data: {
                name,
                color,
                order: order || 0
            }
        });

        if (adminId) {
            await logAdminAction(
                'CREATE',
                'IssueStatus',
                newStatus.id,
                `Created issue status: ${newStatus.name}`,
                adminId
            );
        }

        return NextResponse.json(newStatus);
    } catch (error) {
        console.error('Error creating issue status:', error);
        return NextResponse.json({ error: 'Failed to create issue status' }, { status: 500 });
    }
}
