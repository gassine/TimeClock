import { prisma } from '@/lib/prisma';
import AdminDashboard from '@/components/AdminDashboard';
import { redirect } from 'next/navigation';
import { getAuthUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export default async function AdminPage() {
    const user = await getAuthUser();
    if (!user) {
        redirect('/');
    }

    if (!user.isAdmin) {
        redirect('/dashboard');
    }

    const [firefighters, roles, stations, shifts] = await Promise.all([
        prisma.firefighter.findMany({
            omit: { password: true },
            include: { role: true, station: true, shift: true },
            orderBy: { name: 'asc' },
        }),
        prisma.role.findMany({ orderBy: { name: 'asc' } }),
        prisma.station.findMany({ orderBy: { name: 'asc' } }),
        prisma.shift.findMany({ orderBy: { name: 'asc' } }),
    ]);

    const safeFirefighters = firefighters.map(f => ({
        ...f,
        createdAt: f.createdAt.toISOString(),
        startDate: f.startDate ? f.startDate.toISOString() : null,
        role: { ...f.role, createdAt: f.role.createdAt.toISOString() },
        station: f.station ? { ...f.station, createdAt: f.station.createdAt.toISOString() } : null,
        shift: f.shift ? { ...f.shift, createdAt: f.shift.createdAt.toISOString() } : null,
    }));
    const safeRoles = roles.map(r => ({ ...r, createdAt: r.createdAt.toISOString() }));
    const safeStations = stations.map(s => ({ ...s, createdAt: s.createdAt.toISOString() }));
    const safeShifts = shifts.map(s => ({ ...s, createdAt: s.createdAt.toISOString() }));

    return (
        <AdminDashboard
            initialFirefighters={safeFirefighters as any}
            initialRoles={safeRoles as any}
            initialStations={safeStations as any}
            initialShifts={safeShifts as any}
            currentUser={user}
        />
    );
}

