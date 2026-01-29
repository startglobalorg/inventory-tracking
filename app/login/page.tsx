'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const router = useRouter();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');

        try {
            const { login } = await import('@/app/actions/auth');
            const result = await login(password);

            if (result.success) {
                router.refresh(); // Update the router cache
                router.replace('/'); // Use replace to prevent back navigation loop
            } else {
                setError('Incorrect password');
            }
        } catch (err) {
            setError('An error occurred');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex min-h-screen items-center justify-center bg-slate-950 p-4">
            <div className="w-full max-w-sm rounded-2xl bg-slate-900 border border-slate-800 p-8 shadow-2xl">
                <div className="mb-6 text-center">
                    <h1 className="text-2xl font-bold text-white">Inventory Access</h1>
                    <p className="text-slate-400 mt-2">Please enter the password to continue</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full rounded-lg bg-slate-800 border-slate-700 text-white px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent text-center text-lg tracking-widest placeholder-slate-600"
                            placeholder="••••••••"
                            autoFocus
                        />
                    </div>

                    {error && (
                        <div className="text-center text-sm font-medium text-red-500 animate-pulse">
                            {error}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full rounded-lg bg-blue-600 py-3 font-bold text-white transition-all hover:bg-blue-700 disabled:opacity-50 active:scale-95"
                    >
                        {isLoading ? 'Verifying...' : 'Enter App'}
                    </button>
                </form>
            </div>
        </div>
    );
}
