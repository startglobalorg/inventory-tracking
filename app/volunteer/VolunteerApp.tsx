'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
    setRunnerCookie,
    clearRunnerCookie,
    createRunner,
    claimOrder,
    getUnassignedOrders,
    getRunnerOrders,
    completeVolunteerOrder,
} from '@/app/actions/runners';
import type { Runner } from '@/db/schema';
import type { OrderWithDetails } from '@/app/actions/volunteer-orders';

interface VolunteerAppProps {
    runners: Runner[];
    currentRunner: Runner | null;
    unassigned: OrderWithDetails[];
    myOrders: OrderWithDetails[];
}

function formatTimeAgo(date: Date): string {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${Math.floor(diffHours / 24)}d ago`;
}

function OrderCard({
    order,
    action,
}: {
    order: OrderWithDetails;
    action: React.ReactNode;
}) {
    return (
        <div className="rounded-xl border border-esbee bg-grape p-4">
            <div className="flex items-start justify-between gap-2 mb-2">
                <div className="min-w-0">
                    <p className="font-bold text-white truncate">{order.locationName}</p>
                    <p className="text-xs text-slate-400">{formatTimeAgo(order.createdAt)}</p>
                </div>
                <span className={`rounded-full px-2 py-1 text-xs font-bold shrink-0 ${
                    order.status === 'new'
                        ? 'bg-jayouh/20 text-jayouh'
                        : 'bg-esbee/30 text-cerise'
                }`}>
                    {order.status === 'new' ? 'New' : 'In Progress'}
                </span>
            </div>
            <div className="mb-3 rounded-lg bg-night/50 p-3">
                {order.customRequest ? (
                    <p className="text-sm text-slate-200 whitespace-pre-wrap">{order.customRequest}</p>
                ) : (
                    <ul className="space-y-1.5">
                        {order.items.map(item => (
                            <li key={item.id} className="flex justify-between gap-3 text-sm">
                                <span className="text-slate-300 min-w-0 truncate">{item.itemName}</span>
                                <span className="font-bold text-white shrink-0">×{item.quantity}</span>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
            {action}
        </div>
    );
}

export function VolunteerApp({ runners, currentRunner, unassigned, myOrders }: VolunteerAppProps) {
    const router = useRouter();

    // Login state
    const [selectedRunnerId, setSelectedRunnerId] = useState('');
    const [newName, setNewName] = useState('');
    const [loginError, setLoginError] = useState('');
    const [isCreating, setIsCreating] = useState(false);
    const [isLoggingIn, setIsLoggingIn] = useState(false);

    // Dashboard state
    const [unassignedOrders, setUnassignedOrders] = useState<OrderWithDetails[]>(unassigned);
    const [myOrdersList, setMyOrdersList] = useState<OrderWithDetails[]>(myOrders);
    const [view, setView] = useState<'mine' | 'available'>('mine');
    const [confirmingId, setConfirmingId] = useState<string | null>(null);
    const [claimingId, setClaimingId] = useState<string | null>(null);
    const [doneError, setDoneError] = useState<string | null>(null);

    // Live polling — call server actions directly, no page reload
    useEffect(() => {
        if (!currentRunner) return;
        const poll = async () => {
            const [unRes, myRes] = await Promise.all([
                getUnassignedOrders(),
                getRunnerOrders(currentRunner.id),
            ]);
            if (unRes.data) setUnassignedOrders(unRes.data);
            if (myRes.data) setMyOrdersList(myRes.data);
        };
        const interval = setInterval(poll, 8000);
        return () => clearInterval(interval);
    }, [currentRunner]);

    // Clear confirmingId if the order disappears (e.g. claimed by someone else)
    useEffect(() => {
        if (confirmingId && !myOrdersList.find(o => o.id === confirmingId)) {
            setConfirmingId(null);
        }
    }, [myOrdersList, confirmingId]);

    const handleSelectLogin = async () => {
        if (!selectedRunnerId) return;
        setIsLoggingIn(true);
        await setRunnerCookie(selectedRunnerId);
        router.refresh();
    };

    const handleCreateVolunteer = async () => {
        if (!newName.trim()) return;
        setIsCreating(true);
        setLoginError('');
        const result = await createRunner(newName.trim());
        if (!result.success) {
            setLoginError(result.error || 'Failed to register');
            setIsCreating(false);
            return;
        }
        router.refresh();
    };

    const handleSwitch = async () => {
        await clearRunnerCookie();
        router.refresh();
    };

    const handleClaim = async (orderId: string) => {
        if (!currentRunner) return;
        const order = unassignedOrders.find(o => o.id === orderId);
        if (!order) return;

        setClaimingId(null);

        // Optimistic update
        setUnassignedOrders(prev => prev.filter(o => o.id !== orderId));
        setMyOrdersList(prev => [
            { ...order, runnerId: currentRunner.id, runnerName: currentRunner.name, status: 'in_progress' },
            ...prev,
        ]);
        setView('mine');

        const result = await claimOrder(orderId, currentRunner.id);
        if (!result.success) {
            setUnassignedOrders(prev => [...prev, order]);
            setMyOrdersList(prev => prev.filter(o => o.id !== orderId));
        }
    };

    const handleMarkDone = async (orderId: string) => {
        setDoneError(null);
        const order = myOrdersList.find(o => o.id === orderId);
        setMyOrdersList(prev => prev.filter(o => o.id !== orderId));
        setConfirmingId(null);

        const result = await completeVolunteerOrder(orderId, currentRunner?.name ?? 'Volunteer');
        if (!result.success) {
            if (order) setMyOrdersList(prev => [order, ...prev]);
            setDoneError(result.error ?? 'Failed to complete order');
        }
    };

    // ---- Login View ----
    if (!currentRunner) {
        return (
            // min-h-dvh: 100vh fallback + 100dvh override (accounts for mobile browser chrome)
            <main className="min-h-dvh bg-night flex flex-col justify-center px-4 py-8">
                <div className="w-full max-w-sm mx-auto space-y-5">
                    <div className="text-center mb-2">
                        <h1 className="text-2xl font-bold text-white">Volunteer Login</h1>
                        <p className="text-slate-400 text-sm mt-1">Select your name or register as a new volunteer</p>
                    </div>

                    {/* Select existing volunteer */}
                    {runners.length > 0 && (
                        <div className="rounded-xl border border-esbee bg-grape p-4 space-y-3">
                            <p className="text-sm font-bold text-white">I&apos;m an existing volunteer</p>
                            <select
                                value={selectedRunnerId}
                                onChange={(e) => setSelectedRunnerId(e.target.value)}
                                // text-base prevents iOS from zooming in on focus (iOS zooms on font-size < 16px)
                                className="w-full rounded-lg bg-night border border-esbee text-white text-base px-3 py-3 focus:border-cerise focus:outline-none"
                            >
                                <option value="">Select your name…</option>
                                {runners.map(r => (
                                    <option key={r.id} value={r.id}>{r.name}</option>
                                ))}
                            </select>
                            <button
                                onClick={handleSelectLogin}
                                disabled={!selectedRunnerId || isLoggingIn}
                                className="w-full rounded-lg bg-cerise py-3.5 text-base font-bold text-white hover:bg-jayouh disabled:opacity-40 active:scale-95 transition-all"
                            >
                                {isLoggingIn ? 'Logging in…' : 'Continue'}
                            </button>
                        </div>
                    )}

                    {/* Register new volunteer */}
                    <div className="rounded-xl border border-esbee bg-grape p-4 space-y-3">
                        <p className="text-sm font-bold text-white">Register as a new volunteer</p>
                        <input
                            type="text"
                            autoComplete="name"
                            autoCapitalize="words"
                            placeholder="Your name"
                            value={newName}
                            onChange={(e) => setNewName(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleCreateVolunteer()}
                            // text-base prevents iOS auto-zoom on input focus
                            className="w-full rounded-lg bg-night border border-esbee text-white text-base px-3 py-3 placeholder-slate-500 focus:border-cerise focus:outline-none"
                        />
                        {loginError && (
                            <p className="text-sm text-red-400">{loginError}</p>
                        )}
                        <button
                            onClick={handleCreateVolunteer}
                            disabled={!newName.trim() || isCreating}
                            className="w-full rounded-lg bg-violet-accent py-3.5 text-base font-bold text-white hover:bg-violet-accent/80 disabled:opacity-40 active:scale-95 transition-all"
                        >
                            {isCreating ? 'Registering…' : 'Register'}
                        </button>
                    </div>

                    {/* Bottom padding for iOS home bar */}
                    <div className="h-[env(safe-area-inset-bottom)]" />
                </div>
            </main>
        );
    }

    // ---- Dashboard View ----
    return (
        <main className="min-h-dvh bg-night flex flex-col">
            {/* Claim confirmation modal */}
            {claimingId && (
                <div className="fixed inset-0 z-50 flex items-center justify-center px-6">
                    <div className="absolute inset-0 bg-black/70" onClick={() => setClaimingId(null)} />
                    <div className="relative w-full max-w-sm rounded-2xl border border-esbee bg-grape p-6 shadow-xl space-y-5">
                        <p className="text-base font-bold text-white text-center">Claim this order?</p>
                        <p className="text-sm text-slate-300 text-center">Are you sure you want to claim this order? This action can not be undone.</p>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setClaimingId(null)}
                                className="flex-1 rounded-xl border border-esbee bg-night py-3.5 text-sm font-bold text-slate-300 hover:bg-esbee/20 active:scale-95 transition-all"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => handleClaim(claimingId)}
                                className="flex-1 rounded-xl bg-violet-accent py-3.5 text-sm font-bold text-white hover:bg-violet-accent/80 active:scale-95 transition-all"
                            >
                                Confirm
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {/* Sticky header — accounts for iOS notch with pt-safe if needed */}
            <div className="sticky top-0 z-10 border-b border-esbee bg-grape px-4 py-3">
                <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                        <p className="text-xs text-slate-400">Logged in as</p>
                        <p className="font-bold text-white truncate">{currentRunner.name}</p>
                    </div>
                    <button
                        onClick={handleSwitch}
                        className="shrink-0 rounded-lg border border-esbee bg-night px-3 py-2 text-sm font-medium text-slate-300 hover:bg-esbee/30 active:scale-95 transition-all"
                    >
                        Switch
                    </button>
                </div>
            </div>

            {view === 'mine' ? (
                /* ---- My Orders view ---- */
                // pb accounts for iOS home bar (safe-area-inset-bottom) plus regular spacing
                <div className="px-4 pt-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] space-y-4 max-w-lg mx-auto w-full">
                    {doneError && (
                        <div className="rounded-lg border border-red-500/50 bg-red-500/10 px-4 py-3 text-sm text-red-400 flex items-start justify-between gap-2">
                            <span>{doneError}</span>
                            <button
                                onClick={() => setDoneError(null)}
                                className="shrink-0 text-red-400/60 hover:text-red-400 text-lg leading-none"
                            >
                                ✕
                            </button>
                        </div>
                    )}

                    {/* Section header */}
                    <div className="flex items-center justify-between gap-2">
                        <h2 className="text-lg font-bold text-white flex items-center gap-2">
                            My Orders
                            {myOrdersList.length > 0 && (
                                <span className="rounded-full bg-cerise px-2 py-0.5 text-xs font-bold text-white">
                                    {myOrdersList.length}
                                </span>
                            )}
                        </h2>
                        {/* Available button — always shown so volunteers know it exists */}
                        <button
                            onClick={() => setView('available')}
                            className="flex items-center gap-1.5 rounded-lg border border-jayouh/50 bg-jayouh/10 px-3 py-2 text-sm font-semibold text-jayouh hover:bg-jayouh/20 active:scale-95 transition-all"
                        >
                            Available
                            {unassignedOrders.length > 0 && (
                                <span className="rounded-full bg-jayouh px-1.5 py-0.5 text-xs font-bold text-white leading-none">
                                    {unassignedOrders.length}
                                </span>
                            )}
                        </button>
                    </div>

                    {myOrdersList.length === 0 ? (
                        <div className="rounded-xl border border-esbee bg-grape px-4 py-10 text-center space-y-4">
                            <p className="text-slate-300 font-medium">No orders assigned to you yet</p>
                            <button
                                onClick={() => setView('available')}
                                className="rounded-lg bg-violet-accent px-5 py-3 text-sm font-bold text-white hover:bg-violet-accent/80 active:scale-95 transition-all"
                            >
                                Find available orders
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {myOrdersList.map(order => (
                                <OrderCard
                                    key={order.id}
                                    order={order}
                                    action={
                                        confirmingId === order.id ? (
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => setConfirmingId(null)}
                                                    className="flex-1 rounded-lg border border-esbee bg-night py-3.5 text-sm font-bold text-slate-300 hover:bg-esbee/20 active:scale-95 transition-all"
                                                >
                                                    Cancel
                                                </button>
                                                <button
                                                    onClick={() => handleMarkDone(order.id)}
                                                    className="flex-1 rounded-lg bg-green-600 py-3.5 text-sm font-bold text-white hover:bg-green-700 active:scale-95 transition-all"
                                                >
                                                    Confirm Done
                                                </button>
                                            </div>
                                        ) : (
                                            <button
                                                onClick={() => setConfirmingId(order.id)}
                                                className="w-full rounded-lg bg-green-600 py-3.5 text-sm font-bold text-white hover:bg-green-700 active:scale-95 transition-all"
                                            >
                                                Mark Done
                                            </button>
                                        )
                                    }
                                />
                            ))}
                        </div>
                    )}
                </div>
            ) : (
                /* ---- Available Orders view ---- */
                <div className="px-4 pt-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] space-y-4 max-w-lg mx-auto w-full">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => setView('mine')}
                            className="shrink-0 rounded-lg border border-esbee bg-night px-3 py-2 text-sm font-medium text-slate-300 hover:bg-esbee/20 active:scale-95 transition-all"
                        >
                            ← My Orders
                        </button>
                        <h2 className="text-lg font-bold text-white flex items-center gap-2 min-w-0">
                            <span className="truncate">Available</span>
                            {unassignedOrders.length > 0 && (
                                <span className="rounded-full bg-jayouh px-2 py-0.5 text-xs font-bold text-white shrink-0">
                                    {unassignedOrders.length}
                                </span>
                            )}
                        </h2>
                    </div>

                    {unassignedOrders.length === 0 ? (
                        <div className="rounded-xl border border-esbee bg-grape px-4 py-10 text-center">
                            <p className="text-slate-300 font-medium">No available orders right now</p>
                            <p className="text-slate-400 text-sm mt-1">Check back soon — this refreshes automatically</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {unassignedOrders.map(order => (
                                <OrderCard
                                    key={order.id}
                                    order={order}
                                    action={
                                        <button
                                            onClick={() => setClaimingId(order.id)}
                                            className="w-full rounded-lg bg-violet-accent py-3.5 text-sm font-bold text-white hover:bg-violet-accent/80 active:scale-95 transition-all"
                                        >
                                            Claim Order
                                        </button>
                                    }
                                />
                            ))}
                        </div>
                    )}
                </div>
            )}
        </main>
    );
}
