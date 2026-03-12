'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { editOrderLog, deleteOrderLog, clearHistory } from '@/app/actions/history';
import { useToast } from './ToastProvider';

type OrderLog = {
    logId: string;
    itemId: string | null;
    itemName: string | null;
    itemSku: string | null;
    itemCategory: string | null;
    changeAmount: number;
    reason: string;
    userName: string | null;
    createdAt: Date | null;
};

export function OrderHistoryClient({ logs }: { logs: OrderLog[] }) {
    const { showToast } = useToast();
    const router = useRouter();
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editAmount, setEditAmount] = useState<string>('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Clear history modal state
    const [showClearModal, setShowClearModal] = useState(false);
    const [clearName, setClearName] = useState('');
    const [isClearing, setIsClearing] = useState(false);

    const handleEdit = (log: OrderLog) => {
        setEditingId(log.logId);
        setEditAmount(Math.abs(log.changeAmount).toString());
    };

    const handleSave = async (logId: string, originalAmount: number, reason: string) => {
        setIsSubmitting(true);

        const newAmount = parseInt(editAmount, 10);
        if (isNaN(newAmount) || newAmount <= 0) {
            showToast('Please enter a valid amount', 'error');
            setIsSubmitting(false);
            return;
        }

        // Preserve the sign based on the reason
        const signedAmount = reason === 'consumed' ? -Math.abs(newAmount) : Math.abs(newAmount);

        const result = await editOrderLog(logId, signedAmount, reason);

        setIsSubmitting(false);

        if (result.success) {
            showToast('Order updated successfully', 'success');
            setEditingId(null);
            setEditAmount('');
        } else {
            showToast(result.error || 'Failed to update order', 'error');
        }
    };

    const handleDelete = async (logId: string) => {
        if (!confirm('Are you sure you want to delete this order? This will adjust the stock accordingly.')) {
            return;
        }

        setIsSubmitting(true);
        const result = await deleteOrderLog(logId);
        setIsSubmitting(false);

        if (result.success) {
            showToast('Order deleted successfully', 'success');
        } else {
            showToast(result.error || 'Failed to delete order', 'error');
        }
    };

    const handleCancel = () => {
        setEditingId(null);
        setEditAmount('');
    };

    const handleClearHistory = async () => {
        if (!clearName.trim()) return;
        setIsClearing(true);
        const result = await clearHistory(clearName.trim());
        setIsClearing(false);
        if (result.success) {
            setShowClearModal(false);
            setClearName('');
            showToast('History cleared successfully', 'success');
            router.refresh();
        } else {
            showToast(result.error || 'Failed to clear history', 'error');
        }
    };

    const formatDate = (date: Date | null) => {
        if (!date) return 'N/A';
        return new Date(date).toLocaleString();
    };

    const getReasonBadge = (reason: string) => {
        switch (reason) {
            case 'consumed':
                return <span className="inline-block rounded-full bg-red-900/30 px-2 py-1 text-xs font-semibold text-red-300">Consumed</span>;
            case 'restocked':
                return <span className="inline-block rounded-full bg-green-900/30 px-2 py-1 text-xs font-semibold text-green-300">Restocked</span>;
            case 'adjustment':
                return <span className="inline-block rounded-full bg-blue-900/30 px-2 py-1 text-xs font-semibold text-blue-300">Adjustment</span>;
            case 'cleared':
                return <span className="inline-block rounded-full bg-orange-900/30 px-2 py-1 text-xs font-semibold text-orange-300">Cleared</span>;
            default:
                return <span className="inline-block rounded-full bg-slate-700 px-2 py-1 text-xs font-semibold text-slate-300">{reason}</span>;
        }
    };

    return (
        <>
        {/* Clear History Confirmation Modal */}
        {showClearModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
                <div className="absolute inset-0 bg-black/70" onClick={() => { setShowClearModal(false); setClearName(''); }} />
                <div className="relative w-full max-w-md rounded-2xl border border-red-800 bg-slate-900 p-6 shadow-2xl space-y-5">
                    <div className="flex items-start gap-3">
                        <div className="shrink-0 flex h-10 w-10 items-center justify-center rounded-full bg-red-900/50 text-red-400 text-xl">⚠</div>
                        <div>
                            <h3 className="text-lg font-bold text-white">Clear All History?</h3>
                            <p className="mt-1 text-sm text-slate-400">
                                This will permanently delete all log entries. Stock levels will not be affected. A single &quot;History Cleared&quot; entry will be created in its place.
                            </p>
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-400 mb-1">Your name</label>
                        <input
                            type="text"
                            autoFocus
                            placeholder="e.g. John Doe"
                            value={clearName}
                            onChange={(e) => setClearName(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleClearHistory()}
                            className="w-full rounded-lg bg-slate-800 border border-slate-600 text-white px-3 py-2.5 focus:border-red-500 focus:outline-none"
                        />
                    </div>
                    <div className="flex gap-3">
                        <button
                            onClick={() => { setShowClearModal(false); setClearName(''); }}
                            disabled={isClearing}
                            className="flex-1 rounded-xl border border-slate-600 bg-slate-800 py-3 text-sm font-bold text-slate-300 hover:bg-slate-700 disabled:opacity-40 transition-all"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleClearHistory}
                            disabled={!clearName.trim() || isClearing}
                            className="flex-1 rounded-xl bg-red-700 py-3 text-sm font-bold text-white hover:bg-red-600 disabled:opacity-40 transition-all"
                        >
                            {isClearing ? 'Clearing…' : 'Clear History'}
                        </button>
                    </div>
                </div>
            </div>
        )}

        <div className="rounded-xl bg-slate-900 border border-slate-700 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-700">
                <h2 className="text-xl font-bold text-white">Order Logs</h2>
                <p className="mt-1 text-sm text-slate-400">Total: {logs.length} orders</p>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full">
                    <thead className="bg-slate-800/50">
                        <tr>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Item</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider hidden sm:table-cell">SKU</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider hidden md:table-cell">Category</th>
                            <th className="px-4 py-3 text-right text-xs font-semibold text-slate-400 uppercase tracking-wider">Amount</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Type</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider hidden lg:table-cell">User</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider hidden xl:table-cell">Date</th>
                            <th className="px-4 py-3 text-right text-xs font-semibold text-slate-400 uppercase tracking-wider">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-700">
                        {logs.length === 0 ? (
                            <tr>
                                <td colSpan={8} className="px-4 py-8 text-center text-slate-500">
                                    No orders found
                                </td>
                            </tr>
                        ) : (
                            logs.map((log) => (
                                <tr key={log.logId} className="hover:bg-slate-800/50 transition-colors">
                                    <td className="px-4 py-4">
                                        <p className="text-sm font-medium text-white">
                                            {log.reason === 'cleared' ? 'History Cleared' : (log.itemName || 'Unknown')}
                                        </p>
                                    </td>
                                    <td className="px-4 py-4 hidden sm:table-cell">
                                        <p className="text-sm text-slate-400 font-mono">{log.itemSku || 'N/A'}</p>
                                    </td>
                                    <td className="px-4 py-4 hidden md:table-cell">
                                        <p className="text-sm text-slate-400">{log.itemCategory || 'N/A'}</p>
                                    </td>
                                    <td className="px-4 py-4 text-right">
                                        {editingId === log.logId ? (
                                            <input
                                                type="number"
                                                value={editAmount}
                                                onChange={(e) => setEditAmount(e.target.value)}
                                                className="w-20 rounded bg-slate-800 border border-slate-600 text-white px-2 py-1 text-sm text-right"
                                                min="1"
                                                autoFocus
                                            />
                                        ) : (
                                            <span className={`text-sm font-bold ${log.changeAmount > 0 ? 'text-green-400' : 'text-red-400'}`}>
                                                {log.changeAmount > 0 ? '+' : ''}{log.changeAmount}
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-4 py-4">
                                        {getReasonBadge(log.reason)}
                                    </td>
                                    <td className="px-4 py-4 hidden lg:table-cell">
                                        <p className="text-sm text-slate-400">{log.userName || 'System'}</p>
                                    </td>
                                    <td className="px-4 py-4 hidden xl:table-cell">
                                        <p className="text-xs text-slate-500">{formatDate(log.createdAt)}</p>
                                    </td>
                                    <td className="px-4 py-4 text-right">
                                        {log.reason === 'cleared' ? null : editingId === log.logId ? (
                                            <div className="flex justify-end gap-2">
                                                <button
                                                    onClick={() => handleSave(log.logId, log.changeAmount, log.reason)}
                                                    disabled={isSubmitting}
                                                    className="text-xs px-3 py-1 rounded bg-green-600 text-white hover:bg-green-700 disabled:opacity-50"
                                                >
                                                    Save
                                                </button>
                                                <button
                                                    onClick={handleCancel}
                                                    disabled={isSubmitting}
                                                    className="text-xs px-3 py-1 rounded bg-slate-700 text-white hover:bg-slate-600 disabled:opacity-50"
                                                >
                                                    Cancel
                                                </button>
                                            </div>
                                        ) : (
                                            <div className="flex justify-end gap-2">
                                                <button
                                                    onClick={() => handleEdit(log)}
                                                    className="text-xs px-3 py-1 rounded bg-blue-600 text-white hover:bg-blue-700"
                                                >
                                                    Edit
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(log.logId)}
                                                    className="text-xs px-3 py-1 rounded bg-red-600 text-white hover:bg-red-700"
                                                >
                                                    Delete
                                                </button>
                                            </div>
                                        )}
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Clear History */}
            <div className="px-6 py-5 border-t border-slate-700 flex justify-end">
                <button
                    onClick={() => setShowClearModal(true)}
                    className="rounded-lg border border-red-800 bg-red-900/20 px-4 py-2 text-sm font-semibold text-red-400 hover:bg-red-900/40 transition-colors"
                >
                    Clear History
                </button>
            </div>
        </div>
        </>
    );
}
