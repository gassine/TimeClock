import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
    try {
        // Get client IP from proxy headers or direct connection
        const forwarded = request.headers.get('x-forwarded-for');
        const ip = forwarded ? forwarded.split(',')[0].trim() : request.headers.get('x-real-ip') ?? '';

        // Skip geolocation for loopback/private IPs (dev environment)
        const isPrivate = !ip || ip === '::1' || ip.startsWith('127.') || ip.startsWith('192.168.') || ip.startsWith('10.') || ip.startsWith('172.');
        if (isPrivate) {
            return NextResponse.json({ state: null, stateCode: null });
        }

        const res = await fetch(`http://ip-api.com/json/${ip}?fields=status,regionName,region`, {
            next: { revalidate: 3600 }, // cache per IP for 1 hour
        });

        if (!res.ok) return NextResponse.json({ state: null, stateCode: null });

        const data = await res.json();
        if (data.status !== 'success') return NextResponse.json({ state: null, stateCode: null });

        return NextResponse.json({
            state: data.regionName ?? null,      // e.g. "Texas"
            stateCode: data.region ?? null,       // e.g. "TX"
        });
    } catch {
        return NextResponse.json({ state: null, stateCode: null });
    }
}
