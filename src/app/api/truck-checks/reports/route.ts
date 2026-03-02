import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const status = searchParams.get('status');

        const reports = await prisma.truckCheckReport.findMany({
            where: status ? { status } : undefined,
            include: {
                apparatus: true,
                items: true,
                template: true
            },
            orderBy: { createdAt: 'desc' },
            take: 100 // Limit for safety
        });

        return NextResponse.json(reports);
    } catch (error) {
        console.error('Fetch reports error:', error);
        return NextResponse.json({ error: 'Failed to fetch reports' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const { apparatusId } = await request.json();

        // 1. Find the active template for this apparatus
        const template = await prisma.truckCheckTemplate.findFirst({
            where: { apparatusId, isArchived: false },
            include: {
                items: {
                    orderBy: { order: 'asc' }
                }
            }
        });

        if (!template) {
            return NextResponse.json({ error: 'No checklist template exists for this apparatus.' }, { status: 400 });
        }

        if (template.items.length === 0) {
            return NextResponse.json({ error: 'The template for this apparatus has no items.' }, { status: 400 });
        }

        // 2. Instantiate a new Report using this Template
        // We copy the template items into ReportItems defaulting to "NA"
        const report = await prisma.truckCheckReport.create({
            data: {
                templateId: template.id,
                apparatusId,
                status: 'Open',
                items: {
                    create: template.items.map(item => ({
                        templateItemId: item.id,
                        status: 'NA'
                    }))
                }
            },
            include: {
                apparatus: true,
                items: {
                    include: {
                        templateItem: {
                            include: {
                                location: true
                            }
                        },
                        completedByUser: true
                    }
                }
            }
        });

        return NextResponse.json(report);
    } catch (error) {
        console.error('Create report error:', error);
        return NextResponse.json({ error: 'Failed to create report' }, { status: 500 });
    }
}
