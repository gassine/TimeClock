import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { logAdminAction } from '@/lib/logger';

const DEFAULT_SETTINGS = {
    showRadioId: true,
    showName: true,
    showRole: true,
    showStation: true,
    showShift: true,
    showPhone: true,
    showStartDate: true,
    roleOrder: '[]',
};

export async function GET() {
    try {
        let settings = await prisma.directorySettings.findFirst();
        if (!settings) {
            settings = await prisma.directorySettings.create({ data: DEFAULT_SETTINGS });
        }
        return NextResponse.json({
            ...settings,
            roleOrder: JSON.parse(settings.roleOrder || '[]'),
        });
    } catch (error) {
        return NextResponse.json({ error: 'Failed to fetch directory settings' }, { status: 500 });
    }
}

export async function PUT(request: Request) {
    try {
        const body = await request.json();
        const {
            showRadioId, showName, showRole, showStation,
            showShift, showPhone, showStartDate, roleOrder,
        } = body;

        let settings = await prisma.directorySettings.findFirst();

        const data = {
            showRadioId: showRadioId ?? true,
            showName: showName ?? true,
            showRole: showRole ?? true,
            showStation: showStation ?? true,
            showShift: showShift ?? true,
            showPhone: showPhone ?? true,
            showStartDate: showStartDate ?? true,
            roleOrder: JSON.stringify(Array.isArray(roleOrder) ? roleOrder : []),
        };

        if (settings) {
            settings = await prisma.directorySettings.update({
                where: { id: settings.id },
                data,
            });
        } else {
            settings = await prisma.directorySettings.create({ data });
        }

        await logAdminAction('UPDATE', 'DirectorySettings', settings.id, 'Updated directory settings');

        return NextResponse.json({
            ...settings,
            roleOrder: JSON.parse(settings.roleOrder || '[]'),
        });
    } catch (error) {
        return NextResponse.json({ error: 'Failed to update directory settings' }, { status: 500 });
    }
}
