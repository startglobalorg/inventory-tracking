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

function formatPrintDate(date: Date): string {
    return date.toLocaleString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
}

function OrderCard({
    order,
    runners,
    onStatusChange,
    onAssign,
    onPrepare,
    onDelete,
    onPrint,
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
    onPrint: (orderId: string) => void;
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
        cancelled: 'bg-red-900/20 border-red-800/50',
    };

    const statusBadgeColors = {
        new: 'bg-jayouh/20 text-jayouh',
        in_progress: 'bg-esbee/30 text-cerise',
        done: 'bg-neutral-700 text-white',
        cancelled: 'bg-red-900/50 text-red-400',
    };

    const statusLabels = {
        new: 'New',
        in_progress: 'In Progress',
        done: 'Done',
        cancelled: 'Cancelled',
    };

    const isCancelled = order.status === 'cancelled';

    return (
        <div
            draggable={!isCancelled}
            onDragStart={!isCancelled ? handleDragStart : undefined}
            onDragEnd={!isCancelled ? onDragEnd : undefined}
            className={`rounded-xl border p-4 ${statusColors[order.status]} transition-all ${!isCancelled ? 'cursor-grab active:cursor-grabbing' : ''} ${isDragging ? 'opacity-50 scale-95' : ''} ${isCancelled ? 'opacity-70' : ''}`}
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
                    {isCancelled && order.cancelledBy && (
                        <p className="text-xs text-red-400 font-medium mt-0.5">
                            Cancelled by {order.cancelledBy}
                        </p>
                    )}
                </div>
                <span className={`rounded-full px-2 py-1 text-xs font-bold shrink-0 ${statusBadgeColors[order.status]}`}>
                    {statusLabels[order.status]}
                </span>
            </div>

            {/* Items or custom text request */}
            <div className="mb-3 rounded-lg bg-night/50 p-3">
                {order.customRequest ? (
                    <p className="text-sm text-slate-200 whitespace-pre-wrap">{order.customRequest}</p>
                ) : (
                    <ul className="space-y-1">
                        {order.items.map(item => {
                            const perUnit = (item.quantityPerUnit || 1) > 1 ? item.quantityPerUnit! : 0;
                            const units = perUnit > 0 ? Math.floor(item.quantity / perUnit) : 0;
                            const remainder = perUnit > 0 ? item.quantity % perUnit : 0;
                            const uName = item.unitName || 'case';
                            return (
                                <li key={item.id} className="flex justify-between text-sm">
                                    <span className="text-slate-300">{item.itemName}</span>
                                    {perUnit > 0 && units > 0 ? (
                                        <span className="font-bold text-white">
                                            {units} {uName}{units !== 1 ? 's' : ''}
                                            {remainder > 0 ? ` + ${remainder}` : ''}
                                            {' '}
                                            <span className="font-normal text-slate-400">({item.quantity})</span>
                                        </span>
                                    ) : (
                                        <span className="font-bold text-white">x{item.quantity}</span>
                                    )}
                                </li>
                            );
                        })}
                    </ul>
                )}
            </div>

            {/* Runner assignment */}
            {order.status !== 'done' && !isCancelled ? (
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
            ) : (order.status === 'done' || isCancelled) && order.runnerName ? (
                <div className="mb-3">
                    <span className="inline-flex items-center gap-1 rounded-full bg-esbee/20 border border-esbee px-3 py-1 text-xs text-slate-300">
                        Volunteer: <span className="font-bold text-white">{order.runnerName}</span>
                    </span>
                </div>
            ) : null}

            {/* Actions */}
            <div className="flex flex-wrap gap-2">
                {!isCancelled && order.status === 'new' && (
                    <>
                        {!order.customRequest && (
                            <button
                                onClick={() => onPrepare(order.id)}
                                className="flex-1 rounded-lg bg-violet-accent px-4 py-2 text-sm font-bold text-white hover:bg-violet-accent/80 active:scale-95 transition-all"
                            >
                                Prepare Order
                            </button>
                        )}
                        <button
                            onClick={() => handleStatusChange('in_progress')}
                            disabled={isUpdating}
                            className="flex-1 rounded-lg bg-cerise px-4 py-2 text-sm font-bold text-white hover:bg-jayouh disabled:opacity-50 active:scale-95 transition-all"
                        >
                            {isUpdating ? '...' : 'Start'}
                        </button>
                    </>
                )}
                {!isCancelled && order.status === 'in_progress' && (
                    <>
                        {!order.customRequest && (
                            <button
                                onClick={() => onPrepare(order.id)}
                                className="flex-1 rounded-lg bg-violet-accent px-4 py-2 text-sm font-bold text-white hover:bg-violet-accent/80 active:scale-95 transition-all"
                            >
                                Prepare Order
                            </button>
                        )}
                        <button
                            onClick={() => handleStatusChange('done')}
                            disabled={isUpdating}
                            className="flex-1 rounded-lg bg-green-600 px-4 py-2 text-sm font-bold text-white hover:bg-green-700 disabled:opacity-50 active:scale-95 transition-all"
                        >
                            {isUpdating ? '...' : 'Mark Done'}
                        </button>
                    </>
                )}
                {!isCancelled && order.status === 'done' && (
                    <button
                        onClick={() => handleStatusChange('in_progress')}
                        disabled={isUpdating}
                        className="flex-1 rounded-lg bg-grape border border-esbee px-4 py-2 text-sm font-bold text-white hover:bg-esbee/30 disabled:opacity-50 active:scale-95 transition-all"
                    >
                        {isUpdating ? '...' : 'Revert to In Progress'}
                    </button>
                )}
                {/* Print packing slip */}
                <button
                    onClick={() => onPrint(order.id)}
                    className="rounded-lg border border-esbee bg-grape/50 px-3 py-2 text-slate-300 hover:bg-esbee/30 active:scale-95 transition-all"
                    title="Print packing slip"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="6 9 6 2 18 2 18 9" />
                        <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
                        <rect x="6" y="14" width="12" height="8" />
                    </svg>
                </button>
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
    const [activePrintOrder, setActivePrintOrder] = useState<OrderWithDetails | null>(null);

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
        }, 10000);

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
        const result = await getOrders('all');
        if (result.success && result.data) setOrders(result.data);
    };

    const handleAssign = async (orderId: string, runnerId: string | null) => {
        const runner = runners.find(r => r.id === runnerId) ?? null;
        setOrders(prev =>
            prev.map(o =>
                o.id === orderId
                    ? { ...o, runnerId: runnerId ?? null, runnerName: runner?.name ?? null }
                    : o
            )
        );
        await assignOrder(orderId, runnerId);
        const result = await getOrders('all');
        if (result.success && result.data) {
            setOrders(result.data);
        }
    };

    const handlePrepareOrder = async (orderId: string) => {
        const result = await getOrderForCart(orderId);
        if (result.success && result.data) {
            const cartData = encodeURIComponent(JSON.stringify(result.data));
            router.push(`/?loadCart=${cartData}&orderId=${orderId}`);
        }
    };

    const handlePrint = (orderId: string) => {
        const order = orders.find(o => o.id === orderId);
        if (!order) return;
        setActivePrintOrder(order);
        setTimeout(() => window.print(), 150);
    };

    // Group orders by status
    const newOrders = orders.filter(o => o.status === 'new');
    const inProgressOrders = orders.filter(o => o.status === 'in_progress');
    const doneOrders = orders.filter(o => o.status === 'done');
    const cancelledOrders = orders.filter(o => o.status === 'cancelled');

    const activeOrders = [...newOrders, ...inProgressOrders];
    const completedOrders = [...doneOrders, ...cancelledOrders];

    return (
        <>
            {/* Print media styles — controls visibility without relying on Tailwind print: variants */}
            <style>{`
                @media print {
                    @page { size: A5 portrait; margin: 12mm; }
                    .no-print { display: none !important; }
                    .print-only { display: block !important; }
                }
                @media screen {
                    .print-only { display: none !important; }
                }
            `}</style>

            {/* Main dashboard */}
            <div className="no-print pb-8">
                {/* Header */}
                <div className="sticky top-0 z-10 border-b p-4 bg-grape border-esbee">
                    <div className="container mx-auto">
                        <div className="flex items-center justify-between gap-4">
                            <div>
                                <h1 className="text-xl font-bold text-white">Order Fulfillment</h1>
                                <p className="text-sm text-slate-400">
                                    {newOrders.length} new, {inProgressOrders.length} in progress{cancelledOrders.length > 0 ? `, ${cancelledOrders.length} cancelled` : ''}
                                </p>
                            </div>
                            <div className="flex gap-2">
                                <Link
                                    href="/admin"
                                    className="rounded-lg bg-grape border border-esbee px-4 py-2 text-sm font-medium text-slate-400 hover:bg-esbee/30 hover:text-white"
                                >
                                    Admin
                                </Link>
                                <Link
                                    href="/"
                                    className="rounded-lg bg-grape border border-esbee px-4 py-2 text-sm font-medium text-white hover:bg-esbee/30"
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
                                            onPrint={handlePrint}
                                        />
                                    ))}
                                    {showDone && completedOrders.length > 0 && (
                                        <>
                                            <div className="border-t border-esbee pt-4 mt-6">
                                                <h2 className="text-sm font-bold text-slate-500 uppercase tracking-wide mb-4">
                                                    Completed &amp; Cancelled ({completedOrders.length})
                                                </h2>
                                            </div>
                                            {completedOrders.map(order => (
                                                <OrderCard
                                                    key={order.id}
                                                    order={order}
                                                    runners={runners}
                                                    onStatusChange={handleStatusChange}
                                                    onAssign={handleAssign}
                                                    onDelete={handleDelete}
                                                    onPrepare={handlePrepareOrder}
                                                    onPrint={handlePrint}
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
                                className={`rounded-xl bg-grape/50 border p-4 transition-colors ${dragOverColumn === 'new'
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
                                            onPrint={handlePrint}
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
                                className={`rounded-xl bg-grape/50 border p-4 transition-colors ${dragOverColumn === 'in_progress'
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
                                            onPrint={handlePrint}
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

                            {/* Done / Cancelled Column */}
                            {showDone && (
                                <div
                                    className={`rounded-xl bg-grape/50 border p-4 transition-colors ${dragOverColumn === 'done'
                                        ? 'border-green-500 border-2 bg-green-500/10'
                                        : 'border-esbee'
                                        }`}
                                    onDrop={(e) => handleDrop(e, 'done')}
                                    onDragOver={(e) => handleDragOver(e, 'done')}
                                    onDragLeave={handleDragLeave}
                                >
                                    <h2 className="text-sm font-bold text-green-500 uppercase tracking-wide mb-4 flex items-center gap-2">
                                        <span className="w-3 h-3 rounded-full bg-green-500"></span>
                                        Done / Cancelled ({completedOrders.length})
                                    </h2>
                                    <div className="space-y-3">
                                        {completedOrders.map(order => (
                                            <OrderCard
                                                key={order.id}
                                                order={order}
                                                runners={runners}
                                                onStatusChange={handleStatusChange}
                                                onAssign={handleAssign}
                                                onDelete={handleDelete}
                                                onPrepare={handlePrepareOrder}
                                                onPrint={handlePrint}
                                                isDragging={draggedOrderId === order.id}
                                                onDragStart={handleDragStart}
                                                onDragEnd={handleDragEnd}
                                            />
                                        ))}
                                        {completedOrders.length === 0 && (
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

            {/* Packing slip — screen: hidden via @media screen rule above; print: visible */}
            <div className="print-only bg-white text-black font-sans text-sm">
                {activePrintOrder && (
                    <>
                        {/* Header */}
                        <div className="flex items-baseline justify-between border-b border-gray-300 pb-3 mb-4">
                            <div>
                                <h1 className="text-xl font-semibold text-black leading-tight">
                                    {activePrintOrder.locationName}
                                </h1>
                                <p className="text-xs text-gray-400 mt-0.5">Packing Slip</p>
                            </div>
                            <div className="text-right text-xs text-gray-400">
                                <span className="font-mono text-gray-600">#{activePrintOrder.id.slice(-8).toUpperCase()}</span>
                                <span className="mx-2">·</span>
                                <span>{formatPrintDate(activePrintOrder.createdAt)}</span>
                            </div>
                        </div>

                        {/* Items */}
                        {activePrintOrder.customRequest ? (
                            <p className="text-sm leading-relaxed text-black whitespace-pre-wrap mb-6">
                                {activePrintOrder.customRequest}
                            </p>
                        ) : (
                            <table className="w-full border-collapse mb-6">
                                <tbody>
                                    {activePrintOrder.items.map(item => {
                                        const perUnit = (item.quantityPerUnit || 1) > 1 ? item.quantityPerUnit! : 0;
                                        const units = perUnit > 0 ? Math.floor(item.quantity / perUnit) : 0;
                                        const remainder = perUnit > 0 ? item.quantity % perUnit : 0;
                                        const uName = item.unitName || 'case';
                                        return (
                                            <tr key={item.id} className="border-b border-gray-100" style={{ breakInside: 'avoid' }}>
                                                <td className="py-2 pr-3 w-5 align-middle">
                                                    <span className="inline-block w-4 h-4 border border-gray-400 rounded-sm"></span>
                                                </td>
                                                <td className="py-2 text-black align-middle">{item.itemName}</td>
                                                <td className="py-2 text-right font-semibold text-black align-middle w-24">
                                                    {perUnit > 0 && units > 0 ? (
                                                        <>
                                                            {units} {uName}{units !== 1 ? 's' : ''}
                                                            {remainder > 0 ? ` + ${remainder}` : ''}
                                                            {' '}
                                                            <span className="font-normal text-gray-400">({item.quantity})</span>
                                                        </>
                                                    ) : (
                                                        <>&times;{item.quantity}</>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        )}

                        {/* Assignment line */}
                        <div className="border-t border-gray-300 pt-5">
                            <div className="flex items-end gap-3">
                                <span className="text-xs text-gray-500 whitespace-nowrap">Assigned to:</span>
                                {activePrintOrder.runnerName ? (
                                    <span className="text-sm font-semibold text-black">{activePrintOrder.runnerName}</span>
                                ) : (
                                    <span className="flex-1 border-b border-gray-400"></span>
                                )}
                            </div>
                        </div>
                    </>
                )}
            </div>
        </>
    );
}
