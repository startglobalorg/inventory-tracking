'use client';

import { useState } from 'react';
import Link from 'next/link';
import { submitVolunteerRequest } from '@/app/actions/volunteer-orders';
import type { Location } from '@/db/schema';
import { BrandHeader } from '@/components/BrandHeader';

interface AvailableItem {
    id: string;
    name: string;
    category: string;
    imageUrl: string | null;
    quantityPerUnit: number | null;
    unitName: string | null;
}

interface VolunteerRequestFormProps {
    location: Location;
    availableItems: AvailableItem[];
}

export function VolunteerRequestForm({ location, availableItems }: VolunteerRequestFormProps) {
    const [quantities, setQuantities] = useState<Record<string, number>>({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);
    const [isReviewOpen, setIsReviewOpen] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [customInputOpen, setCustomInputOpen] = useState<Record<string, boolean>>({});
    const [customInputValues, setCustomInputValues] = useState<Record<string, string>>({});

    const updateQuantity = (itemId: string, delta: number) => {
        setQuantities(prev => {
            const current = prev[itemId] || 0;
            const newValue = Math.max(0, current + delta);
            if (newValue === 0) {
                const { [itemId]: _, ...rest } = prev;
                return rest;
            }
            return { ...prev, [itemId]: newValue };
        });
    };

    const setQuantity = (itemId: string, value: number) => {
        setQuantities(prev => {
            if (value <= 0) {
                const { [itemId]: _, ...rest } = prev;
                return rest;
            }
            return { ...prev, [itemId]: value };
        });
    };

    const totalItems = Object.values(quantities).reduce((sum, qty) => sum + qty, 0);

    const toggleCustomInput = (itemId: string) => {
        setCustomInputOpen(prev => ({
            ...prev,
            [itemId]: !prev[itemId]
        }));
        if (!customInputOpen[itemId]) {
            setCustomInputValues(prev => ({ ...prev, [itemId]: '' }));
        }
    };

    const handleCustomAmountSubmit = (itemId: string) => {
        const value = parseInt(customInputValues[itemId] || '0', 10);
        if (value > 0) {
            updateQuantity(itemId, value);
            setCustomInputOpen(prev => ({ ...prev, [itemId]: false }));
            setCustomInputValues(prev => ({ ...prev, [itemId]: '' }));
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (totalItems === 0) return;

        setIsSubmitting(true);
        setError(null);

        const result = await submitVolunteerRequest(location.id, quantities);

        setIsSubmitting(false);

        if (result.success) {
            setIsSuccess(true);
            setQuantities({});
            setIsReviewOpen(false);
        } else {
            setError(result.error || 'Failed to submit request');
        }
    };

    // Group items by category
    const itemsByCategory = availableItems.reduce((acc, item) => {
        if (!acc[item.category]) {
            acc[item.category] = [];
        }
        acc[item.category].push(item);
        return acc;
    }, {} as Record<string, AvailableItem[]>);

    const categories = Object.keys(itemsByCategory).sort();

    // Success screen
    if (isSuccess) {
        return (
            <div className="p-4 min-h-screen flex items-center justify-center">
                <div className="mx-auto max-w-lg w-full">
                    <div className="rounded-xl bg-green-900/50 border border-green-700 p-8 text-center">
                        <div className="mb-4 text-6xl">
                            &#x2705;
                        </div>
                        <h1 className="text-2xl font-bold text-white mb-2">
                            Request Submitted!
                        </h1>
                        <p className="text-green-200 mb-6">
                            The inventory team has been notified and will bring your items shortly.
                        </p>
                        <button
                            onClick={() => setIsSuccess(false)}
                            className="inline-block rounded-lg bg-green-600 px-6 py-3 font-bold text-white hover:bg-green-700 active:scale-95 transition-all"
                        >
                            Make Another Request
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="pb-32">
            {/* Header */}
            <div className="sticky top-0 z-10">
                <BrandHeader
                    title="Coffee Point Request"
                    subtitle={location.name}
                />
                <div className="bg-slate-800 border-b border-slate-700 px-4 py-2">
                    <div className="mx-auto max-w-lg flex items-center justify-end">
                        <Link
                            href={`/request/${location.slug}/history`}
                            className="rounded-lg bg-slate-700 px-3 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-600 hover:text-white transition-all"
                        >
                            History
                        </Link>
                    </div>
                </div>
            </div>

            {/* Items List */}
            <div className="mx-auto max-w-lg p-4">
                {error && (
                    <div className="mb-4 rounded-lg bg-red-900/50 border border-red-700 p-4 text-red-200">
                        {error}
                    </div>
                )}

                {availableItems.length === 0 ? (
                    <div className="rounded-xl bg-slate-800 border border-slate-700 p-8 text-center">
                        <p className="text-slate-400">
                            No items currently available. Please check back later.
                        </p>
                    </div>
                ) : (
                    <div className="space-y-6">
                        {categories.map(category => (
                            <div key={category}>
                                <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wide mb-3">
                                    {category}
                                </h2>
                                <div className="space-y-2">
                                    {itemsByCategory[category].map(item => {
                                        const qty = quantities[item.id] || 0;
                                        const hasCase = (item.quantityPerUnit || 1) > 1;
                                        const caseSize = item.quantityPerUnit || 1;
                                        const unitName = item.unitName || 'case';

                                        return (
                                            <div
                                                key={item.id}
                                                className={`rounded-xl bg-slate-800 border p-4 transition-all ${qty > 0
                                                    ? 'border-blue-500 ring-1 ring-blue-500/50'
                                                    : 'border-slate-700'
                                                    }`}
                                            >
                                                <div className="space-y-3">
                                                    <div className="flex items-center justify-between gap-4">
                                                        <div className="flex-1">
                                                            <h3 className="font-bold text-white">
                                                                {item.name}
                                                            </h3>
                                                            <p className="text-xs text-green-400 mt-0.5">
                                                                In Stock
                                                            </p>
                                                        </div>
                                                        {qty > 0 && (
                                                            <span className="rounded-full bg-blue-600 px-3 py-1 text-sm font-bold text-white">
                                                                {qty}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div className="flex flex-col gap-2">
                                                        <div className="flex gap-2">
                                                            {hasCase && (
                                                                <button
                                                                    onClick={() => updateQuantity(item.id, caseSize)}
                                                                    className="flex-1 rounded-lg bg-blue-600 px-4 py-3 text-sm font-bold text-white hover:bg-blue-700 active:scale-95 transition-all"
                                                                >
                                                                    +1 {unitName} ({caseSize})
                                                                </button>
                                                            )}
                                                            <button
                                                                onClick={() => updateQuantity(item.id, 1)}
                                                                className={`rounded-lg bg-slate-700 px-4 py-3 text-sm font-bold text-white hover:bg-slate-600 active:scale-95 transition-all ${hasCase ? 'flex-1' : 'flex-1'}`}
                                                            >
                                                                +1 item
                                                            </button>
                                                            {!hasCase && (
                                                                <button
                                                                    onClick={() => toggleCustomInput(item.id)}
                                                                    className={`flex-1 rounded-lg px-4 py-3 text-sm font-bold transition-all active:scale-95 ${customInputOpen[item.id]
                                                                            ? 'bg-blue-600 text-white'
                                                                            : 'bg-slate-600 text-white hover:bg-slate-500'
                                                                        }`}
                                                                >
                                                                    Custom
                                                                </button>
                                                            )}
                                                            {qty > 0 && (
                                                                <button
                                                                    onClick={() => setQuantity(item.id, 0)}
                                                                    className="rounded-lg bg-red-900/50 border border-red-700 px-4 py-3 text-sm font-bold text-red-200 hover:bg-red-900 active:scale-95 transition-all"
                                                                >
                                                                    Clear
                                                                </button>
                                                            )}
                                                        </div>
                                                        {!hasCase && customInputOpen[item.id] && (
                                                            <div className="flex gap-2">
                                                                <input
                                                                    type="number"
                                                                    inputMode="numeric"
                                                                    min="1"
                                                                    placeholder="Enter amount"
                                                                    value={customInputValues[item.id] || ''}
                                                                    onChange={(e) => setCustomInputValues(prev => ({ ...prev, [item.id]: e.target.value }))}
                                                                    onKeyDown={(e) => {
                                                                        if (e.key === 'Enter') {
                                                                            e.preventDefault();
                                                                            handleCustomAmountSubmit(item.id);
                                                                        }
                                                                    }}
                                                                    className="flex-1 rounded-lg bg-slate-900 border border-slate-600 px-4 py-3 text-white text-sm font-medium focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                                                                />
                                                                <button
                                                                    onClick={() => handleCustomAmountSubmit(item.id)}
                                                                    disabled={!customInputValues[item.id] || parseInt(customInputValues[item.id]) <= 0}
                                                                    className="rounded-lg bg-green-600 px-6 py-3 text-sm font-bold text-white hover:bg-green-700 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                                                >
                                                                    Add
                                                                </button>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Sticky Submit Button */}
            <div className="fixed bottom-0 left-0 right-0 bg-slate-900 border-t border-slate-700 p-4">
                <div className="mx-auto max-w-lg">
                    <button
                        onClick={() => setIsReviewOpen(true)}
                        disabled={totalItems === 0}
                        className="w-full rounded-xl bg-blue-600 py-4 text-lg font-bold text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98] transition-all shadow-lg"
                    >
                        {totalItems === 0 ? (
                            'Select Items to Request'
                        ) : (
                            `Review Request (${totalItems} item${totalItems !== 1 ? 's' : ''})`
                        )}
                    </button>
                </div>
            </div>

            {/* Review Modal */}
            {isReviewOpen && (
                <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-sm p-4 sm:items-center">
                    <div className="w-full max-w-md rounded-2xl bg-slate-900 border border-slate-700 shadow-2xl animate-slide-up max-h-[80vh] flex flex-col">
                        <div className="p-6 flex flex-col h-full">
                            <div className="flex items-center justify-between mb-4">
                                <div>
                                    <h2 className="text-xl font-bold text-white">Review Request</h2>
                                    <p className="text-sm text-blue-400">{location.name}</p>
                                </div>
                                <button
                                    onClick={() => setIsReviewOpen(false)}
                                    className="text-slate-400 hover:text-white"
                                >
                                    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>

                            {error && (
                                <div className="mb-4 rounded-lg bg-red-900/50 border border-red-700 p-3 text-red-200 text-sm">
                                    {error}
                                </div>
                            )}

                            <div className="flex-1 overflow-y-auto mb-4 space-y-2">
                                {Object.entries(quantities)
                                    .filter(([, qty]) => qty > 0)
                                    .map(([itemId, qty]) => {
                                        const item = availableItems.find(i => i.id === itemId);
                                        if (!item) return null;

                                        return (
                                            <div
                                                key={itemId}
                                                className="rounded-lg bg-slate-800 border border-slate-700 p-4 flex items-center justify-between gap-4"
                                            >
                                                <div className="flex-1">
                                                    <h3 className="font-bold text-white">{item.name}</h3>
                                                    <p className="text-xs text-slate-400">{item.category}</p>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-xl font-bold text-white">x{qty}</p>
                                                </div>
                                            </div>
                                        );
                                    })}
                            </div>

                            <form onSubmit={handleSubmit} className="space-y-3">
                                <div className="flex gap-3">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setIsReviewOpen(false);
                                            setError(null);
                                        }}
                                        className="flex-1 rounded-lg bg-slate-800 text-white font-semibold py-3 hover:bg-slate-700 border border-slate-700"
                                    >
                                        Back
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={isSubmitting}
                                        className="flex-[2] rounded-lg bg-green-600 text-white font-bold py-3 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {isSubmitting ? 'Submitting...' : 'Confirm Request'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
