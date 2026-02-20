import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { cookies } from 'next/headers';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-key-change-this';

export async function POST(request: Request) {
    try {
        const { pin, password } = await request.json();

        if (!pin) {
            return NextResponse.json({ error: 'PIN is required' }, { status: 400 });
        }

        const firefighter = await prisma.firefighter.findUnique({
            where: { pin },
            include: { role: true }
        });

        if (!firefighter) {
            return NextResponse.json({ error: 'Invalid PIN' }, { status: 401 });
        }

        if (!firefighter.isActive) {
            return NextResponse.json({ error: 'Account is inactive' }, { status: 403 });
        }

        // Auth Logic
        if (firefighter.password) {
            // User has a password, verify it
            if (!password) {
                return NextResponse.json({ error: 'Password required' }, { status: 401 });
            }
            const isValid = await bcrypt.compare(password, firefighter.password);
            if (!isValid) {
                return NextResponse.json({ error: 'Invalid password' }, { status: 401 });
            }
        } else {
            // User has NO password configured -> specific logic:
            // "users that don't have a password will log in automatically"
            // This means we allow login with just PIN.
        }

        // Create Session Token
        const token = jwt.sign(
            {
                id: firefighter.id,
                name: firefighter.name,
                isAdmin: firefighter.role.isAdmin,
                role: firefighter.role.name,
                pin: firefighter.pin
            },
            JWT_SECRET,
            { expiresIn: '8h' }
        );

        // Set Cookie
        // Await the cookies() call
        const cookieStore = await cookies();
        cookieStore.set('auth_session', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 60 * 60 * 8, // 8 hours
            path: '/',
        });

        return NextResponse.json({
            success: true,
            user: {
                id: firefighter.id,
                name: firefighter.name,
                isAdmin: firefighter.role.isAdmin
            }
        });

    } catch (error) {
        console.error('Login error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
