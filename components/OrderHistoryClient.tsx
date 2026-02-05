'use client';

import { useState } from 'react';
import { editOrderLog, deleteOrderLog } from '@/app/actions/history';
import { useToast } from './ToastProvider';

type OrderLog = {
    logId: string;
    itemId: string;
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
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editAmount, setEditAmount] = useState<string>('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleEdit = (log: OrderLog) => {
        setEditingId(log.logId);
        setEditAmount(Math.abs(log.changeAmount).toString());
    };

    const handleSave = async (logId: string, originalAmount: number, reason: string) => {
        setIsSubmitting(true);

        const newAmount = parseInt(editAmount);
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
            default:
                return <span className="inline-block rounded-full bg-slate-700 px-2 py-1 text-xs font-semibold text-slate-300">{reason}</span>;
        }
    };

    return (
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
                                        <p className="text-sm font-medium text-white">{log.itemName || 'Unknown'}</p>
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
                                        {editingId === log.logId ? (
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
        </div>
    );
}
