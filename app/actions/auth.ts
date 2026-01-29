'use server';

import { cookies } from 'next/headers';

export async function login(password: string) {
    const correctPassword = process.env.SITE_PASSWORD || 'START123!';

    if (password === correctPassword) {
        (await cookies()).set('auth', password, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 60 * 60 * 24 * 7, // 1 week
            path: '/',
        });
        return { success: true };
    }

    return { success: false };
}

export async function logout() {
    (await cookies()).delete('auth');
    return { success: true };
}
