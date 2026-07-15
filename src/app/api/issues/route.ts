import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';

export async function GET(request: Request) {
    try {
        const user = await getAuthUser();
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const archived = searchParams.get('archived') === 'true';

        const issues = await prisma.issue.findMany({
            where: {
                isArchived: archived,
                ...(user.isAdmin ? {} : {
                    OR: [
                        { isVisibleToEveryone: true },
                        { reportedById: user.id }
                    ]
                })
            },
            include: {
                reportedBy: {
                    select: { id: true, name: true }
                },
                status: true,
                comments: {
                    include: {
                        author: {
                            select: { id: true, name: true }
                        }
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
        const user = await getAuthUser();
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { title, description } = body;

        if (!title?.trim() || !description?.trim()) {
            return NextResponse.json({ error: 'Title and description are required' }, { status: 400 });
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
                title: title.trim(),
                description: description.trim(),
                reportedById: user.id,
                statusId,
                isVisibleToEveryone: false
            },
            include: {
                status: true,
                reportedBy: {
                    select: { id: true, name: true }
                }
            }
        });

        return NextResponse.json(newIssue);
    } catch (error) {
        console.error('Error creating issue:', error);
        return NextResponse.json({ error: 'Failed to create issue' }, { status: 500 });
    }
}
