import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

export async function GET() {
    try {
        const firefighters = await prisma.firefighter.findMany({
            where: {
                isActive: true,
                isHiddenFromDirectory: false,
            },
            include: {
                role: true,
                station: true,
                shift: true,
            },
            orderBy: { name: 'asc' },
        });

        // Sanitize: strip password and sensitive fields
        const safeFirefighters = firefighters.map(ff => ({
            id: ff.id,
            name: ff.name,
            pin: ff.pin,
            phoneNumber: ff.phoneNumber,
            startDate: ff.startDate ? ff.startDate.toISOString() : null,
            role: ff.role ? { id: ff.role.id, name: ff.role.name } : null,
            station: ff.station ? { id: ff.station.id, name: ff.station.name } : null,
            shift: ff.shift ? { id: ff.shift.id, name: ff.shift.name } : null,
        }));

        return NextResponse.json(safeFirefighters);
    } catch (error) {
        return NextResponse.json({ error: 'Failed to fetch directory' }, { status: 500 });
    }
}
