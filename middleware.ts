import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
    const customPassword = process.env.SITE_PASSWORD || 'START123!';
    const authCookie = request.cookies.get('auth');

    // If trying to access login page
    if (request.nextUrl.pathname === '/login') {
        // If already logged in, redirect to home
        if (authCookie?.value === customPassword) {
            return NextResponse.redirect(new URL('/', request.url));
        }
        return NextResponse.next();
    }

    // Protect all other routes
    if (authCookie?.value !== customPassword) {
        const loginUrl = new URL('/login', request.url);
        return NextResponse.redirect(loginUrl);
    }

    return NextResponse.next();
}

export const config = {
    matcher: [
        /*
         * Match all request paths except for the ones starting with:
         * - api (API routes)
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         */
        '/((?!api|_next/static|_next/image|favicon.ico).*)',
    ],
};
