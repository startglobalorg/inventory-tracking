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

export async function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;

    // Allow the login page itself
    if (pathname === '/admin/login') {
        return NextResponse.next();
    }

    // Protect all /admin routes
    if (pathname.startsWith('/admin')) {
        const token = request.cookies.get('admin_token')?.value;
        const adminPassword = process.env.ADMIN_PASSWORD;

        if (!token || !adminPassword) {
            const loginUrl = new URL('/admin/login', request.url);
            return NextResponse.redirect(loginUrl);
        }

        // Validate token matches the hash of the current password
        const expectedToken = await sha256(adminPassword);
        if (token !== expectedToken) {
            const loginUrl = new URL('/admin/login', request.url);
            const response = NextResponse.redirect(loginUrl);
            response.cookies.delete('admin_token');
            return response;
        }
    }

    return NextResponse.next();
}

export const config = {
    matcher: ['/admin/:path*'],
};
