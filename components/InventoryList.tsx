'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import type { Item } from '@/db/schema';
import { InventoryCard } from '@/components/InventoryCard';

export function InventoryList({ initialItems, mode = 'consume' }: { initialItems: Item[]; mode?: 'consume' | 'restock' }) {
    const [searchQuery, setSearchQuery] = useState('');

    // Client-side filtering
    const filteredItems = useMemo(() => {
        if (!searchQuery.trim()) return initialItems;

        const query = searchQuery.toLowerCase();
        return initialItems.filter(
            (item) =>
                item.name.toLowerCase().includes(query) ||
                item.sku.toLowerCase().includes(query) ||
                item.category.toLowerCase().includes(query)
        );
    }, [initialItems, searchQuery]);

    const stats = useMemo(() => {
        const totalItems = filteredItems.length;
        const lowStock = filteredItems.filter((item) => item.stock <= item.minThreshold).length;
        const totalStock = filteredItems.reduce((sum, item) => sum + item.stock, 0);
        const categories = new Set(filteredItems.map((item) => item.category)).size;

        return { totalItems, lowStock, totalStock, categories };
    }, [filteredItems]);

    return (
        <div className="min-h-screen bg-slate-950">
            {/* Sticky Header */}
            <header className="sticky top-0 z-40 border-b border-slate-800 bg-slate-900/95 backdrop-blur-sm">
                <div className="container mx-auto px-4 py-4">
                    {/* Title */}
                    <div className="mb-4 flex items-center justify-between">
                        <div>
                            <h1 className="text-2xl font-black text-white sm:text-3xl">
                                ☕ Coffee Point
                            </h1>
                            <p className="mt-1 text-sm text-slate-400">
                                {mode === 'restock' ? 'Restock Mode' : 'Inventory Management'}
                            </p>
                        </div>
                        {/* Action | Stats */}
                        <div className="text-right flex items-center gap-4">
                            {mode === 'consume' && (
                                <Link
                                    href="/restock"
                                    className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-semibold text-blue-400 transition-hover border border-slate-700 hover:border-blue-500 hover:text-blue-300"
                                >
                                    Supplier Restock →
                                </Link>
                            )}
                            {mode === 'restock' && (
                                <Link
                                    href="/"
                                    className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-semibold text-slate-400 transition-hover border border-slate-700 hover:border-slate-500 hover:text-white"
                                >
                                    ← Back
                                </Link>
                            )}
                            <div>
                                <div className="text-2xl font-black text-white">{stats.totalItems}</div>
                                <div className="text-xs text-slate-400">Items</div>
                            </div>
                        </div>
                    </div>

                    {/* Search Bar */}
                    <div className="relative">
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search by name, SKU, or category..."
                            className="w-full rounded-lg border-2 border-slate-700 bg-slate-800 px-4 py-3 pl-12 text-white placeholder-slate-500 transition-all focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                        />
                        <svg
                            className="absolute left-4 top-3.5 h-5 w-5 text-slate-400"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                            />
                        </svg>
                        {searchQuery && (
                            <button
                                onClick={() => setSearchQuery('')}
                                className="absolute right-3 top-3 rounded-full p-1 text-slate-400 hover:bg-slate-700 hover:text-white"
                            >
                                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M6 18L18 6M6 6l12 12"
                                    />
                                </svg>
                            </button>
                        )}
                    </div>
                </div>
            </header>

            {/* Stats Dashboard */}
            <div className="border-b border-slate-800 bg-slate-900">
                <div className="container mx-auto px-4 py-4">
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                        <div className="rounded-lg bg-slate-800 p-3">
                            <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                                Total Items
                            </p>
                            <p className="mt-1 text-2xl font-black text-white">{stats.totalItems}</p>
                        </div>
                        <div className="rounded-lg bg-slate-800 p-3">
                            <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                                Low Stock
                            </p>
                            <p className="mt-1 text-2xl font-black text-orange-400">{stats.lowStock}</p>
                        </div>
                        <div className="rounded-lg bg-slate-800 p-3">
                            <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                                Categories
                            </p>
                            <p className="mt-1 text-2xl font-black text-white">{stats.categories}</p>
                        </div>
                        <div className="rounded-lg bg-slate-800 p-3">
                            <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                                Total Stock
                            </p>
                            <p className="mt-1 text-2xl font-black text-green-400">{stats.totalStock}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <main className="container mx-auto px-4 py-6">
                {filteredItems.length === 0 ? (
                    <div className="rounded-xl bg-slate-900 p-12 text-center">
                        <div className="mb-4 text-6xl">📦</div>
                        <p className="text-xl font-bold text-white">
                            {searchQuery ? `No items found matching "${searchQuery}"` : 'No items in inventory'}
                        </p>
                        <p className="mt-2 text-slate-400">
                            {searchQuery ? 'Try a different search term' : 'Add items to get started'}
                        </p>
                        {searchQuery && (
                            <button
                                onClick={() => setSearchQuery('')}
                                className="mt-4 rounded-lg bg-blue-600 px-6 py-2 font-medium text-white hover:bg-blue-700"
                            >
                                Clear Search
                            </button>
                        )}
                    </div>
                ) : (
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                        {filteredItems.map((item) => (
                            <InventoryCard key={item.id} item={item} mode={mode} />
                        ))}
                    </div>
                )}
            </main>

            {/* Floating Action Button (FAB) */}
            <Link
                href="/scan"
                className="fixed bottom-6 right-6 z-50 flex h-16 w-16 items-center justify-center rounded-full bg-blue-600 text-white shadow-2xl transition-all hover:scale-110 hover:bg-blue-700 active:scale-95"
            >
                <svg className="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z"
                    />
                </svg>
                <span className="absolute -bottom-8 whitespace-nowrap rounded bg-slate-900 px-2 py-1 text-xs font-medium opacity-0 transition-opacity group-hover:opacity-100">
                    Scan QR
                </span>
            </Link>
        </div>
    );
}
