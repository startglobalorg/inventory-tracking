'use client';

import { useState } from 'react';
import Link from 'next/link';
import { deleteRunner, getRunners } from '@/app/actions/runners';
import { deleteLocationHistory } from '@/app/actions/volunteer-orders';
import { adminLogout } from '@/app/actions/admin';
import type { Runner, Location } from '@/db/schema';
import { BrandHeader } from '@/components/BrandHeader';
import { useRouter } from 'next/navigation';

type Tab = 'volunteers' | 'locations';

export function AdminDashboard({
    initialRunners,
    orderCounts,
    initialLocations,
    locationOrderCounts,
}: {
    initialRunners: Runner[];
    orderCounts: Record<string, { open: number; total: number }>;
    initialLocations: Location[];
    locationOrderCounts: Record<string, { open: number; total: number }>;
}) {
    const [activeTab, setActiveTab] = useState<Tab>('volunteers');
    const [runnerList, setRunnerList] = useState(initialRunners);
    const [confirmingId, setConfirmingId] = useState<string | null>(null);
    const [confirmingLocationId, setConfirmingLocationId] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const router = useRouter();

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

    const handleDeleteHistory = async (locationId: string) => {
        setConfirmingLocationId(null);
        const result = await deleteLocationHistory(locationId);
        if (!result.success) {
            setError(result.error || 'Failed to delete history');
        } else {
            router.refresh();
        }
    };

    const handleLogout = async () => {
        await adminLogout();
        router.push('/admin/login');
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
                        <div className="flex-1" />
                        <button
                            onClick={handleLogout}
                            className="text-sm text-slate-400 hover:text-red-400 transition-colors"
                        >
                            Logout
                        </button>
                    </div>
                </div>

                {/* Tab Navigation */}
                <div className="bg-night border-b border-esbee">
                    <div className="container mx-auto max-w-2xl flex">
                        <button
                            onClick={() => setActiveTab('volunteers')}
                            className={`flex-1 py-3 text-sm font-bold text-center transition-colors ${
                                activeTab === 'volunteers'
                                    ? 'text-white border-b-2 border-cerise'
                                    : 'text-slate-400 hover:text-slate-200'
                            }`}
                        >
                            Volunteers
                        </button>
                        <button
                            onClick={() => setActiveTab('locations')}
                            className={`flex-1 py-3 text-sm font-bold text-center transition-colors ${
                                activeTab === 'locations'
                                    ? 'text-white border-b-2 border-cerise'
                                    : 'text-slate-400 hover:text-slate-200'
                            }`}
                        >
                            Locations
                        </button>
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

                {activeTab === 'volunteers' && (
                    <VolunteersView
                        runnerList={runnerList}
                        orderCounts={orderCounts}
                        confirmingId={confirmingId}
                        setConfirmingId={setConfirmingId}
                        handleDelete={handleDelete}
                    />
                )}

                {activeTab === 'locations' && (
                    <LocationsView
                        locations={initialLocations}
                        locationOrderCounts={locationOrderCounts}
                        confirmingLocationId={confirmingLocationId}
                        setConfirmingLocationId={setConfirmingLocationId}
                        handleDeleteHistory={handleDeleteHistory}
                    />
                )}
            </div>
        </div>
    );
}

/* ── Volunteers Tab (unchanged layout) ─────────────────────────── */

function VolunteersView({
    runnerList,
    orderCounts,
    confirmingId,
    setConfirmingId,
    handleDelete,
}: {
    runnerList: Runner[];
    orderCounts: Record<string, { open: number; total: number }>;
    confirmingId: string | null;
    setConfirmingId: (id: string | null) => void;
    handleDelete: (id: string) => void;
}) {
    return (
        <>
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
                                <div className="mt-1 flex items-center gap-3">
                                    <span className="text-xs text-jayouh font-semibold">
                                        {orderCounts[runner.id]?.open ?? 0} open
                                    </span>
                                    <span className="text-xs text-slate-500">·</span>
                                    <span className="text-xs text-slate-400">
                                        {orderCounts[runner.id]?.total ?? 0} total
                                    </span>
                                </div>
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
        </>
    );
}

/* ── Locations Tab ─────────────────────────────────────────────── */

function LocationsView({
    locations,
    locationOrderCounts,
    confirmingLocationId,
    setConfirmingLocationId,
    handleDeleteHistory,
}: {
    locations: Location[];
    locationOrderCounts: Record<string, { open: number; total: number }>;
    confirmingLocationId: string | null;
    setConfirmingLocationId: (id: string | null) => void;
    handleDeleteHistory: (id: string) => void;
}) {
    return (
        <>
            <div className="mb-2 flex items-center justify-between">
                <h2 className="text-lg font-bold text-white">
                    Locations
                    <span className="ml-2 text-sm font-normal text-slate-400">({locations.length})</span>
                </h2>
            </div>

            {locations.length === 0 ? (
                <div className="rounded-xl bg-grape border border-esbee p-8 text-center">
                    <p className="text-slate-400">No locations configured yet.</p>
                </div>
            ) : (
                <div className="space-y-2">
                    {locations.map(location => {
                        const counts = locationOrderCounts[location.id];
                        const doneCount = (counts?.total ?? 0) - (counts?.open ?? 0);

                        return (
                            <div
                                key={location.id}
                                className="flex items-center justify-between gap-4 rounded-xl bg-grape border border-esbee px-4 py-3"
                            >
                                <div className="min-w-0">
                                    <p className="font-bold text-white truncate">{location.name}</p>
                                    <p className="text-xs text-slate-400">
                                        /request/{location.slug}
                                    </p>
                                    <div className="mt-1 flex items-center gap-3">
                                        <span className="text-xs text-jayouh font-semibold">
                                            {counts?.open ?? 0} open
                                        </span>
                                        <span className="text-xs text-slate-500">·</span>
                                        <span className="text-xs text-slate-400">
                                            {counts?.total ?? 0} total
                                        </span>
                                    </div>
                                </div>

                                {confirmingLocationId === location.id ? (
                                    <div className="flex gap-2 shrink-0">
                                        <button
                                            onClick={() => setConfirmingLocationId(null)}
                                            className="rounded-lg border border-esbee bg-night px-3 py-1.5 text-sm text-slate-300 hover:bg-esbee/20 active:scale-95 transition-all"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            onClick={() => handleDeleteHistory(location.id)}
                                            className="rounded-lg bg-red-600 px-3 py-1.5 text-sm font-bold text-white hover:bg-red-700 active:scale-95 transition-all"
                                        >
                                            Confirm
                                        </button>
                                    </div>
                                ) : (
                                    <button
                                        onClick={() => setConfirmingLocationId(location.id)}
                                        disabled={doneCount === 0}
                                        className="shrink-0 rounded-lg border border-red-800/50 bg-red-900/20 px-3 py-1.5 text-sm font-bold text-red-400 hover:bg-red-900/40 active:scale-95 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                                    >
                                        Clear History
                                    </button>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </>
    );
}
