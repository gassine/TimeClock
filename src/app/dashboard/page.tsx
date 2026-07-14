import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import UserDashboard from '@/components/UserDashboard';
import { getAuthUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
    const user = await getAuthUser();
    if (!user) {
        redirect('/');
    }

    let dashboardUser = user;
    try {
        const dbUser = await prisma.firefighter.findUnique({
            where: { id: user.id },
            select: { roleId: true }
        });

        if (dbUser) {
            dashboardUser = { ...user, roleId: dbUser.roleId };
        }
    } catch (dbError) {
        console.error("Dashboard DB fetch error:", dbError);
        // Continue even if DB fetch fails, to show dashboard
    }

    return <UserDashboard user={dashboardUser} />;
}
