import { NextRequest, NextResponse } from 'next/server';
import { validatePin } from '@/app/actions/admin';
import { signPinCookie } from '@/lib/pin-auth';

export const dynamic = 'force-dynamic';

const COOKIE_MAX_AGE = 60 * 60 * 24 * 7; // 7 days

export async function GET(request: NextRequest) {
    const pin = request.nextUrl.searchParams.get('pin');

    if (!pin) {
        return redirectToAuth(request, 'No PIN provided');
    }

    const result = await validatePin(pin);
    if (!result) {
        return redirectToAuth(request, 'invalid');
    }

    const expiresAt = Math.floor(Date.now() / 1000) + COOKIE_MAX_AGE;

    if (result.type === 'volunteer') {
        const cookieValue = signPinCookie('volunteer', expiresAt);
        const target = new URL('/volunteer', request.url);
        const response = NextResponse.redirect(target);
        response.cookies.set('pin_volunteer', cookieValue, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            path: '/',
            maxAge: COOKIE_MAX_AGE,
        });
        return response;
    }

    // Location PIN
    const cookieValue = signPinCookie(result.slug, expiresAt);
    const target = new URL(`/request/${result.slug}`, request.url);
    const response = NextResponse.redirect(target);
    response.cookies.set(`pin_${result.slug}`, cookieValue, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: COOKIE_MAX_AGE,
    });
    return response;
}

function redirectToAuth(request: NextRequest, error: string) {
    const authUrl = new URL('/auth', request.url);
    authUrl.searchParams.set('error', error);
    return NextResponse.redirect(authUrl);
}
