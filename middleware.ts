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

// ── Pangolin token helpers ──────────────────────────────────────

/** Read p_token from query string or cookie. */
function getPangolinToken(request: NextRequest): string | null {
    return request.nextUrl.searchParams.get('p_token')
        || request.cookies.get('pangolin_token')?.value
        || null;
}

/** Build a redirect URL using the public BASE_URL, preserving p_token. */
function buildRedirect(request: NextRequest, path: string, params?: Record<string, string>): URL {
    const base = process.env.BASE_URL || 'http://localhost:3000';
    const url = new URL(path, base);
    const pToken = getPangolinToken(request);
    if (pToken) url.searchParams.set('p_token', pToken);
    if (params) {
        for (const [k, v] of Object.entries(params)) {
            url.searchParams.set(k, v);
        }
    }
    return url;
}

/** If p_token came in via query param, set it as a client-readable cookie. */
function setPangolinCookie(request: NextRequest, response: NextResponse): NextResponse {
    const pToken = request.nextUrl.searchParams.get('p_token');
    if (pToken) {
        response.cookies.set('pangolin_token', pToken, {
            httpOnly: false, // client JS needs to read this for fetch interceptor
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            path: '/',
            maxAge: 60 * 60 * 24 * 30, // 30 days
        });
    }
    return response;
}

// ── Main middleware ──────────────────────────────────────────────

export async function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;

    // ── Admin routes ──────────────────────────────────────────
    if (pathname === '/admin/login') {
        return setPangolinCookie(request, NextResponse.next());
    }

    if (pathname.startsWith('/admin')) {
        const token = request.cookies.get('admin_token')?.value;
        const adminPassword = process.env.ADMIN_PASSWORD;

        if (!token || !adminPassword) {
            return setPangolinCookie(request, NextResponse.redirect(buildRedirect(request, '/admin/login')));
        }

        const expectedToken = await sha256(adminPassword);
        if (token !== expectedToken) {
            const response = NextResponse.redirect(buildRedirect(request, '/admin/login'));
            response.cookies.delete('admin_token');
            return setPangolinCookie(request, response);
        }

        return setPangolinCookie(request, NextResponse.next());
    }

    // ── PIN-protected routes ──────────────────────────────────

    // /request/{slug} — needs pin_{slug} cookie
    const requestMatch = pathname.match(/^\/request\/([^/]+)/);
    if (requestMatch) {
        const slug = requestMatch[1];

        if (await isAdmin(request)) return setPangolinCookie(request, NextResponse.next());

        const cookie = request.cookies.get(`pin_${slug}`)?.value;
        if (await verifyPinCookie(cookie, slug)) return setPangolinCookie(request, NextResponse.next());

        return setPangolinCookie(request, NextResponse.redirect(
            buildRedirect(request, '/auth', { redirect: pathname })
        ));
    }

    // /volunteer — needs pin_volunteer cookie
    if (pathname === '/volunteer' || pathname.startsWith('/volunteer/')) {
        if (await isAdmin(request)) return setPangolinCookie(request, NextResponse.next());

        const cookie = request.cookies.get('pin_volunteer')?.value;
        if (await verifyPinCookie(cookie, 'volunteer')) return setPangolinCookie(request, NextResponse.next());

        return setPangolinCookie(request, NextResponse.redirect(
            buildRedirect(request, '/auth', { redirect: pathname })
        ));
    }

    // ── All other matched routes: just set the cookie ─────────
    return setPangolinCookie(request, NextResponse.next());
}

export const config = {
    matcher: [
        /*
         * Match all paths except:
         * - _next/static, _next/image (static assets)
         * - favicon.ico, robots.txt, sitemap.xml
         * - image files
         */
        '/((?!_next/static|_next/image|favicon\\.ico|robots\\.txt|sitemap\\.xml|.*\\.png$|.*\\.jpg$|.*\\.svg$).*)',
    ],
};
