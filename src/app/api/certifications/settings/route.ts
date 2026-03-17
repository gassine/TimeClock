import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
    try {
        let settings = await prisma.certificationSettings.findFirst();
        if (!settings) {
            settings = await prisma.certificationSettings.create({ data: { showToUsers: true } });
        }
        return NextResponse.json(settings);
    } catch (error) {
        console.error('Failed to fetch certification settings:', error);
        return NextResponse.json({ error: 'Failed to fetch settings' }, { status: 500 });
    }
}

export async function PATCH(req: Request) {
    try {
        const data = await req.json();
        let settings = await prisma.certificationSettings.findFirst();
        if (!settings) {
            settings = await prisma.certificationSettings.create({
                data: { showToUsers: data.showToUsers ?? true },
            });
        } else {
            settings = await prisma.certificationSettings.update({
                where: { id: settings.id },
                data: { showToUsers: data.showToUsers !== undefined ? data.showToUsers : settings.showToUsers },
            });
        }
        return NextResponse.json(settings);
    } catch (error) {
        console.error('Failed to update certification settings:', error);
        return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 });
    }
}
