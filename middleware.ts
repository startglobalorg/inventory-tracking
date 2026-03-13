import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

async function sha256(text: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(text);
    const hash = await crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(hash))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
}

async function hmacSha256(message: string, secret: string): Promise<string> {
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
        'raw',
        encoder.encode(secret),
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign']
    );
    const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(message));
    return Array.from(new Uint8Array(sig))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
}

/** Verify a pin_* cookie: "{identifier}:{expiry}:{hmac}" */
async function verifyPinCookie(cookieValue: string | undefined, expectedIdentifier: string): Promise<boolean> {
    if (!cookieValue) return false;
    const secret = process.env.ADMIN_PASSWORD;
    if (!secret) return false;

    const parts = cookieValue.split(':');
    if (parts.length !== 3) return false;
    const [identifier, expiryStr, sig] = parts;

    if (identifier !== expectedIdentifier) return false;

    const expiry = parseInt(expiryStr, 10);
    if (isNaN(expiry) || expiry < Math.floor(Date.now() / 1000)) return false;

    const expected = await hmacSha256(`${identifier}:${expiryStr}`, secret);
    return sig === expected;
}

/** Check if the request has a valid admin_token cookie. */
async function isAdmin(request: NextRequest): Promise<boolean> {
    const token = request.cookies.get('admin_token')?.value;
    const adminPassword = process.env.ADMIN_PASSWORD;
    if (!token || !adminPassword) return false;
    return token === await sha256(adminPassword);
}

export async function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;

    // ── Admin routes ──────────────────────────────────────────
    if (pathname === '/admin/login') {
        return NextResponse.next();
    }

    if (pathname.startsWith('/admin')) {
        const token = request.cookies.get('admin_token')?.value;
        const adminPassword = process.env.ADMIN_PASSWORD;

        if (!token || !adminPassword) {
            return NextResponse.redirect(new URL('/admin/login', request.url));
        }

        const expectedToken = await sha256(adminPassword);
        if (token !== expectedToken) {
            const response = NextResponse.redirect(new URL('/admin/login', request.url));
            response.cookies.delete('admin_token');
            return response;
        }

        return NextResponse.next();
    }

    // ── PIN-protected routes ──────────────────────────────────

    // /request/{slug} — needs pin_{slug} cookie
    const requestMatch = pathname.match(/^\/request\/([^/]+)/);
    if (requestMatch) {
        const slug = requestMatch[1];

        // Allow through if: admin, valid pin cookie, or pin in query param (handled by API route)
        if (await isAdmin(request)) return NextResponse.next();

        const cookie = request.cookies.get(`pin_${slug}`)?.value;
        if (await verifyPinCookie(cookie, slug)) return NextResponse.next();

        // Also allow /request/{slug}/history if the request page is authorized
        // (the cookie covers all sub-paths of this location)

        const authUrl = new URL('/auth', request.url);
        authUrl.searchParams.set('redirect', pathname);
        return NextResponse.redirect(authUrl);
    }

    // /volunteer — needs pin_volunteer cookie
    if (pathname === '/volunteer' || pathname.startsWith('/volunteer/')) {
        if (await isAdmin(request)) return NextResponse.next();

        const cookie = request.cookies.get('pin_volunteer')?.value;
        if (await verifyPinCookie(cookie, 'volunteer')) return NextResponse.next();

        const authUrl = new URL('/auth', request.url);
        authUrl.searchParams.set('redirect', pathname);
        return NextResponse.redirect(authUrl);
    }

    return NextResponse.next();
}

export const config = {
    matcher: ['/admin/:path*', '/request/:path*', '/volunteer/:path*'],
};
