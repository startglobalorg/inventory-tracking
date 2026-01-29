'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createItem } from '@/app/actions';

export default function AddItemPage() {
    const router = useRouter();
    const [formData, setFormData] = useState({
        name: '',
        sku: '',
        stock: 0,
        minThreshold: 0,
        category: '',
        quantityPerUnit: 1,
        unitName: 'unit',
    });
    const [error, setError] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsSubmitting(true);

        const result = await createItem(formData);

        if (result.success) {
            router.push('/');
        } else {
            setError(result.error || 'Failed to create item');
            setIsSubmitting(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-950">
            <div className="container mx-auto px-4 py-8 max-w-2xl">
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
                    <h1 className="text-3xl font-black text-white">Add New Item</h1>
                    <p className="mt-2 text-slate-400">Add a new item to your inventory</p>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="space-y-6">
                    {error && (
                        <div className="rounded-lg bg-red-900/20 border border-red-500 p-4 text-red-200">
                            {error}
                        </div>
                    )}

                    <div className="bg-slate-900 rounded-xl p-6 space-y-4">
                        {/* Name */}
                        <div>
                            <label htmlFor="name" className="block text-sm font-semibold text-white mb-2">
                                Item Name *
                            </label>
                            <input
                                type="text"
                                id="name"
                                required
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                className="w-full rounded-lg bg-slate-800 border border-slate-700 text-white px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                placeholder="e.g., Coca-Cola (500ml)"
                            />
                        </div>

                        {/* SKU */}
                        <div>
                            <label htmlFor="sku" className="block text-sm font-semibold text-white mb-2">
                                SKU *
                            </label>
                            <input
                                type="text"
                                id="sku"
                                required
                                value={formData.sku}
                                onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                                className="w-full rounded-lg bg-slate-800 border border-slate-700 text-white px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono"
                                placeholder="e.g., DRINK-COKE-500"
                            />
                            <p className="mt-1 text-xs text-slate-500">Format: CATEGORY-BRAND-SIZE</p>
                        </div>

                        {/* Category */}
                        <div>
                            <label htmlFor="category" className="block text-sm font-semibold text-white mb-2">
                                Category *
                            </label>
                            <input
                                type="text"
                                id="category"
                                required
                                value={formData.category}
                                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                                className="w-full rounded-lg bg-slate-800 border border-slate-700 text-white px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                placeholder="e.g., Soft Drinks, Energy Drinks, Snacks"
                            />
                        </div>

                        {/* Stock and Min Threshold */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label htmlFor="stock" className="block text-sm font-semibold text-white mb-2">
                                    Initial Stock *
                                </label>
                                <input
                                    type="number"
                                    id="stock"
                                    required
                                    min="0"
                                    value={formData.stock}
                                    onChange={(e) => setFormData({ ...formData, stock: parseInt(e.target.value) })}
                                    className="w-full rounded-lg bg-slate-800 border border-slate-700 text-white px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                />
                            </div>
                            <div>
                                <label htmlFor="minThreshold" className="block text-sm font-semibold text-white mb-2">
                                    Min Threshold *
                                </label>
                                <input
                                    type="number"
                                    id="minThreshold"
                                    required
                                    min="0"
                                    value={formData.minThreshold}
                                    onChange={(e) => setFormData({ ...formData, minThreshold: parseInt(e.target.value) })}
                                    className="w-full rounded-lg bg-slate-800 border border-slate-700 text-white px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                />
                            </div>
                        </div>

                        {/* Quantity Per Unit and Unit Name */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label htmlFor="quantityPerUnit" className="block text-sm font-semibold text-white mb-2">
                                    Quantity Per Unit *
                                </label>
                                <input
                                    type="number"
                                    id="quantityPerUnit"
                                    required
                                    min="1"
                                    value={formData.quantityPerUnit}
                                    onChange={(e) => setFormData({ ...formData, quantityPerUnit: parseInt(e.target.value) })}
                                    className="w-full rounded-lg bg-slate-800 border border-slate-700 text-white px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                />
                                <p className="mt-1 text-xs text-slate-500">e.g., 24 for a case of 24</p>
                            </div>
                            <div>
                                <label htmlFor="unitName" className="block text-sm font-semibold text-white mb-2">
                                    Unit Name *
                                </label>
                                <input
                                    type="text"
                                    id="unitName"
                                    required
                                    value={formData.unitName}
                                    onChange={(e) => setFormData({ ...formData, unitName: e.target.value })}
                                    className="w-full rounded-lg bg-slate-800 border border-slate-700 text-white px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    placeholder="e.g., case, pack, unit"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-4">
                        <Link
                            href="/"
                            className="flex-1 rounded-lg bg-slate-800 px-6 py-3 text-center font-semibold text-white transition-all hover:bg-slate-700 border border-slate-700"
                        >
                            Cancel
                        </Link>
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="flex-1 rounded-lg bg-blue-600 px-6 py-3 font-bold text-white transition-all hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            {isSubmitting ? 'Creating...' : 'Create Item'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
