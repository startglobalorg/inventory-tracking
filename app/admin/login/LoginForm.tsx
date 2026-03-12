'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { adminLogin } from '@/app/actions/admin';

export function LoginForm() {
    const [password, setPassword] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setLoading(true);

        try {
            const result = await adminLogin(password);
            if (result.success) {
                router.push('/admin');
            } else {
                setError(result.error || 'Login failed');
            }
        } catch {
            setError('An unexpected error occurred');
        } finally {
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div>
                <input
                    type="password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="Password"
                    className="w-full rounded-xl bg-grape border border-esbee px-4 py-3 text-white placeholder:text-slate-500 focus:outline-none focus:border-purple-500 transition-colors"
                    autoFocus
                    required
                />
            </div>

            {error && (
                <div className="rounded-lg bg-red-900/50 border border-red-700 px-4 py-3 text-sm text-red-200">
                    {error}
                </div>
            )}

            <button
                type="submit"
                disabled={loading || !password}
                className="w-full rounded-xl bg-cerise px-4 py-3 font-bold text-white hover:bg-cerise/90 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98] transition-all"
            >
                {loading ? 'Logging in...' : 'Log In'}
            </button>
        </form>
    );
}
