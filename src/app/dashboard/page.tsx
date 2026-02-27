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

    try {
        const decoded = jwt.verify(token, JWT_SECRET) as any;

        const dbUser = await prisma.firefighter.findUnique({
            where: { id: decoded.id },
            select: { roleId: true }
        });

        if (dbUser) {
            decoded.roleId = dbUser.roleId;
        }

        // If user is admin and tries to access this page, accessing via Login Button...
        // The Login Button redirects Admins to /admin.
        // But if they manually navigated here?
        // Let's support Admins seeing their own dashboard too?
        // Or redirect them to Admin portal?
        // Prompt says: "keep using the same password logic, but instead of taking them to their own portal, take them to the admin portal."
        // This usually means on Login.

        // If I am an admin, I should go to /admin.
        if (decoded.isAdmin) {
            redirect('/admin');
        }

        return <UserDashboard user={decoded} />;
    } catch (error) {
        // Invalid token
        redirect('/');
    }
}
