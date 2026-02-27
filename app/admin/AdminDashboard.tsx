'use client';

import { useState } from 'react';
import Link from 'next/link';
import { deleteRunner, getRunners } from '@/app/actions/runners';
import type { Runner } from '@/db/schema';
import { BrandHeader } from '@/components/BrandHeader';

export function AdminDashboard({ initialRunners }: { initialRunners: Runner[] }) {
    const [runnerList, setRunnerList] = useState(initialRunners);
    const [confirmingId, setConfirmingId] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const handleDelete = async (runnerId: string) => {
        const prev = runnerList;
        setRunnerList(p => p.filter(r => r.id !== runnerId));
        setConfirmingId(null);

        const result = await deleteRunner(runnerId);
        if (!result.success) {
            setRunnerList(prev);
            setError(result.error || 'Failed to delete volunteer');
        } else {
            // Re-sync in case other changes happened
            const refreshed = await getRunners();
            if (refreshed.success && refreshed.data) setRunnerList(refreshed.data);
        }
    };

    return (
        <div className="min-h-screen bg-night">
            {/* Header */}
            <div className="sticky top-0 z-10">
                <BrandHeader title="Admin" subtitle="Coordinator Dashboard" />
                <div className="bg-grape border-b border-esbee px-4 py-2">
                    <div className="container mx-auto flex items-center gap-4">
                        <Link
                            href="/"
                            className="text-sm text-slate-400 hover:text-white transition-colors"
                        >
                            ← Inventory
                        </Link>
                        <Link
                            href="/orders"
                            className="text-sm text-slate-400 hover:text-white transition-colors"
                        >
                            Orders
                        </Link>
                    </div>
                </div>
            </div>

            <div className="container mx-auto p-4 max-w-2xl">
                {error && (
                    <div className="mb-4 flex items-center justify-between rounded-lg bg-red-900/50 border border-red-700 p-4 text-red-200">
                        <span>{error}</span>
                        <button
                            onClick={() => setError(null)}
                            className="ml-4 shrink-0 text-red-400 hover:text-red-200"
                        >
                            ✕
                        </button>
                    </div>
                )}

                {/* Volunteers section */}
                <div className="mb-2 flex items-center justify-between">
                    <h2 className="text-lg font-bold text-white">
                        Volunteers
                        <span className="ml-2 text-sm font-normal text-slate-400">({runnerList.length})</span>
                    </h2>
                </div>

                {runnerList.length === 0 ? (
                    <div className="rounded-xl bg-grape border border-esbee p-8 text-center">
                        <p className="text-slate-400">No volunteers registered yet.</p>
                    </div>
                ) : (
                    <div className="space-y-2">
                        {runnerList.map(runner => (
                            <div
                                key={runner.id}
                                className="flex items-center justify-between gap-4 rounded-xl bg-grape border border-esbee px-4 py-3"
                            >
                                <div className="min-w-0">
                                    <p className="font-bold text-white truncate">{runner.name}</p>
                                    <p className="text-xs text-slate-400">
                                        Registered {runner.createdAt.toLocaleDateString()}
                                    </p>
                                </div>

                                {confirmingId === runner.id ? (
                                    <div className="flex gap-2 shrink-0">
                                        <button
                                            onClick={() => setConfirmingId(null)}
                                            className="rounded-lg border border-esbee bg-night px-3 py-1.5 text-sm text-slate-300 hover:bg-esbee/20 active:scale-95 transition-all"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            onClick={() => handleDelete(runner.id)}
                                            className="rounded-lg bg-red-600 px-3 py-1.5 text-sm font-bold text-white hover:bg-red-700 active:scale-95 transition-all"
                                        >
                                            Confirm
                                        </button>
                                    </div>
                                ) : (
                                    <button
                                        onClick={() => setConfirmingId(runner.id)}
                                        className="shrink-0 rounded-lg border border-red-800/50 bg-red-900/20 px-3 py-1.5 text-sm font-bold text-red-400 hover:bg-red-900/40 active:scale-95 transition-all"
                                    >
                                        Remove
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
