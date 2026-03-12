'use server';

import { cookies } from 'next/headers';
import { createHash } from 'crypto';

function hashPassword(password: string): string {
    return createHash('sha256').update(password).digest('hex');
}

export async function adminLogin(password: string) {
    const adminPassword = process.env.ADMIN_PASSWORD;

    if (!adminPassword) {
        console.error('ADMIN_PASSWORD environment variable is not set');
        return { success: false, error: 'Admin authentication is not configured' };
    }

    if (password !== adminPassword) {
        return { success: false, error: 'Invalid password' };
    }

    // Set a secure HttpOnly cookie with a hash of the password
    const token = hashPassword(adminPassword);
    const cookieStore = await cookies();
    cookieStore.set('admin_token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 60 * 60 * 24 * 7, // 7 days
    });

    return { success: true };
}

export async function adminLogout() {
    const cookieStore = await cookies();
    cookieStore.delete('admin_token');
    return { success: true };
}

export async function validateAdminSession(): Promise<boolean> {
    const adminPassword = process.env.ADMIN_PASSWORD;
    if (!adminPassword) return false;

    const cookieStore = await cookies();
    const token = cookieStore.get('admin_token')?.value;
    if (!token) return false;

    return token === hashPassword(adminPassword);
}
