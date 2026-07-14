
import { prisma } from './prisma';
import { headers } from 'next/headers';
import { getAuthUser } from './auth';

export async function logAdminAction(
    action: string,
    model: string,
    modelId: string | null,
    details: string,
    adminId?: string
) {
    try {
        const currentUser = adminId ? null : await getAuthUser();
        const effectiveAdminId = adminId || currentUser?.id;

        const headersList = await headers();
        const forwardedFor = headersList.get('x-forwarded-for');
        const ip = forwardedFor ? forwardedFor.split(',')[0] : 'Unknown';

        await prisma.auditLog.create({
            data: {
                adminId: effectiveAdminId,
                action,
                model,
                modelId,
                details,
                ipAddress: ip,
            },
        });
    } catch (error) {
        console.error('Failed to create audit log:', error);
    }
}
