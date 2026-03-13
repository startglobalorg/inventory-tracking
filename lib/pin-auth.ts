import { createHmac } from 'crypto';

/** Sign a cookie value so middleware can verify without DB access. */
export function signPinCookie(identifier: string, expiresAt: number): string {
    const secret = process.env.ADMIN_PASSWORD || 'fallback-secret';
    const payload = `${identifier}:${expiresAt}`;
    const sig = createHmac('sha256', secret).update(payload).digest('hex');
    return `${payload}:${sig}`;
}
