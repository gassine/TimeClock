import { prisma } from '@/lib/prisma';
import AdminDashboard from '@/components/AdminDashboard';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-key-change-this';

export const dynamic = 'force-dynamic';

export default async function AdminPage() {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth_session')?.value;

    if (!token) {
        redirect('/');
    }

    let user;
    try {
        user = jwt.verify(token, JWT_SECRET) as any;
    } catch (error) {
        redirect('/');
    }

    if (!user.isAdmin) {
        redirect('/dashboard');
    }

    const [firefighters, roles, stations] = await Promise.all([
        prisma.firefighter.findMany({
            include: { role: true, station: true },
            orderBy: { name: 'asc' },
        }),
        prisma.role.findMany({ orderBy: { name: 'asc' } }),
        prisma.station.findMany({ orderBy: { name: 'asc' } }),
    ]);

    const safeFirefighters = firefighters.map(f => ({
        ...f,
        createdAt: f.createdAt.toISOString(),
        role: { ...f.role, createdAt: f.role.createdAt.toISOString() },
        station: f.station ? { ...f.station, createdAt: f.station.createdAt.toISOString() } : null
    }));
    const safeRoles = roles.map(r => ({ ...r, createdAt: r.createdAt.toISOString() }));
    const safeStations = stations.map(s => ({ ...s, createdAt: s.createdAt.toISOString() }));

    return (
        <AdminDashboard
            initialFirefighters={safeFirefighters as any}
            initialRoles={safeRoles as any}
            initialStations={safeStations as any}
            currentUser={user}
        />
    );
}
