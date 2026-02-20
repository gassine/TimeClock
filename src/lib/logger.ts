
import { prisma } from './prisma';
import { headers, cookies } from 'next/headers';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-key-change-this';

async function getAdminId(): Promise<string | undefined> {
    try {
        const cookieStore = await cookies();
        const token = cookieStore.get('auth_session')?.value;
        if (!token) return undefined;
        const decoded = jwt.verify(token, JWT_SECRET) as any;
        return decoded.id;
    } catch {
        return undefined;
    }
}

export async function logAdminAction(
    action: string,
    model: string,
    modelId: string | null,
    details: string,
    adminId?: string
) {
    try {
        const effectiveAdminId = adminId || await getAdminId();

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
