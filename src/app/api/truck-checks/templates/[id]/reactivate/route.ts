import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;

        // Verify the template exists
        const template = await prisma.truckCheckTemplate.findUnique({
            where: { id }
        });

        if (!template) {
            return NextResponse.json({ error: 'Template not found' }, { status: 404 });
        }

        // Check if another active template already exists for this apparatus
        const existingActive = await prisma.truckCheckTemplate.findFirst({
            where: {
                apparatusId: template.apparatusId,
                isArchived: false
            }
        });

        if (existingActive) {
            return NextResponse.json({ error: 'Cannot reactivate: an active template already exists for this Apparatus. Please archive or delete it first.' }, { status: 400 });
        }

        // Reactivate
        await prisma.truckCheckTemplate.update({
            where: { id },
            data: { isArchived: false }
        });

        return NextResponse.json({ success: true, message: 'Template reactivated successfully' });
    } catch (error) {
        console.error('Reactivate template error:', error);
        return NextResponse.json({ error: 'Failed to reactivate template' }, { status: 500 });
    }
}
