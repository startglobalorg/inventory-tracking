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
                    <div className="mb-3 sm:mb-4">
                        <div className="flex items-start justify-between gap-2 mb-3">
                            <div>
                                <h1 className="text-xl sm:text-2xl md:text-3xl font-black text-white">
                                    Inventory Management
                                </h1>
                                <p className="mt-1 text-xs sm:text-sm text-slate-400">
                                    {mode === 'restock' ? 'Restock Mode' : ''}
                                </p>
                            </div>
                            <div className="hidden sm:block">
                                <div className="text-2xl font-black text-white">{stats.totalItems}</div>
                                <div className="text-xs text-slate-400">Items</div>
                            </div>
                        </div>
                        {/* Action Buttons */}
                        <div className="flex items-center gap-2 flex-wrap">
                            {mode === 'consume' && (
                                <>
                                    <Link
                                        href="/add-item"
                                        className="rounded-lg bg-blue-600 px-3 sm:px-4 py-2 text-xs sm:text-sm font-semibold text-white transition-all hover:bg-blue-700"
                                    >
                                        + Add
                                    </Link>
                                    <Link
                                        href="/restock"
                                        className="rounded-lg bg-slate-800 px-3 sm:px-4 py-2 text-xs sm:text-sm font-semibold text-blue-400 transition-hover border border-slate-700 hover:border-blue-500 hover:text-blue-300"
                                    >
                                        Restock
                                    </Link>
                                </>
                            )}
                            {mode === 'restock' && (
                                <Link
                                    href="/"
                                    className="rounded-lg bg-slate-800 px-3 sm:px-4 py-2 text-xs sm:text-sm font-semibold text-slate-400 transition-hover border border-slate-700 hover:border-slate-500 hover:text-white"
                                >
                                    ← Back
                                </Link>
                            )}
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
                <div className="container mx-auto px-4 py-3 sm:py-4">
                    <div className="grid grid-cols-2 gap-2 sm:gap-3 md:grid-cols-4">
                        <div className="rounded-lg bg-slate-800 p-2 sm:p-3">
                            <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                                Total Items
                            </p>
                            <p className="mt-1 text-xl sm:text-2xl font-black text-white">{stats.totalItems}</p>
                        </div>
                        <div className="rounded-lg bg-slate-800 p-2 sm:p-3">
                            <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                                Low Stock
                            </p>
                            <p className="mt-1 text-xl sm:text-2xl font-black text-orange-400">{stats.lowStock}</p>
                        </div>
                        <div className="rounded-lg bg-slate-800 p-2 sm:p-3">
                            <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                                Categories
                            </p>
                            <p className="mt-1 text-xl sm:text-2xl font-black text-white">{stats.categories}</p>
                        </div>
                        <div className="rounded-lg bg-slate-800 p-2 sm:p-3">
                            <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                                Total Stock
                            </p>
                            <p className="mt-1 text-xl sm:text-2xl font-black text-green-400">{stats.totalStock}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <main className="container mx-auto px-4 py-4 sm:py-6 pb-24 sm:pb-28">
                {filteredItems.length === 0 ? (
                    <div className="rounded-xl bg-slate-900 p-8 sm:p-12 text-center">
                        <p className="text-lg sm:text-xl font-bold text-white">
                            {searchQuery ? `No items found matching "${searchQuery}"` : 'No items in inventory'}
                        </p>
                        <p className="mt-2 text-sm sm:text-base text-slate-400">
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
                    <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                        {filteredItems.map((item) => (
                            <InventoryCard key={item.id} item={item} mode={mode} />
                        ))}
                    </div>
                )}
            </main>
        </div>
    );
}
