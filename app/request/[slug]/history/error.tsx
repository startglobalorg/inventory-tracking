'use client';

import { useEffect } from 'react';
import Link from 'next/link';

export default function HistoryError({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        console.error('Order history page error:', error);
    }, [error]);

    return (
        <main className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
            <div className="mx-auto max-w-lg w-full">
                <div className="rounded-xl bg-slate-800 border border-slate-700 p-8 text-center">
                    <div className="mb-4 text-5xl">&#x26A0;&#xFE0F;</div>
                    <h1 className="text-xl font-bold text-white mb-2">
                        Something went wrong
                    </h1>
                    <p className="text-slate-400 mb-6 text-sm">
                        We couldn&apos;t load your order history. Please try again.
                    </p>
                    <div className="flex flex-col gap-3">
                        <button
                            onClick={reset}
                            className="rounded-lg bg-blue-600 px-6 py-3 font-bold text-white hover:bg-blue-700 min-h-[44px]"
                        >
                            Try Again
                        </button>
                        <Link
                            href=".."
                            className="rounded-lg border border-slate-600 px-6 py-3 font-semibold text-slate-300 hover:bg-slate-700 min-h-[44px] flex items-center justify-center"
                        >
                            Back to Request
                        </Link>
                    </div>
                </div>
            </div>
        </main>
    );
}
