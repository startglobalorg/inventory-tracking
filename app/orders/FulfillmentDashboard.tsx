'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
    getOrders,
    updateOrderStatus,
    getOrderForCart,
    type OrderWithDetails,
    type OrderStatus,
} from '@/app/actions/volunteer-orders';

interface FulfillmentDashboardProps {
    initialOrders: OrderWithDetails[];
}

function formatTimeAgo(date: Date): string {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;

    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;

    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
}

function OrderCard({
    order,
    onStatusChange,
    onPrepare,
}: {
    order: OrderWithDetails;
    onStatusChange: (orderId: string, newStatus: OrderStatus) => void;
    onPrepare: (orderId: string) => void;
}) {
    const [isUpdating, setIsUpdating] = useState(false);

    const handleStatusChange = async (newStatus: OrderStatus) => {
        setIsUpdating(true);
        await onStatusChange(order.id, newStatus);
        setIsUpdating(false);
    };

    const statusColors = {
        new: 'bg-yellow-900/50 border-yellow-600',
        in_progress: 'bg-blue-900/50 border-blue-600',
        done: 'bg-green-900/50 border-green-700',
    };

    const statusBadgeColors = {
        new: 'bg-yellow-600',
        in_progress: 'bg-blue-600',
        done: 'bg-green-600',
    };

    const statusLabels = {
        new: 'New',
        in_progress: 'In Progress',
        done: 'Done',
    };

    return (
        <div className={`rounded-xl border p-4 ${statusColors[order.status]} transition-all`}>
            {/* Header */}
            <div className="flex items-start justify-between gap-2 mb-3">
                <div>
                    <h3 className="font-bold text-white">{order.locationName}</h3>
                    <p className="text-xs text-slate-400">{formatTimeAgo(order.createdAt)}</p>
                </div>
                <span className={`rounded-full px-2 py-1 text-xs font-bold text-white ${statusBadgeColors[order.status]}`}>
                    {statusLabels[order.status]}
                </span>
            </div>

            {/* Items */}
            <div className="mb-4 rounded-lg bg-slate-900/50 p-3">
                <ul className="space-y-1">
                    {order.items.map(item => (
                        <li key={item.id} className="flex justify-between text-sm">
                            <span className="text-slate-300">{item.itemName}</span>
                            <span className="font-bold text-white">x{item.quantity}</span>
                        </li>
                    ))}
                </ul>
            </div>

            {/* Actions */}
            <div className="flex flex-wrap gap-2">
                {order.status === 'new' && (
                    <>
                        <button
                            onClick={() => onPrepare(order.id)}
                            className="flex-1 rounded-lg bg-purple-600 px-4 py-2 text-sm font-bold text-white hover:bg-purple-700 active:scale-95 transition-all"
                        >
                            Prepare Order
                        </button>
                        <button
                            onClick={() => handleStatusChange('in_progress')}
                            disabled={isUpdating}
                            className="flex-1 rounded-lg bg-blue-600 px-4 py-2 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-50 active:scale-95 transition-all"
                        >
                            {isUpdating ? '...' : 'Start'}
                        </button>
                    </>
                )}
                {order.status === 'in_progress' && (
                    <>
                        <button
                            onClick={() => onPrepare(order.id)}
                            className="flex-1 rounded-lg bg-purple-600 px-4 py-2 text-sm font-bold text-white hover:bg-purple-700 active:scale-95 transition-all"
                        >
                            Prepare Order
                        </button>
                        <button
                            onClick={() => handleStatusChange('done')}
                            disabled={isUpdating}
                            className="flex-1 rounded-lg bg-green-600 px-4 py-2 text-sm font-bold text-white hover:bg-green-700 disabled:opacity-50 active:scale-95 transition-all"
                        >
                            {isUpdating ? '...' : 'Mark Done'}
                        </button>
                    </>
                )}
                {order.status === 'done' && (
                    <button
                        onClick={() => handleStatusChange('in_progress')}
                        disabled={isUpdating}
                        className="flex-1 rounded-lg bg-slate-600 px-4 py-2 text-sm font-bold text-white hover:bg-slate-500 disabled:opacity-50 active:scale-95 transition-all"
                    >
                        {isUpdating ? '...' : 'Revert to In Progress'}
                    </button>
                )}
            </div>
        </div>
    );
}

export function FulfillmentDashboard({ initialOrders }: FulfillmentDashboardProps) {
    const router = useRouter();
    const [orders, setOrders] = useState<OrderWithDetails[]>(initialOrders);
    const [viewMode, setViewMode] = useState<'kanban' | 'list'>('list');
    const [showDone, setShowDone] = useState(false);

    // Refresh orders periodically
    useEffect(() => {
        const interval = setInterval(async () => {
            const result = await getOrders('all');
            if (result.success && result.data) {
                setOrders(result.data);
            }
        }, 10000); // Refresh every 10 seconds

        return () => clearInterval(interval);
    }, []);

    const handleStatusChange = async (orderId: string, newStatus: OrderStatus) => {
        const result = await updateOrderStatus(orderId, newStatus);
        if (result.success) {
            // Refresh orders
            const ordersResult = await getOrders('all');
            if (ordersResult.success && ordersResult.data) {
                setOrders(ordersResult.data);
            }
        }
    };

    const handlePrepareOrder = async (orderId: string) => {
        const result = await getOrderForCart(orderId);
        if (result.success && result.data) {
            // Encode cart items as URL parameter and redirect to main page
            const cartData = encodeURIComponent(JSON.stringify(result.data));
            router.push(`/?loadCart=${cartData}&orderId=${orderId}`);
        }
    };

    // Group orders by status
    const newOrders = orders.filter(o => o.status === 'new');
    const inProgressOrders = orders.filter(o => o.status === 'in_progress');
    const doneOrders = orders.filter(o => o.status === 'done');

    const activeOrders = [...newOrders, ...inProgressOrders];

    return (
        <div className="pb-8">
            {/* Header */}
            <div className="sticky top-0 z-10 bg-slate-800 border-b border-slate-700 p-4">
                <div className="container mx-auto">
                    <div className="flex items-center justify-between gap-4">
                        <div>
                            <h1 className="text-xl font-bold text-white">
                                Fulfillment Dashboard
                            </h1>
                            <p className="text-sm text-slate-400">
                                {newOrders.length} new, {inProgressOrders.length} in progress
                            </p>
                        </div>
                        <div className="flex gap-2">
                            <Link
                                href="/"
                                className="rounded-lg bg-slate-700 px-4 py-2 text-sm font-medium text-white hover:bg-slate-600"
                            >
                                Inventory
                            </Link>
                        </div>
                    </div>
                </div>
            </div>

            {/* View Toggle */}
            <div className="container mx-auto p-4">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex rounded-lg overflow-hidden border border-slate-700">
                        <button
                            onClick={() => setViewMode('list')}
                            className={`px-4 py-2 text-sm font-medium ${viewMode === 'list'
                                ? 'bg-blue-600 text-white'
                                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                                }`}
                        >
                            List View
                        </button>
                        <button
                            onClick={() => setViewMode('kanban')}
                            className={`px-4 py-2 text-sm font-medium ${viewMode === 'kanban'
                                ? 'bg-blue-600 text-white'
                                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                                }`}
                        >
                            Kanban View
                        </button>
                    </div>
                    <label className="flex items-center gap-2 text-sm text-slate-400">
                        <input
                            type="checkbox"
                            checked={showDone}
                            onChange={(e) => setShowDone(e.target.checked)}
                            className="rounded border-slate-600 bg-slate-800 text-blue-600 focus:ring-blue-500"
                        />
                        Show completed
                    </label>
                </div>

                {orders.length === 0 ? (
                    <div className="rounded-xl bg-slate-800 border border-slate-700 p-8 text-center">
                        <div className="text-4xl mb-4">&#x1F4E6;</div>
                        <h2 className="text-xl font-bold text-white mb-2">No Orders Yet</h2>
                        <p className="text-slate-400">
                            Orders from volunteers will appear here.
                        </p>
                    </div>
                ) : viewMode === 'list' ? (
                    /* List View */
                    <div className="space-y-4">
                        {activeOrders.length === 0 && !showDone ? (
                            <div className="rounded-xl bg-slate-800 border border-slate-700 p-8 text-center">
                                <div className="text-4xl mb-4">&#x2705;</div>
                                <h2 className="text-xl font-bold text-white mb-2">All Caught Up!</h2>
                                <p className="text-slate-400">
                                    No pending orders at the moment.
                                </p>
                            </div>
                        ) : (
                            <>
                                {activeOrders.map(order => (
                                    <OrderCard
                                        key={order.id}
                                        order={order}
                                        onStatusChange={handleStatusChange}
                                        onPrepare={handlePrepareOrder}
                                    />
                                ))}
                                {showDone && doneOrders.length > 0 && (
                                    <>
                                        <div className="border-t border-slate-700 pt-4 mt-6">
                                            <h2 className="text-sm font-bold text-slate-500 uppercase tracking-wide mb-4">
                                                Completed ({doneOrders.length})
                                            </h2>
                                        </div>
                                        {doneOrders.map(order => (
                                            <OrderCard
                                                key={order.id}
                                                order={order}
                                                onStatusChange={handleStatusChange}
                                                onPrepare={handlePrepareOrder}
                                            />
                                        ))}
                                    </>
                                )}
                            </>
                        )}
                    </div>
                ) : (
                    /* Kanban View */
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {/* New Column */}
                        <div className="rounded-xl bg-slate-800/50 border border-slate-700 p-4">
                            <h2 className="text-sm font-bold text-yellow-500 uppercase tracking-wide mb-4 flex items-center gap-2">
                                <span className="w-3 h-3 rounded-full bg-yellow-500"></span>
                                New ({newOrders.length})
                            </h2>
                            <div className="space-y-3">
                                {newOrders.map(order => (
                                    <OrderCard
                                        key={order.id}
                                        order={order}
                                        onStatusChange={handleStatusChange}
                                        onPrepare={handlePrepareOrder}
                                    />
                                ))}
                                {newOrders.length === 0 && (
                                    <p className="text-slate-500 text-sm text-center py-4">
                                        No new orders
                                    </p>
                                )}
                            </div>
                        </div>

                        {/* In Progress Column */}
                        <div className="rounded-xl bg-slate-800/50 border border-slate-700 p-4">
                            <h2 className="text-sm font-bold text-blue-500 uppercase tracking-wide mb-4 flex items-center gap-2">
                                <span className="w-3 h-3 rounded-full bg-blue-500"></span>
                                In Progress ({inProgressOrders.length})
                            </h2>
                            <div className="space-y-3">
                                {inProgressOrders.map(order => (
                                    <OrderCard
                                        key={order.id}
                                        order={order}
                                        onStatusChange={handleStatusChange}
                                        onPrepare={handlePrepareOrder}
                                    />
                                ))}
                                {inProgressOrders.length === 0 && (
                                    <p className="text-slate-500 text-sm text-center py-4">
                                        No orders in progress
                                    </p>
                                )}
                            </div>
                        </div>

                        {/* Done Column */}
                        {showDone && (
                            <div className="rounded-xl bg-slate-800/50 border border-slate-700 p-4">
                                <h2 className="text-sm font-bold text-green-500 uppercase tracking-wide mb-4 flex items-center gap-2">
                                    <span className="w-3 h-3 rounded-full bg-green-500"></span>
                                    Done ({doneOrders.length})
                                </h2>
                                <div className="space-y-3">
                                    {doneOrders.map(order => (
                                        <OrderCard
                                            key={order.id}
                                            order={order}
                                            onStatusChange={handleStatusChange}
                                            onPrepare={handlePrepareOrder}
                                        />
                                    ))}
                                    {doneOrders.length === 0 && (
                                        <p className="text-slate-500 text-sm text-center py-4">
                                            No completed orders
                                        </p>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
