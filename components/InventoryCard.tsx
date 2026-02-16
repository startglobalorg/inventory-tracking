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

    const isConsume = mode === 'consume';
    const buttonColor = isConsume ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700';
    const focusColor = isConsume ? 'focus:ring-red-500' : 'focus:ring-green-500';

    return (
        <div className={`rounded-xl border bg-slate-800 shadow-lg relative ${
            currentChange !== 0
                ? 'border-blue-500 ring-1 ring-blue-500/50'
                : item.coldStorage
                    ? 'border-blue-400'
                    : 'border-slate-700'
        }`}>
            {item.coldStorage && (
                <div className="absolute top-2 right-2 text-2xl" title="Cold Storage Item">
                    ❄️
                </div>
            )}
            <div className="p-4">
                {/* Title */}
                <div className="mb-3">
                    <Link href={`/item/${item.id}`} className="hover:underline">
                        <h3 className="text-lg font-bold text-white">{item.name}</h3>
                    </Link>
                    <p className="text-xs text-slate-400">{item.category}</p>
                    {isLowStock && (
                        <span className="inline-block mt-1 rounded-full bg-orange-500 px-2 py-0.5 text-xs font-bold text-white">
                            LOW STOCK
                        </span>
                    )}
                    {currentChange !== 0 && (
                        <span className="inline-block mt-1 ml-1 rounded-full bg-blue-600 px-2 py-0.5 text-xs font-bold text-white">
                            {currentChange > 0 ? '+' : ''}{currentChange} in basket
                        </span>
                    )}
                </div>

                {/* Stock */}
                <div className="mb-4 rounded-lg bg-slate-900 p-3 text-center">
                    <p className="text-xs text-slate-400 uppercase">Stock</p>
                    <p className={`text-4xl font-black ${isLowStock ? 'text-orange-400' : 'text-green-400'}`}>
                        {optimisticStock}
                    </p>
                    <p className="text-xs text-slate-500">Min: {item.minThreshold}</p>
                </div>

                {/* Action Rows */}
                <div className="space-y-2">
                    {/* Quick batch button (consume mode only) */}
                    {isConsume && hasBatchOption && (
                        <button
                            onClick={() => addToCart(item.id, -batchSize)}
                            disabled={optimisticStock < batchSize}
                            className={`w-full rounded-lg ${buttonColor} py-3 text-base font-bold text-white disabled:opacity-50`}
                        >
                            Take {batchSize} ({unitName})
                        </button>
                    )}

                    {/* Units row */}
                    {hasBatchOption && (
                        <div style={{ display: 'flex', gap: '8px' }}>
                            <input
                                type="number"
                                value={customUnits}
                                onChange={(e) => setCustomUnits(e.target.value)}
                                placeholder={`# ${unitName}s`}
                                min="1"
                                className={`flex-1 rounded-lg bg-slate-900 border border-slate-700 text-white px-3 py-2 text-center ${focusColor} focus:ring-2`}
                                style={{ minWidth: 0 }}
                            />
                            <button
                                onClick={() => {
                                    const units = parseInt(customUnits, 10);
                                    if (units > 0) {
                                        addToCart(item.id, isConsume ? -(units * batchSize) : units * batchSize);
                                        setCustomUnits('');
                                    }
                                }}
                                disabled={!customUnits || parseInt(customUnits, 10) <= 0 || (isConsume && parseInt(customUnits, 10) * batchSize > optimisticStock)}
                                className={`rounded-lg ${buttonColor} px-4 py-2 font-bold text-white disabled:opacity-50`}
                                style={{ flexShrink: 0 }}
                            >
                                {isConsume ? 'Take' : 'Add'}
                            </button>
                        </div>
                    )}

                    {/* Custom items row */}
                    <div style={{ display: 'flex', gap: '8px' }}>
                        <input
                            type="number"
                            value={customAmount}
                            onChange={(e) => setCustomAmount(e.target.value)}
                            placeholder="# items"
                            min="1"
                            className={`flex-1 rounded-lg bg-slate-900 border border-slate-700 text-white px-3 py-2 text-center ${focusColor} focus:ring-2`}
                            style={{ minWidth: 0 }}
                        />
                        <button
                            onClick={() => {
                                const amount = parseInt(customAmount, 10);
                                if (amount > 0) {
                                    addToCart(item.id, isConsume ? -amount : amount);
                                    setCustomAmount('');
                                }
                            }}
                            disabled={!customAmount || parseInt(customAmount, 10) <= 0 || (isConsume && parseInt(customAmount, 10) > optimisticStock)}
                            className={`rounded-lg ${buttonColor} px-4 py-2 font-bold text-white disabled:opacity-50`}
                            style={{ flexShrink: 0 }}
                        >
                            {isConsume ? 'Take' : 'Add'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
