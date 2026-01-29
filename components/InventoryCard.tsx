'use client';

import Image from 'next/image';
import Link from 'next/link';
import type { Item } from '@/db/schema';
import { useCart } from './CartProvider';

export function InventoryCard({ item, mode = 'consume' }: { item: Item; mode?: 'consume' | 'restock' }) {
    const { addToCart, getItemChange } = useCart();

    const currentChange = getItemChange(item.id);
    const optimisticStock = item.stock + currentChange;

    const isLowStock = optimisticStock <= item.minThreshold;
    const hasBatchOption = (item.quantityPerUnit || 1) > 1;
    const batchSize = item.quantityPerUnit || 1;
    const unitName = item.unitName || 'case';

    return (
        <div className={`group relative overflow-hidden rounded-xl border bg-slate-800 shadow-lg transition-all hover:shadow-xl ${currentChange !== 0 ? 'border-blue-500 ring-1 ring-blue-500/50' : 'border-slate-700 hover:border-slate-600'
            }`}>
            {/* Image Section */}
            {item.imageUrl && (
                <div className="relative h-32 w-full overflow-hidden bg-slate-700">
                    <Image
                        src={item.imageUrl}
                        alt={item.name}
                        fill
                        className="object-cover opacity-75 transition-opacity group-hover:opacity-100"
                    />
                    {currentChange !== 0 && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-[2px]">
                            <div className="rounded-full bg-blue-600 px-3 py-1 text-sm font-bold text-white shadow-lg">
                                {currentChange > 0 ? '+' : ''}{currentChange} in basket
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Content */}
            <div className="p-4">
                {/* Header with Low Stock Badge */}
                <div className="mb-3 flex items-start justify-between gap-2">
                    <div className="flex-1">
                        <Link href={`/item/${item.id}`} className="hover:underline">
                            <h3 className="text-lg font-bold text-white line-clamp-2">
                                {item.name}
                            </h3>
                        </Link>
                        <p className="mt-1 text-xs text-slate-400">{item.category}</p>
                    </div>
                    {isLowStock && (
                        <span className="shrink-0 rounded-full bg-orange-500 px-2 py-1 text-xs font-bold text-white">
                            LOW
                        </span>
                    )}
                </div>

                {/* Stock Display */}
                <div className="mb-4 rounded-lg bg-slate-900 p-3 text-center">
                    <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                        Stock
                    </p>
                    <div className="flex items-center justify-center gap-2">
                        <p
                            className={`text-4xl font-black ${isLowStock ? 'text-orange-400' : 'text-green-400'
                                }`}
                        >
                            {optimisticStock}
                        </p>
                        {currentChange !== 0 && (
                            <span className="text-sm font-medium text-slate-500">
                                ({item.stock} orig)
                            </span>
                        )}
                    </div>
                    <p className="mt-1 text-xs text-slate-500">
                        Min: {item.minThreshold}
                    </p>
                </div>

                {/* Action Buttons */}
                <div className="grid gap-2">
                    {/* Single Unit Buttons */}
                    <div className="grid grid-cols-2 gap-2">
                        {mode === 'consume' ? (
                            <button
                                onClick={() => addToCart(item.id, -1)}
                                disabled={optimisticStock <= 0}
                                className="col-span-2 flex items-center justify-center gap-2 rounded-lg bg-red-600 py-3 font-bold text-white transition-all hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50 active:scale-95"
                            >
                                <span className="text-xl">− Take 1</span>
                            </button>
                        ) : (
                            <button
                                onClick={() => addToCart(item.id, 1)}
                                className="col-span-2 flex items-center justify-center gap-2 rounded-lg bg-green-600 py-3 font-bold text-white transition-all hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50 active:scale-95"
                            >
                                <span className="text-xl">+ Add 1</span>
                            </button>
                        )}
                    </div>

                    {/* Batch Buttons (only if batch size > 1) */}
                    {hasBatchOption && (
                        <div className="grid grid-cols-2 gap-2">
                            {mode === 'consume' ? (
                                <button
                                    onClick={() => addToCart(item.id, -batchSize)}
                                    disabled={optimisticStock < batchSize}
                                    className="col-span-2 flex items-center justify-center gap-2 rounded-lg bg-red-900/50 py-2 text-sm font-semibold text-red-200 transition-all hover:bg-red-900 disabled:cursor-not-allowed disabled:opacity-50 active:scale-95 border border-red-800"
                                >
                                    <span>− Take {batchSize} {unitName}</span>
                                </button>
                            ) : (
                                <button
                                    onClick={() => addToCart(item.id, batchSize)}
                                    className="col-span-2 flex items-center justify-center gap-2 rounded-lg bg-green-900/50 py-2 text-sm font-semibold text-green-200 transition-all hover:bg-green-900 disabled:cursor-not-allowed disabled:opacity-50 active:scale-95 border border-green-800"
                                >
                                    <span>+ Add {batchSize} {unitName}</span>
                                </button>
                            )}
                        </div>
                    )}
                </div>

                {/* SKU */}
                <p className="mt-3 text-center font-mono text-xs text-slate-500">
                    {item.sku}
                </p>
            </div>
        </div>
    );
}
