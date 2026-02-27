import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import jwt from 'jsonwebtoken';
import { prisma } from '@/lib/prisma';
import UserDashboard from '@/components/UserDashboard';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-key-change-this';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth_session')?.value;

    if (!token) {
        redirect('/');
    }

    let decoded: any;
    try {
        decoded = jwt.verify(token, JWT_SECRET) as any;
    } catch (error) {
        // Invalid token
        redirect('/');
    }

    try {
        const dbUser = await prisma.firefighter.findUnique({
            where: { id: decoded.id },
            select: { roleId: true }
        });

        if (dbUser) {
            decoded.roleId = dbUser.roleId;
        }
    } catch (dbError) {
        console.error("Dashboard DB fetch error:", dbError);
        // Continue even if DB fetch fails, to show dashboard
    }

    return <UserDashboard user={decoded} />;
}
