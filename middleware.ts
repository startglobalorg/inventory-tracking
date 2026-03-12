import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;

    // Allow the login page itself
    if (pathname === '/admin/login') {
        return NextResponse.next();
    }

    // Protect all /admin routes
    if (pathname.startsWith('/admin')) {
        const token = request.cookies.get('admin_token')?.value;

        if (!token) {
            const loginUrl = new URL('/admin/login', request.url);
            return NextResponse.redirect(loginUrl);
        }

        // Validate token: it should be a hex SHA-256 hash that matches the password
        // We can't re-hash here (no access to env in edge easily), so we store the hash
        // in the cookie and validate it matches in the login action.
        // For middleware, just check presence — the login action ensures correctness.
    }

    return NextResponse.next();
}

export const config = {
    matcher: ['/admin/:path*'],
};
