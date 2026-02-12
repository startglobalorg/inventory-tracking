'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { getOrdersByLocation, type OrderWithDetails } from '@/app/actions/volunteer-orders';
import type { Location } from '@/db/schema';

interface LocationOrderHistoryProps {
    location: Location;
    initialOrders: OrderWithDetails[];
}

function formatDate(date: Date): string {
    return new Intl.DateTimeFormat('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    }).format(new Date(date));
}

function formatTimeAgo(date: Date): string {
    const now = new Date();
    const diffMs = now.getTime() - new Date(date).getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;

    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;

    const diffDays = Math.floor(diffHours / 24);
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays}d ago`;

    return formatDate(date);
}

export function LocationOrderHistory({ location, initialOrders }: LocationOrderHistoryProps) {
    const [orders, setOrders] = useState<OrderWithDetails[]>(initialOrders);

    // Refresh orders periodically
    useEffect(() => {
        const interval = setInterval(async () => {
            const result = await getOrdersByLocation(location.id);
            if (result.success && result.data) {
                setOrders(result.data);
            }
        }, 15000); // Refresh every 15 seconds

        return () => clearInterval(interval);
    }, [location.id]);

    const statusColors = {
        new: 'bg-yellow-900/50 border-yellow-600 text-yellow-400',
        in_progress: 'bg-blue-900/50 border-blue-600 text-blue-400',
        done: 'bg-green-900/50 border-green-700 text-green-400',
    };

    const statusLabels = {
        new: 'New',
        in_progress: 'In Progress',
        done: 'Delivered',
    };

    const pendingOrders = orders.filter(o => o.status === 'new' || o.status === 'in_progress');
    const completedOrders = orders.filter(o => o.status === 'done');

    return (
        <div className="pb-8">
            {/* Header */}
            <div className="sticky top-0 z-10 bg-slate-800 border-b border-slate-700 p-4">
                <div className="mx-auto max-w-lg">
                    <Link
                        href={`/request/${location.slug}`}
                        className="inline-flex items-center gap-2 text-blue-400 hover:text-blue-300 mb-3"
                    >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                        </svg>
                        Back to Request
                    </Link>
                    <h1 className="text-xl font-bold text-white">
                        Order History
                    </h1>
                    <p className="text-blue-400 font-medium mt-1">
                        {location.name}
                    </p>
                </div>
            </div>

            {/* Content */}
            <div className="mx-auto max-w-lg p-4">
                {orders.length === 0 ? (
                    <div className="rounded-xl bg-slate-800 border border-slate-700 p-8 text-center">
                        <div className="text-4xl mb-4">&#x1F4E6;</div>
                        <h2 className="text-xl font-bold text-white mb-2">No Orders Yet</h2>
                        <p className="text-slate-400 mb-6">
                            You haven&apos;t made any requests from this location.
                        </p>
                        <Link
                            href={`/request/${location.slug}`}
                            className="inline-block rounded-lg bg-blue-600 px-6 py-3 font-bold text-white hover:bg-blue-700"
                        >
                            Make a Request
                        </Link>
                    </div>
                ) : (
                    <div className="space-y-6">
                        {/* Pending Orders */}
                        {pendingOrders.length > 0 && (
                            <div>
                                <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wide mb-3">
                                    Active Orders ({pendingOrders.length})
                                </h2>
                                <div className="space-y-3">
                                    {pendingOrders.map(order => (
                                        <div
                                            key={order.id}
                                            className="rounded-xl bg-slate-800 border border-slate-700 p-4"
                                        >
                                            <div className="flex items-start justify-between gap-2 mb-3">
                                                <div>
                                                    <p className="text-sm text-slate-400">
                                                        {formatTimeAgo(order.createdAt)}
                                                    </p>
                                                </div>
                                                <span className={`rounded-full px-3 py-1 text-xs font-bold border ${statusColors[order.status]}`}>
                                                    {statusLabels[order.status]}
                                                </span>
                                            </div>
                                            <div className="rounded-lg bg-slate-900/50 p-3">
                                                <ul className="space-y-1">
                                                    {order.items.map(item => (
                                                        <li key={item.id} className="flex justify-between text-sm">
                                                            <span className="text-slate-300">{item.itemName}</span>
                                                            <span className="font-bold text-white">x{item.quantity}</span>
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Completed Orders */}
                        {completedOrders.length > 0 && (
                            <div>
                                <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wide mb-3">
                                    Past Orders ({completedOrders.length})
                                </h2>
                                <div className="space-y-3">
                                    {completedOrders.map(order => (
                                        <div
                                            key={order.id}
                                            className="rounded-xl bg-slate-800 border border-slate-700 p-4 opacity-75"
                                        >
                                            <div className="flex items-start justify-between gap-2 mb-3">
                                                <div>
                                                    <p className="text-sm text-slate-400">
                                                        {formatTimeAgo(order.createdAt)}
                                                    </p>
                                                </div>
                                                <span className={`rounded-full px-3 py-1 text-xs font-bold border ${statusColors[order.status]}`}>
                                                    {statusLabels[order.status]}
                                                </span>
                                            </div>
                                            <div className="rounded-lg bg-slate-900/50 p-3">
                                                <ul className="space-y-1">
                                                    {order.items.map(item => (
                                                        <li key={item.id} className="flex justify-between text-sm">
                                                            <span className="text-slate-300">{item.itemName}</span>
                                                            <span className="font-bold text-white">x{item.quantity}</span>
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
