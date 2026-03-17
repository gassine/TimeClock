import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
    try {
        const rules = await prisma.certificationReminderRule.findMany({
            orderBy: { daysBeforeExpiry: 'asc' },
        });
        return NextResponse.json(rules);
    } catch (error) {
        console.error('Failed to fetch certification rules:', error);
        return NextResponse.json({ error: 'Failed to fetch rules' }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const { daysBeforeExpiry, color, label } = await req.json();
        if (!daysBeforeExpiry || !color) {
            return NextResponse.json({ error: 'daysBeforeExpiry and color are required' }, { status: 400 });
        }
        const rule = await prisma.certificationReminderRule.create({
            data: {
                daysBeforeExpiry: parseInt(daysBeforeExpiry),
                color,
                label: label || null,
            },
        });
        return NextResponse.json(rule);
    } catch (error) {
        console.error('Failed to create certification rule:', error);
        return NextResponse.json({ error: 'Failed to create rule' }, { status: 500 });
    }
}
