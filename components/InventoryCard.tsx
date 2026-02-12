'use client';

import { useState } from 'react';
import Link from 'next/link';
import type { Item } from '@/db/schema';
import { useCart } from './CartProvider';

export function InventoryCard({ item, mode = 'consume' }: { item: Item; mode?: 'consume' | 'restock' }) {
    const { addToCart, getItemChange } = useCart();
    const [customAmount, setCustomAmount] = useState('');
    const [customUnits, setCustomUnits] = useState('');

    const currentChange = getItemChange(item.id);
    const optimisticStock = item.stock + currentChange;

    const isLowStock = optimisticStock <= item.minThreshold;
    const hasBatchOption = (item.quantityPerUnit || 1) > 1;
    const batchSize = item.quantityPerUnit || 1;
    const unitName = item.unitName || 'case';

    return (
        <div className={`group relative overflow-hidden rounded-xl border bg-slate-800 shadow-lg transition-all hover:shadow-xl ${currentChange !== 0 ? 'border-blue-500 ring-1 ring-blue-500/50' : 'border-slate-700 hover:border-slate-600'
            }`}>
            {/* Content */}
            <div className="p-3 sm:p-4">
                {/* Header with Badges */}
                <div className="mb-3 flex items-start justify-between gap-2">
                    <div className="flex-1">
                        <Link href={`/item/${item.id}`} className="hover:underline">
                            <h3 className="text-base sm:text-lg font-bold text-white line-clamp-2">
                                {item.name}
                            </h3>
                        </Link>
                        <p className="mt-1 text-xs text-slate-400">{item.category}</p>
                    </div>
                    <div className="shrink-0 flex flex-col gap-1 items-end">
                        {isLowStock && (
                            <span className="rounded-full bg-orange-500 px-2 py-1 text-xs font-bold text-white">
                                LOW
                            </span>
                        )}
                        {currentChange !== 0 && (
                            <span className="rounded-full bg-blue-600 px-2 py-1 text-xs font-bold text-white">
                                {currentChange > 0 ? '+' : ''}{currentChange} in basket
                            </span>
                        )}
                    </div>
                </div>

                {/* Stock Display */}
                <div className="mb-3 sm:mb-4 rounded-lg bg-slate-900 p-2 sm:p-3 text-center">
                    <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                        Stock
                    </p>
                    <div className="flex items-center justify-center gap-2">
                        <p
                            className={`text-3xl sm:text-4xl font-black ${isLowStock ? 'text-orange-400' : 'text-green-400'
                                }`}
                        >
                            {optimisticStock}
                        </p>
                        {currentChange !== 0 && (
                            <span className="text-xs sm:text-sm font-medium text-slate-500">
                                ({item.stock})
                            </span>
                        )}
                    </div>
                    <p className="mt-1 text-xs text-slate-500">
                        Min: {item.minThreshold}
                    </p>
                </div>

                {/* Action Buttons */}
                <div className="grid gap-2 w-full">
                    {mode === 'consume' ? (
                        <>
                            {/* Batch Amount Button - Large */}
                            {hasBatchOption && (
                                <button
                                    onClick={() => addToCart(item.id, -batchSize)}
                                    disabled={optimisticStock < batchSize}
                                    className="w-full rounded-lg bg-red-600 px-2 sm:px-6 py-3 sm:py-4 text-sm sm:text-lg font-bold text-white transition-all hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50 active:scale-95 shadow-lg truncate"
                                >
                                    Take {batchSize} ({unitName})
                                </button>
                            )}

                            {/* Custom Units Input */}
                            {hasBatchOption && (
                                <div className="flex gap-2 w-full max-w-full">
                                    <div className="flex-1 flex gap-1 min-w-0 overflow-hidden">
                                        <input
                                            type="number"
                                            value={customUnits}
                                            onChange={(e) => setCustomUnits(e.target.value)}
                                            placeholder="Units"
                                            className="flex-1 min-w-0 rounded-lg bg-slate-900 border border-slate-700 text-white px-2 sm:px-3 py-2 text-sm sm:text-base text-center focus:ring-2 focus:ring-red-500 focus:border-transparent"
                                            min="1"
                                        />
                                        <span className="flex items-center px-1 sm:px-2 text-xs sm:text-sm text-slate-400 whitespace-nowrap shrink-0">
                                            {unitName}s
                                        </span>
                                    </div>
                                    <button
                                        onClick={() => {
                                            const units = parseInt(customUnits);
                                            if (units > 0) {
                                                addToCart(item.id, -(units * batchSize));
                                                setCustomUnits('');
                                            }
                                        }}
                                        disabled={!customUnits || parseInt(customUnits) <= 0 || optimisticStock <= 0}
                                        className="shrink-0 w-16 sm:w-20 rounded-lg bg-red-600 px-2 sm:px-4 py-2 text-sm sm:text-base font-bold text-white transition-all hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50 active:scale-95"
                                    >
                                        Take
                                    </button>
                                </div>
                            )}

                            {/* Custom Amount Input (Individual Items) */}
                            <div className="flex gap-2 w-full max-w-full">
                                <input
                                    type="number"
                                    value={customAmount}
                                    onChange={(e) => setCustomAmount(e.target.value)}
                                    placeholder="Custom items"
                                    className="flex-1 min-w-0 rounded-lg bg-slate-900 border border-slate-700 text-white px-2 sm:px-3 py-2 text-sm text-center focus:ring-2 focus:ring-red-500 focus:border-transparent"
                                    min="1"
                                />
                                <button
                                    onClick={() => {
                                        const amount = parseInt(customAmount);
                                        if (amount > 0) {
                                            addToCart(item.id, -amount);
                                            setCustomAmount('');
                                        }
                                    }}
                                    disabled={!customAmount || parseInt(customAmount) <= 0 || optimisticStock <= 0}
                                    className="shrink-0 w-16 sm:w-20 rounded-lg bg-red-600 px-2 sm:px-4 py-2 text-sm font-bold text-white transition-all hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50 active:scale-95"
                                >
                                    Take
                                </button>
                            </div>
                        </>
                    ) : (
                        <>
                            {/* Custom Units Input for Restock */}
                            {hasBatchOption && (
                                <div className="flex gap-2 w-full max-w-full">
                                    <div className="flex-1 flex gap-1 min-w-0 overflow-hidden">
                                        <input
                                            type="number"
                                            value={customUnits}
                                            onChange={(e) => setCustomUnits(e.target.value)}
                                            placeholder="Units"
                                            className="flex-1 min-w-0 rounded-lg bg-slate-900 border border-slate-700 text-white px-2 sm:px-3 py-2 text-sm sm:text-base text-center focus:ring-2 focus:ring-green-500 focus:border-transparent"
                                            min="1"
                                        />
                                        <span className="flex items-center px-1 sm:px-2 text-xs sm:text-sm text-slate-400 whitespace-nowrap shrink-0">
                                            {unitName}s
                                        </span>
                                    </div>
                                    <button
                                        onClick={() => {
                                            const units = parseInt(customUnits);
                                            if (units > 0) {
                                                addToCart(item.id, units * batchSize);
                                                setCustomUnits('');
                                            }
                                        }}
                                        disabled={!customUnits || parseInt(customUnits) <= 0}
                                        className="shrink-0 w-16 sm:w-20 rounded-lg bg-green-600 px-2 sm:px-4 py-2 text-sm sm:text-base font-bold text-white transition-all hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50 active:scale-95"
                                    >
                                        Add
                                    </button>
                                </div>
                            )}

                            {/* Custom Amount Input for Restock (Individual Items) */}
                            <div className="flex gap-2 w-full max-w-full">
                                <input
                                    type="number"
                                    value={customAmount}
                                    onChange={(e) => setCustomAmount(e.target.value)}
                                    placeholder="Custom items"
                                    className="flex-1 min-w-0 rounded-lg bg-slate-900 border border-slate-700 text-white px-2 sm:px-3 py-2 text-sm text-center focus:ring-2 focus:ring-green-500 focus:border-transparent"
                                    min="1"
                                />
                                <button
                                    onClick={() => {
                                        const amount = parseInt(customAmount);
                                        if (amount > 0) {
                                            addToCart(item.id, amount);
                                            setCustomAmount('');
                                        }
                                    }}
                                    disabled={!customAmount || parseInt(customAmount) <= 0}
                                    className="shrink-0 w-16 sm:w-20 rounded-lg bg-green-600 px-2 sm:px-4 py-2 text-sm font-bold text-white transition-all hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50 active:scale-95"
                                >
                                    Add
                                </button>
                            </div>
                        </>
                    )}
                </div>

                {/* SKU - Only show in restock mode */}
                {mode === 'restock' && (
                    <p className="mt-3 text-center font-mono text-xs text-slate-500">
                        {item.sku}
                    </p>
                )}
            </div>
        </div>
    );
}
