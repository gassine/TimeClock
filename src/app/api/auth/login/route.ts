import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { cookies, headers } from 'next/headers';
import { checkRateLimit, recordFailedAttempt, clearAttempts } from '@/lib/rateLimit';
import { getJwtSecret } from '@/lib/auth';

export async function POST(request: NextRequest) {
    try {
        // Rate limiting — get the real client IP
        const headersList = await headers();
        const forwarded = headersList.get('x-forwarded-for');
        const ip = forwarded ? forwarded.split(',')[0].trim() : 'unknown';

        const rateCheck = checkRateLimit(ip);
        if (!rateCheck.allowed) {
            return NextResponse.json(
                { error: `Too many failed login attempts. Try again in ${Math.ceil((rateCheck.retryAfterSeconds ?? 900) / 60)} minutes.` },
                { status: 429 }
            );
        }

        const { pin, password } = await request.json();

        if (!pin) {
            return NextResponse.json({ error: 'PIN is required' }, { status: 400 });
        }

        const firefighter = await prisma.firefighter.findUnique({
            where: { pin },
            include: { role: true }
        });

        if (!firefighter) {
            recordFailedAttempt(ip);
            return NextResponse.json({ error: 'Invalid PIN' }, { status: 401 });
        }

        if (!firefighter.isActive) {
            return NextResponse.json({ error: 'Account is inactive' }, { status: 403 });
        }

        // Auth Logic
        if (firefighter.password) {
            if (!password) {
                recordFailedAttempt(ip);
                return NextResponse.json({ error: 'Password required' }, { status: 401 });
            }
            const isValid = await bcrypt.compare(password, firefighter.password);
            if (!isValid) {
                recordFailedAttempt(ip);
                return NextResponse.json({ error: 'Invalid password' }, { status: 401 });
            }
        }

        // Successful login — clear any failed attempt history for this IP
        clearAttempts(ip);

        // Create Session Token
        const token = jwt.sign(
            {
                id: firefighter.id,
                name: firefighter.name,
                isAdmin: firefighter.isAdmin,
                role: firefighter.role.name,
                pin: firefighter.pin
            },
            getJwtSecret(),
            { expiresIn: '8h' }
        );

        const cookieStore = await cookies();
        cookieStore.set('auth_session', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 60 * 60 * 8, // 8 hours
            path: '/',
        });

        return NextResponse.json({
            success: true,
            user: {
                id: firefighter.id,
                name: firefighter.name,
                isAdmin: firefighter.isAdmin
            }
        });

    } catch (error) {
        console.error('Login error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
