'use client';

import { useEffect } from 'react';

function getCookie(name: string): string | null {
    const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
    return match ? decodeURIComponent(match[2]) : null;
}

/**
 * Patches window.fetch to append ?p_token= to all same-origin requests,
 * so Pangolin authenticates every request (RSC navigations, server actions, etc.).
 */
export function PangolinAuthProvider() {
    useEffect(() => {
        const token = getCookie('pangolin_token');
        if (!token) return;

        const originalFetch = window.fetch;
        window.fetch = function (input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
            try {
                let url: URL;
                if (input instanceof Request) {
                    url = new URL(input.url);
                } else if (input instanceof URL) {
                    url = new URL(input.toString());
                } else {
                    url = new URL(input, window.location.origin);
                }

                // Only add to same-origin requests that don't already have it
                if (url.origin === window.location.origin && !url.searchParams.has('p_token')) {
                    url.searchParams.set('p_token', token);
                    if (input instanceof Request) {
                        input = new Request(url.toString(), input);
                    } else {
                        input = url.toString();
                    }
                }
            } catch {
                // If URL parsing fails, pass through unchanged
            }

            return originalFetch.call(window, input, init);
        };

        return () => {
            window.fetch = originalFetch;
        };
    }, []);

    return null;
}
