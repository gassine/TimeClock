import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';
import { createHmac } from 'crypto';
import { prisma } from '@/lib/prisma';

export function getJwtSecret(): string {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
        throw new Error('JWT_SECRET environment variable is not set. Set it before starting the server.');
    }
    return secret;
}

export interface AuthUser {
    id: string;
    name: string;
    isAdmin: boolean;
    role: string;
    pin: string;
    roleId?: string;
    passwordVersion?: string;
}

export function getPasswordVersion(passwordHash: string | null): string {
    return createHmac('sha256', getJwtSecret())
        .update(passwordHash ?? '')
        .digest('hex');
}

export async function getAuthUser(): Promise<AuthUser | null> {
    try {
        const cookieStore = await cookies();
        const token = cookieStore.get('auth_session')?.value;
        if (!token) return null;
        const decoded = jwt.verify(token, getJwtSecret()) as AuthUser;
        const firefighter = await prisma.firefighter.findUnique({
            where: { id: decoded.id },
            include: { role: true },
        });

        if (!firefighter?.isActive) return null;

        if (
            firefighter.password &&
            decoded.passwordVersion !== getPasswordVersion(firefighter.password)
        ) {
            return null;
        }

        return {
            id: firefighter.id,
            name: firefighter.name,
            isAdmin: firefighter.isAdmin,
            role: firefighter.role.name,
            pin: firefighter.pin,
            roleId: firefighter.roleId,
            passwordVersion: decoded.passwordVersion,
        };
    } catch {
        return null;
    }
}
