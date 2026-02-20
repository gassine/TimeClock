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

    return (
        <AdminDashboard
            initialFirefighters={firefighters}
            initialRoles={roles}
            initialStations={stations}
            currentUser={user}
        />
    );
}
