import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const archived = searchParams.get('archived') === 'true';

        const issues = await prisma.issue.findMany({
            where: {
                isArchived: archived
            },
            include: {
                reportedBy: true,
                status: true,
                comments: {
                    include: {
                        author: true
                    },
                    orderBy: {
                        createdAt: 'asc'
                    }
                }
            },
            orderBy: {
                createdAt: 'desc'
            }
        });
        return NextResponse.json(issues);
    } catch (error) {
        console.error('Error fetching issues:', error);
        return NextResponse.json({ error: 'Failed to fetch issues' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { title, description, reportedById } = body;

        if (!title || !description || !reportedById) {
            return NextResponse.json({ error: 'Title, Description, and Reporter are required' }, { status: 400 });
        }

        // Find default status
        const defaultStatus = await prisma.issueStatus.findFirst({
            where: { isDefault: true }
        });

        // Fallback if no default status exists (though we seeded one)
        let statusId = defaultStatus?.id;
        if (!statusId) {
            const anyStatus = await prisma.issueStatus.findFirst();
            statusId = anyStatus?.id;
        }

        if (!statusId) {
            return NextResponse.json({ error: 'No issue statuses defined' }, { status: 500 });
        }

        const newIssue = await prisma.issue.create({
            data: {
                title,
                description,
                reportedById,
                statusId
            },
            include: {
                status: true,
                reportedBy: true
            }
        });

        return NextResponse.json(newIssue);
    } catch (error) {
        console.error('Error creating issue:', error);
        return NextResponse.json({ error: 'Failed to create issue' }, { status: 500 });
    }
}
