import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';

// API paths that don't require a logged-in session
const PUBLIC_PATHS = ['/api/auth/login', '/api/auth/logout'];

export async function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;

    // Only guard API routes
    if (!pathname.startsWith('/api/')) {
        return NextResponse.next();
    }

    // Let public auth endpoints through
    if (PUBLIC_PATHS.some(p => pathname.startsWith(p))) {
        return NextResponse.next();
    }

    const token = request.cookies.get('auth_session')?.value;

    if (!token) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const secret = new TextEncoder().encode(process.env.JWT_SECRET);
        await jwtVerify(token, secret);
        return NextResponse.next();
    } catch {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
}

export const config = {
    matcher: '/api/:path*',
};
