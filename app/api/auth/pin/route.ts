import { NextRequest, NextResponse } from 'next/server';
import { validatePin } from '@/app/actions/admin';
import { signPinCookie } from '@/lib/pin-auth';

export const dynamic = 'force-dynamic';

const COOKIE_MAX_AGE = 60 * 60 * 24 * 7; // 7 days

/** Build an absolute redirect URL using BASE_URL (public domain) instead of request.url (internal 0.0.0.0). */
function publicUrl(path: string, pToken: string | null): string {
    const base = process.env.BASE_URL || 'http://localhost:3000';
    const url = new URL(path, base);
    if (pToken) url.searchParams.set('p_token', pToken);
    return url.toString();
}

export async function GET(request: NextRequest) {
    const pin = request.nextUrl.searchParams.get('pin');
    const pToken = request.nextUrl.searchParams.get('p_token');

    if (!pin) {
        return redirectToAuth('No PIN provided', pToken);
    }

    const result = await validatePin(pin);
    if (!result) {
        return redirectToAuth('invalid', pToken);
    }

    const expiresAt = Math.floor(Date.now() / 1000) + COOKIE_MAX_AGE;

    if (result.type === 'volunteer') {
        const cookieValue = signPinCookie('volunteer', expiresAt);
        const response = NextResponse.redirect(publicUrl('/volunteer', pToken));
        response.cookies.set('pin_volunteer', cookieValue, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            path: '/',
            maxAge: COOKIE_MAX_AGE,
        });
        if (pToken) {
            response.cookies.set('pangolin_token', pToken, {
                httpOnly: false,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'lax',
                path: '/',
                maxAge: 60 * 60 * 24 * 30,
            });
        }
        return response;
    }

    // Location PIN
    const cookieValue = signPinCookie(result.slug, expiresAt);
    const response = NextResponse.redirect(publicUrl(`/request/${result.slug}`, pToken));
    response.cookies.set(`pin_${result.slug}`, cookieValue, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: COOKIE_MAX_AGE,
    });
    if (pToken) {
        response.cookies.set('pangolin_token', pToken, {
            httpOnly: false,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            path: '/',
            maxAge: 60 * 60 * 24 * 30,
        });
    }
    return response;
}

function redirectToAuth(error: string, pToken: string | null) {
    const url = publicUrl('/auth', pToken);
    const parsed = new URL(url);
    parsed.searchParams.set('error', error);
    return NextResponse.redirect(parsed.toString());
}
