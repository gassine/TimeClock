import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';

function getJwtSecret(): string {
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
}

export async function getAuthUser(): Promise<AuthUser | null> {
    try {
        const cookieStore = await cookies();
        const token = cookieStore.get('auth_session')?.value;
        if (!token) return null;
        const decoded = jwt.verify(token, getJwtSecret()) as AuthUser;
        return decoded;
    } catch {
        return null;
    }
}
