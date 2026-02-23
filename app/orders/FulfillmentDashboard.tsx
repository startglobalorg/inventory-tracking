'use client';

import { useState, useEffect, DragEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
    getOrders,
    updateOrderStatus,
    getOrderForCart,
    deleteOrder,
    type OrderWithDetails,
    type OrderStatus,
} from '@/app/actions/volunteer-orders';
import { assignOrder } from '@/app/actions/runners';
import type { Runner } from '@/db/schema';

interface FulfillmentDashboardProps {
    initialOrders: OrderWithDetails[];
    runners: Runner[];
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
    runners,
    onStatusChange,
    onAssign,
    onPrepare,
    onDelete,
    isDragging,
    onDragStart,
    onDragEnd,
}: {
    order: OrderWithDetails;
    runners: Runner[];
    onStatusChange: (orderId: string, newStatus: OrderStatus) => void;
    onAssign: (orderId: string, runnerId: string | null) => void;
    onPrepare: (orderId: string) => void;
    onDelete: (orderId: string) => void;
    isDragging?: boolean;
    onDragStart?: (e: DragEvent<HTMLDivElement>, orderId: string) => void;
    onDragEnd?: () => void;
}) {
    const [isUpdating, setIsUpdating] = useState(false);
    const [confirmDelete, setConfirmDelete] = useState(false);

    const handleStatusChange = async (newStatus: OrderStatus) => {
        setIsUpdating(true);
        await onStatusChange(order.id, newStatus);
        setIsUpdating(false);
    };

    const handleDragStart = (e: DragEvent<HTMLDivElement>) => {
        if (onDragStart) {
            onDragStart(e, order.id);
        }
    };

    const statusColors = {
        new: 'bg-jayouh/10 border-jayouh/50',
        in_progress: 'bg-esbee/20 border-esbee',
        done: 'bg-grape border-grape',
    };

    const statusBadgeColors = {
        new: 'bg-jayouh/20 text-jayouh',
        in_progress: 'bg-esbee/30 text-cerise',
        done: 'bg-neutral-700 text-white',
    };

    const statusLabels = {
        new: 'New',
        in_progress: 'In Progress',
        done: 'Done',
    };

    return (
        <div
            draggable
            onDragStart={handleDragStart}
            onDragEnd={onDragEnd}
            className={`rounded-xl border p-4 ${statusColors[order.status]} transition-all cursor-grab active:cursor-grabbing ${isDragging ? 'opacity-50 scale-95' : ''}`}
        >
            {/* Header */}
            <div className="flex items-start justify-between gap-2 mb-3">
                <div>
                    <h3 className="font-bold text-white">{order.locationName}</h3>
                    <p className="text-xs text-slate-400">
                        Ordered {formatTimeAgo(order.createdAt)}
                    </p>
                    {order.status === 'done' && order.completedAt && (
                        <p className="text-xs text-slate-400">
                            Completed {formatTimeAgo(order.completedAt)}
                        </p>
                    )}
                </div>
                <span className={`rounded-full px-2 py-1 text-xs font-bold shrink-0 ${statusBadgeColors[order.status]}`}>
                    {statusLabels[order.status]}
                </span>
            </div>

            {/* Items */}
            <div className="mb-3 rounded-lg bg-night/50 p-3">
                <ul className="space-y-1">
                    {order.items.map(item => (
                        <li key={item.id} className="flex justify-between text-sm">
                            <span className="text-slate-300">{item.itemName}</span>
                            <span className="font-bold text-white">x{item.quantity}</span>
                        </li>
                    ))}
                </ul>
            </div>

            {/* Runner assignment */}
            {order.status !== 'done' ? (
                <div className="mb-3">
                    <select
                        value={order.runnerId ?? ''}
                        onChange={(e) => onAssign(order.id, e.target.value || null)}
                        className="w-full rounded-lg bg-night border border-esbee text-white text-sm px-3 py-2 focus:border-cerise focus:outline-none"
                    >
                        <option value="">Unassigned</option>
                        {runners.map(r => (
                            <option key={r.id} value={r.id}>{r.name}</option>
                        ))}
                    </select>
                </div>
            ) : order.runnerName ? (
                <div className="mb-3">
                    <span className="inline-flex items-center gap-1 rounded-full bg-esbee/20 border border-esbee px-3 py-1 text-xs text-slate-300">
                        Volunteer: <span className="font-bold text-white">{order.runnerName}</span>
                    </span>
                </div>
            ) : null}

            {/* Actions */}
            <div className="flex flex-wrap gap-2">
                {order.status === 'new' && (
                    <>
                        <button
                            onClick={() => onPrepare(order.id)}
                            className="flex-1 rounded-lg bg-violet-accent px-4 py-2 text-sm font-bold text-white hover:bg-violet-accent/80 active:scale-95 transition-all"
                        >
                            Prepare Order
                        </button>
                        <button
                            onClick={() => handleStatusChange('in_progress')}
                            disabled={isUpdating}
                            className="flex-1 rounded-lg bg-cerise px-4 py-2 text-sm font-bold text-white hover:bg-jayouh disabled:opacity-50 active:scale-95 transition-all"
                        >
                            {isUpdating ? '...' : 'Start'}
                        </button>
                    </>
                )}
                {order.status === 'in_progress' && (
                    <>
                        <button
                            onClick={() => onPrepare(order.id)}
                            className="flex-1 rounded-lg bg-violet-accent px-4 py-2 text-sm font-bold text-white hover:bg-violet-accent/80 active:scale-95 transition-all"
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
                        className="flex-1 rounded-lg bg-grape border border-esbee px-4 py-2 text-sm font-bold text-white hover:bg-esbee/30 disabled:opacity-50 active:scale-95 transition-all"
                    >
                        {isUpdating ? '...' : 'Revert to In Progress'}
                    </button>
                )}
                {/* Delete — always available, with inline confirmation */}
                {confirmDelete ? (
                    <>
                        <button
                            onClick={() => setConfirmDelete(false)}
                            className="flex-1 rounded-lg border border-esbee bg-night px-4 py-2 text-sm font-bold text-slate-300 hover:bg-esbee/20 active:scale-95 transition-all"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={() => onDelete(order.id)}
                            className="flex-1 rounded-lg bg-red-600 px-4 py-2 text-sm font-bold text-white hover:bg-red-700 active:scale-95 transition-all"
                        >
                            Confirm Delete
                        </button>
                    </>
                ) : (
                    <button
                        onClick={() => setConfirmDelete(true)}
                        className="rounded-lg border border-red-800/50 bg-red-900/20 px-3 py-2 text-sm font-bold text-red-400 hover:bg-red-900/40 active:scale-95 transition-all"
                    >
                        Delete
                    </button>
                )}
            </div>
        </div>
    );
}

export function FulfillmentDashboard({ initialOrders, runners }: FulfillmentDashboardProps) {
    const router = useRouter();
    const [orders, setOrders] = useState<OrderWithDetails[]>(initialOrders);
    const [viewMode, setViewMode] = useState<'kanban' | 'list'>('kanban');
    const [showDone, setShowDone] = useState(false);
    const [draggedOrderId, setDraggedOrderId] = useState<string | null>(null);
    const [dragOverColumn, setDragOverColumn] = useState<OrderStatus | null>(null);

    const handleDragStart = (e: DragEvent<HTMLDivElement>, orderId: string) => {
        setDraggedOrderId(orderId);
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', orderId);
    };

    const handleDragEnd = () => {
        setDraggedOrderId(null);
        setDragOverColumn(null);
    };

    const handleDragOver = (e: DragEvent<HTMLDivElement>, status: OrderStatus) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        setDragOverColumn(status);
    };

    const handleDragLeave = () => {
        setDragOverColumn(null);
    };

    const handleDrop = async (e: DragEvent<HTMLDivElement>, newStatus: OrderStatus) => {
        e.preventDefault();
        const orderId = e.dataTransfer.getData('text/plain');
        if (orderId && draggedOrderId) {
            const order = orders.find(o => o.id === orderId);
            if (order && order.status !== newStatus) {
                await handleStatusChange(orderId, newStatus);
            }
        }
        setDraggedOrderId(null);
        setDragOverColumn(null);
    };

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
            const ordersResult = await getOrders('all');
            if (ordersResult.success && ordersResult.data) {
                setOrders(ordersResult.data);
            }
        }
    };

    const handleDelete = async (orderId: string) => {
        setOrders(prev => prev.filter(o => o.id !== orderId));
        await deleteOrder(orderId);
        // Re-fetch in case the optimistic removal missed something
        const result = await getOrders('all');
        if (result.success && result.data) setOrders(result.data);
    };

    const handleAssign = async (orderId: string, runnerId: string | null) => {
        // Optimistic update
        const runner = runners.find(r => r.id === runnerId) ?? null;
        setOrders(prev =>
            prev.map(o =>
                o.id === orderId
                    ? { ...o, runnerId: runnerId ?? null, runnerName: runner?.name ?? null }
                    : o
            )
        );
        await assignOrder(orderId, runnerId);
        // Re-fetch to sync server state
        const result = await getOrders('all');
        if (result.success && result.data) {
            setOrders(result.data);
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
            <div className="sticky top-0 z-10 border-b p-4 bg-grape border-esbee">
                <div className="container mx-auto">
                    <div className="flex items-center justify-between gap-4">
                        <div>
                            <h1 className="text-xl font-bold text-white">Order Fulfillment</h1>
                            <p className="text-sm text-slate-400">
                                {newOrders.length} new, {inProgressOrders.length} in progress
                            </p>
                        </div>
                        <Link
                            href="/"
                            className="rounded-lg bg-grape border border-esbee px-4 py-2 text-sm font-medium text-white hover:bg-esbee/30"
                        >
                            Inventory
                        </Link>
                    </div>
                </div>
            </div>

            {/* View Toggle */}
            <div className="container mx-auto p-4">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex rounded-lg overflow-hidden border border-esbee">
                        <button
                            onClick={() => setViewMode('list')}
                            className={`px-4 py-2 text-sm font-medium ${viewMode === 'list'
                                ? 'bg-cerise text-white'
                                : 'bg-grape text-slate-300 hover:bg-esbee/30'
                                }`}
                        >
                            List View
                        </button>
                        <button
                            onClick={() => setViewMode('kanban')}
                            className={`px-4 py-2 text-sm font-medium ${viewMode === 'kanban'
                                ? 'bg-cerise text-white'
                                : 'bg-grape text-slate-300 hover:bg-esbee/30'
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
                            className="rounded border-esbee bg-grape text-cerise focus:ring-cerise"
                        />
                        Show completed
                    </label>
                </div>

                {orders.length === 0 ? (
                    <div className="rounded-xl bg-grape border border-esbee p-8 text-center">
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
                            <div className="rounded-xl bg-grape border border-esbee p-8 text-center">
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
                                        runners={runners}
                                        onStatusChange={handleStatusChange}
                                        onAssign={handleAssign}
                                        onDelete={handleDelete}
                                        onPrepare={handlePrepareOrder}
                                    />
                                ))}
                                {showDone && doneOrders.length > 0 && (
                                    <>
                                        <div className="border-t border-esbee pt-4 mt-6">
                                            <h2 className="text-sm font-bold text-slate-500 uppercase tracking-wide mb-4">
                                                Completed ({doneOrders.length})
                                            </h2>
                                        </div>
                                        {doneOrders.map(order => (
                                            <OrderCard
                                                key={order.id}
                                                order={order}
                                                runners={runners}
                                                onStatusChange={handleStatusChange}
                                                onAssign={handleAssign}
                                                onDelete={handleDelete}
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
                        <div
                            className={`rounded-xl bg-grape/50 border p-4 transition-colors ${
                                dragOverColumn === 'new'
                                    ? 'border-jayouh border-2 bg-jayouh/10'
                                    : 'border-esbee'
                            }`}
                            onDrop={(e) => handleDrop(e, 'new')}
                            onDragOver={(e) => handleDragOver(e, 'new')}
                            onDragLeave={handleDragLeave}
                        >
                            <h2 className="text-sm font-bold text-jayouh uppercase tracking-wide mb-4 flex items-center gap-2">
                                <span className="w-3 h-3 rounded-full bg-jayouh"></span>
                                New ({newOrders.length})
                            </h2>
                            <div className="space-y-3">
                                {newOrders.map(order => (
                                    <OrderCard
                                        key={order.id}
                                        order={order}
                                        runners={runners}
                                        onStatusChange={handleStatusChange}
                                        onAssign={handleAssign}
                                        onDelete={handleDelete}
                                        onPrepare={handlePrepareOrder}
                                        isDragging={draggedOrderId === order.id}
                                        onDragStart={handleDragStart}
                                        onDragEnd={handleDragEnd}
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
                        <div
                            className={`rounded-xl bg-grape/50 border p-4 transition-colors ${
                                dragOverColumn === 'in_progress'
                                    ? 'border-esbee border-2 bg-esbee/10'
                                    : 'border-esbee'
                            }`}
                            onDrop={(e) => handleDrop(e, 'in_progress')}
                            onDragOver={(e) => handleDragOver(e, 'in_progress')}
                            onDragLeave={handleDragLeave}
                        >
                            <h2 className="text-sm font-bold text-cerise uppercase tracking-wide mb-4 flex items-center gap-2">
                                <span className="w-3 h-3 rounded-full bg-cerise"></span>
                                In Progress ({inProgressOrders.length})
                            </h2>
                            <div className="space-y-3">
                                {inProgressOrders.map(order => (
                                    <OrderCard
                                        key={order.id}
                                        order={order}
                                        runners={runners}
                                        onStatusChange={handleStatusChange}
                                        onAssign={handleAssign}
                                        onDelete={handleDelete}
                                        onPrepare={handlePrepareOrder}
                                        isDragging={draggedOrderId === order.id}
                                        onDragStart={handleDragStart}
                                        onDragEnd={handleDragEnd}
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
                            <div
                                className={`rounded-xl bg-grape/50 border p-4 transition-colors ${
                                    dragOverColumn === 'done'
                                        ? 'border-green-500 border-2 bg-green-500/10'
                                        : 'border-esbee'
                                }`}
                                onDrop={(e) => handleDrop(e, 'done')}
                                onDragOver={(e) => handleDragOver(e, 'done')}
                                onDragLeave={handleDragLeave}
                            >
                                <h2 className="text-sm font-bold text-green-500 uppercase tracking-wide mb-4 flex items-center gap-2">
                                    <span className="w-3 h-3 rounded-full bg-green-500"></span>
                                    Done ({doneOrders.length})
                                </h2>
                                <div className="space-y-3">
                                    {doneOrders.map(order => (
                                        <OrderCard
                                            key={order.id}
                                            order={order}
                                            runners={runners}
                                            onStatusChange={handleStatusChange}
                                            onAssign={handleAssign}
                                        onDelete={handleDelete}
                                            onPrepare={handlePrepareOrder}
                                            isDragging={draggedOrderId === order.id}
                                            onDragStart={handleDragStart}
                                            onDragEnd={handleDragEnd}
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
