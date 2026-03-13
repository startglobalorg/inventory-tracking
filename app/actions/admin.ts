'use server';

import { cookies } from 'next/headers';
import { createHash, randomInt } from 'crypto';
import { db } from '@/db/db';
import { locations } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';

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

// ── PIN management ─────────────────────────────────────────────

function generatePin(): string {
    return randomInt(100000, 999999).toString();
}

/** Generate unique 6-digit PINs for all locations that don't have one yet. */
export async function generateLocationPins() {
    try {
        const allLocations = await db.select().from(locations);
        const existingPins = new Set(allLocations.map(l => l.accessPin).filter(Boolean));

        let generated = 0;
        for (const loc of allLocations) {
            if (loc.accessPin) continue;

            let pin: string;
            do { pin = generatePin(); } while (existingPins.has(pin));

            await db.update(locations).set({ accessPin: pin }).where(eq(locations.id, loc.id));
            existingPins.add(pin);
            generated++;
        }

        // Also ensure VOLUNTEER_PIN env is echoed back for awareness
        revalidatePath('/admin');
        return { success: true, generated };
    } catch (error) {
        console.error('Error generating PINs:', error);
        return { success: false, error: 'Failed to generate PINs' };
    }
}

/** Look up a PIN — returns the slug/path to redirect to, or null. */
export async function validatePin(pin: string): Promise<{ type: 'location'; slug: string } | { type: 'volunteer' } | null> {
    // Check volunteer PIN first
    if (process.env.VOLUNTEER_PIN && pin === process.env.VOLUNTEER_PIN) {
        return { type: 'volunteer' };
    }

    // Check location PINs
    const result = await db
        .select({ slug: locations.slug })
        .from(locations)
        .where(eq(locations.accessPin, pin))
        .limit(1);

    if (result.length > 0) {
        return { type: 'location', slug: result[0].slug };
    }

    return null;
}

