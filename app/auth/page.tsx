'use client';

import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

function AuthForm() {
    const searchParams = useSearchParams();
    const errorParam = searchParams.get('error');
    const redirect = searchParams.get('redirect');
    const [pin, setPin] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!pin.trim()) return;
        setIsLoading(true);
        // Navigate to the API route which validates and sets the cookie
        window.location.href = `/api/auth/pin?pin=${encodeURIComponent(pin.trim())}`;
    };

    return (
        <main className="min-h-dvh bg-night flex flex-col justify-center px-4 py-8">
            <div className="w-full max-w-sm mx-auto space-y-6">
                <div className="text-center">
                    <h1 className="text-2xl font-bold text-white">Enter PIN</h1>
                    <p className="text-slate-400 text-sm mt-1">
                        Scan the QR code at your location, or enter the PIN manually.
                    </p>
                </div>

                {errorParam === 'invalid' && (
                    <div className="rounded-lg bg-red-900/30 border border-red-800 px-4 py-3 text-sm text-red-300 text-center">
                        Invalid PIN. Please try again.
                    </div>
                )}

                <form onSubmit={handleSubmit} className="rounded-xl border border-esbee bg-grape p-5 space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-400 mb-1">
                            PIN Code
                        </label>
                        <input
                            type="text"
                            inputMode="numeric"
                            pattern="[0-9]*"
                            maxLength={6}
                            autoFocus
                            placeholder="000000"
                            value={pin}
                            onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
                            className="w-full rounded-lg bg-night border border-esbee text-white text-center text-2xl tracking-[0.5em] font-mono px-4 py-4 placeholder:text-slate-600 placeholder:tracking-[0.5em] focus:border-cerise focus:outline-none"
                        />
                    </div>
                    <button
                        type="submit"
                        disabled={pin.length !== 6 || isLoading}
                        className="w-full rounded-lg bg-cerise py-3.5 text-base font-bold text-white hover:bg-jayouh disabled:opacity-40 active:scale-95 transition-all"
                    >
                        {isLoading ? 'Verifying...' : 'Submit'}
                    </button>
                </form>

                {redirect && (
                    <p className="text-xs text-slate-500 text-center">
                        Trying to access: <span className="font-mono text-slate-400">{redirect}</span>
                    </p>
                )}
            </div>
        </main>
    );
}

export default function AuthPage() {
    return (
        <Suspense fallback={
            <main className="min-h-dvh bg-night flex items-center justify-center">
                <p className="text-slate-400">Loading...</p>
            </main>
        }>
            <AuthForm />
        </Suspense>
    );
}
