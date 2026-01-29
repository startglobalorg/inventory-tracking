'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useState, useTransition } from 'react';

export function SearchBar({ initialSearch }: { initialSearch: string }) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [isPending, startTransition] = useTransition();
    const [search, setSearch] = useState(initialSearch);

    const handleSearch = (value: string) => {
        setSearch(value);
        startTransition(() => {
            const params = new URLSearchParams(searchParams);
            if (value) {
                params.set('search', value);
            } else {
                params.delete('search');
            }
            router.push(`/?${params.toString()}`);
        });
    };

    return (
        <div className="relative">
            <input
                type="text"
                value={search}
                onChange={(e) => handleSearch(e.target.value)}
                placeholder="Search by name, SKU, or category..."
                className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 pl-11 text-slate-900 placeholder-slate-400 shadow-sm transition-all focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-50 dark:placeholder-slate-500"
            />
            <svg
                className="absolute left-3 top-3.5 h-5 w-5 text-slate-400"
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
            {isPending && (
                <div className="absolute right-3 top-3.5">
                    <div className="h-5 w-5 animate-spin rounded-full border-2 border-slate-300 border-t-blue-600"></div>
                </div>
            )}
        </div>
    );
}
