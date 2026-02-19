'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { updateItem, deleteItem } from '@/app/actions';
import { useToast } from './ToastProvider';
import type { Item } from '@/db/schema';
import Link from 'next/link';

export function EditItemForm({ item }: { item: Item }) {
    const router = useRouter();
    const { showToast } = useToast();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

    const [formData, setFormData] = useState({
        name: item.name,
        sku: item.sku,
        size: item.size || '',
        stock: item.stock,
        minThreshold: item.minThreshold,
        category: item.category,
        quantityPerUnit: item.quantityPerUnit || 1,
        unitName: item.unitName || 'unit',
        coldStorage: item.coldStorage || false,
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);

        try {
            const result = await updateItem(item.id, formData);

            if (result.success) {
                showToast('Item updated successfully!', 'success');
                router.refresh();
            } else {
                showToast(result.error || 'Failed to update item', 'error');
            }
        } catch (error) {
            showToast('An error occurred', 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async () => {
        setIsDeleting(true);

        try {
            const result = await deleteItem(item.id);

            if (result.success) {
                showToast('Item deleted successfully!', 'success');
                router.push('/');
            } else {
                showToast(result.error || 'Failed to delete item', 'error');
            }
        } catch (error) {
            showToast('An error occurred', 'error');
        } finally {
            setIsDeleting(false);
            setShowDeleteConfirm(false);
        }
    };

    return (
        <>
            {/* Header */}
            <div className="mb-6">
                <Link
                    href="/"
                    className="inline-flex items-center text-sm text-slate-400 hover:text-white transition-colors mb-4"
                >
                    <svg className="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                    Back to Inventory
                </Link>
                <h1 className="text-2xl sm:text-3xl font-black text-white">Edit Item</h1>
                <p className="mt-2 text-slate-400">Update item details or delete from inventory</p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-6">
                <div className="rounded-xl bg-slate-900 border border-slate-700 p-6 space-y-4">
                    {/* Name */}
                    <div>
                        <label htmlFor="name" className="block text-sm font-medium text-slate-300 mb-2">
                            Item Name *
                        </label>
                        <input
                            type="text"
                            id="name"
                            required
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            className="w-full rounded-lg border border-slate-600 bg-slate-800 px-4 py-2.5 text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                        />
                    </div>

                    {/* Size */}
                    <div>
                        <label htmlFor="size" className="block text-sm font-medium text-slate-300 mb-2">
                            Size
                        </label>
                        <input
                            type="text"
                            id="size"
                            value={formData.size}
                            onChange={(e) => setFormData({ ...formData, size: e.target.value })}
                            className="w-full rounded-lg border border-slate-600 bg-slate-800 px-4 py-2.5 text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                            placeholder="e.g., 500ml, 100g"
                        />
                    </div>



                    {/* Category */}
                    <div>
                        <label htmlFor="category" className="block text-sm font-medium text-slate-300 mb-2">
                            Category *
                        </label>
                        <input
                            type="text"
                            id="category"
                            required
                            value={formData.category}
                            onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                            className="w-full rounded-lg border border-slate-600 bg-slate-800 px-4 py-2.5 text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                        />
                    </div>

                    {/* Stock and Threshold */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label htmlFor="stock" className="block text-sm font-medium text-slate-300 mb-2">
                                Current Stock *
                            </label>
                            <input
                                type="number"
                                id="stock"
                                required
                                min="0"
                                value={formData.stock}
                                onChange={(e) => setFormData({ ...formData, stock: parseInt(e.target.value, 10) })}
                                className="w-full rounded-lg border border-slate-600 bg-slate-800 px-4 py-2.5 text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                            />
                        </div>

                        <div>
                            <label htmlFor="minThreshold" className="block text-sm font-medium text-slate-300 mb-2">
                                Minimum Threshold *
                            </label>
                            <input
                                type="number"
                                id="minThreshold"
                                required
                                min="0"
                                value={formData.minThreshold}
                                onChange={(e) => setFormData({ ...formData, minThreshold: parseInt(e.target.value, 10) })}
                                className="w-full rounded-lg border border-slate-600 bg-slate-800 px-4 py-2.5 text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                            />
                        </div>
                    </div>

                    {/* Quantity per Unit */}
                    <div>
                        <label htmlFor="quantityPerUnit" className="block text-sm font-medium text-slate-300 mb-2">
                            Quantity per Unit *
                        </label>
                        <input
                            type="number"
                            id="quantityPerUnit"
                            required
                            min="1"
                            value={formData.quantityPerUnit}
                            onChange={(e) => setFormData({ ...formData, quantityPerUnit: parseInt(e.target.value, 10) })}
                            className="w-full rounded-lg border border-slate-600 bg-slate-800 px-4 py-2.5 text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                        />
                        <p className="mt-1 text-xs text-slate-500">e.g., 24 for a case of 24 bottles</p>
                    </div>

                    {/* Cold Storage Checkbox */}
                    <div>
                        <label className="flex items-center gap-3 cursor-pointer">
                            <input
                                type="checkbox"
                                id="coldStorage"
                                checked={formData.coldStorage}
                                onChange={(e) => setFormData({ ...formData, coldStorage: e.target.checked })}
                                className="w-5 h-5 rounded bg-slate-800 border-slate-600 text-cyan-600 focus:ring-2 focus:ring-cyan-500"
                            />
                            <span className="text-sm font-medium text-slate-300">
                                Cold Storage Item ❄️
                            </span>
                        </label>
                        <p className="mt-1 text-xs text-slate-500 ml-8">Check if this item requires refrigeration</p>
                    </div>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col-reverse sm:flex-row gap-3">
                    <button
                        type="button"
                        onClick={() => setShowDeleteConfirm(true)}
                        disabled={isSubmitting || isDeleting}
                        className="w-full sm:w-auto rounded-lg border border-red-600 bg-red-900/20 px-6 py-3 font-semibold text-red-400 hover:bg-red-900/30 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        Delete Item
                    </button>

                    <div className="flex-1" />

                    <Link
                        href="/"
                        className="w-full sm:w-auto text-center rounded-lg border border-slate-600 bg-slate-800 px-6 py-3 font-semibold text-white hover:bg-slate-700 transition-colors"
                    >
                        Cancel
                    </Link>

                    <button
                        type="submit"
                        disabled={isSubmitting || isDeleting}
                        className="w-full sm:w-auto rounded-lg bg-blue-600 px-6 py-3 font-semibold text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        {isSubmitting ? 'Saving...' : 'Save Changes'}
                    </button>
                </div>
            </form>

            {/* Delete Confirmation Modal */}
            {showDeleteConfirm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80">
                    <div className="w-full max-w-md rounded-xl bg-slate-900 border border-slate-700 p-6">
                        <h3 className="text-xl font-bold text-white mb-2">Delete Item?</h3>
                        <p className="text-slate-400 mb-6">
                            Are you sure you want to delete <span className="font-semibold text-white">{item.name}</span>?
                            This action cannot be undone and will also delete all associated order history.
                        </p>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowDeleteConfirm(false)}
                                disabled={isDeleting}
                                className="flex-1 rounded-lg border border-slate-600 bg-slate-800 px-4 py-2.5 font-semibold text-white hover:bg-slate-700 disabled:opacity-50 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleDelete}
                                disabled={isDeleting}
                                className="flex-1 rounded-lg bg-red-600 px-4 py-2.5 font-semibold text-white hover:bg-red-700 disabled:opacity-50 transition-colors"
                            >
                                {isDeleting ? 'Deleting...' : 'Delete'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
