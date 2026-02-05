'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useCart } from './CartProvider';
import { submitOrder } from '@/app/actions/order';
import { useToast } from './ToastProvider';
import type { Item } from '@/db/schema';

export function CartSummary({ allItems }: { allItems: Item[] }) {
    const router = useRouter();
    const { items, totalItems, clearCart } = useCart();
    const { showToast } = useToast();
    const [isOpen, setIsOpen] = useState(false);
    const [userName, setUserName] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    if (totalItems === 0) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!userName.trim()) {
            showToast('Please enter your name', 'error');
            return;
        }

        setIsSubmitting(true);

        try {
            // Add timeout to prevent hanging indefinitely (30 seconds)
            const timeoutPromise = new Promise<never>((_, reject) => {
                setTimeout(() => reject(new Error('Request timed out')), 30000);
            });

            const result = await Promise.race([
                submitOrder(items, userName),
                timeoutPromise
            ]);

            if (result.success) {
                showToast('Order submitted successfully!', 'success');
                clearCart();
                setIsOpen(false);
                setUserName('');
                // Force refresh the page data
                router.refresh();
            } else {
                showToast(result.error || 'Failed to submit order', 'error');
            }
        } catch (error) {
            console.error('Error in handleSubmit:', error);
            if (error instanceof Error && error.message === 'Request timed out') {
                showToast('Request timed out. Please check your connection and try again.', 'error');
            } else {
                showToast('An unexpected error occurred. Please try again.', 'error');
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    // derived state for cart display
    const cartDetails = Object.entries(items).map(([id, amount]) => {
        const item = allItems.find((i) => i.id === id);
        return {
            id,
            amount,
            name: item?.name || 'Unknown Item',
            unitName: item?.unitName || 'unit',
            quantityPerUnit: item?.quantityPerUnit || 1,
        };
    });

    return (
        <>
            {/* Floating Bar */}
            <div className="fixed bottom-0 left-0 z-40 w-full bg-slate-800 border-t border-slate-700 p-3 sm:p-4 shadow-2xl safe-area-bottom">
                <div className="container mx-auto flex items-center justify-between gap-2 sm:gap-4">
                    <div className="flex items-center gap-2 sm:gap-3">
                        <div className="flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-full bg-blue-600 font-bold text-white text-sm sm:text-base">
                            {totalItems}
                        </div>
                        <div className="text-white">
                            <p className="font-semibold text-sm sm:text-base">Items in basket</p>
                            <p className="text-xs text-slate-400 hidden sm:block">Review to confirm</p>
                        </div>
                    </div>
                    <button
                        onClick={() => setIsOpen(true)}
                        className="rounded-lg bg-green-600 px-4 sm:px-6 py-2 sm:py-2.5 text-sm sm:text-base font-bold text-white transition-colors hover:bg-green-700 active:scale-95"
                    >
                        Review
                    </button>
                </div>
            </div>

            {/* Review Modal / Sheet */}
            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-sm p-4 sm:items-center">
                    <div className="w-full max-w-md rounded-2xl bg-slate-900 border border-slate-700 shadow-2xl animate-slide-up max-h-[80vh] flex flex-col">
                        <div className="p-6 flex flex-col h-full">
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="text-xl font-bold text-white">Review Order</h2>
                                <button
                                    onClick={() => setIsOpen(false)}
                                    className="text-slate-400 hover:text-white"
                                >
                                    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>

                            {/* Scrollable Items List */}
                            <div className="flex-1 overflow-y-auto mb-6 pr-2 space-y-3">
                                {cartDetails.map((detail) => {
                                    const isCase = Math.abs(detail.amount) >= detail.quantityPerUnit && detail.quantityPerUnit > 1;
                                    const displayAmount = detail.amount > 0 ? `+${detail.amount}` : detail.amount;

                                    return (
                                        <div key={detail.id} className="flex justify-between items-center rounded-lg bg-slate-800 p-3">
                                            <span className="font-medium text-white">{detail.name}</span>
                                            <span className={`font-bold ${detail.amount > 0 ? 'text-green-400' : 'text-red-400'}`}>
                                                {displayAmount}
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>

                            <div className="text-sm text-slate-500 mb-4">
                                Please enter your name to confirm updates.
                            </div>

                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div>
                                    <label htmlFor="name" className="block text-sm font-medium text-slate-400 mb-1">
                                        Your Name
                                    </label>
                                    <input
                                        type="text"
                                        id="name"
                                        value={userName}
                                        onChange={(e) => setUserName(e.target.value)}
                                        className="w-full rounded-lg bg-slate-800 border-slate-700 text-white px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        placeholder="e.g. John Doe"
                                        autoFocus
                                    />
                                </div>

                                <div className="flex gap-3">
                                    <button
                                        type="button"
                                        onClick={() => clearCart()}
                                        className="flex-1 rounded-lg bg-red-900/50 text-red-200 font-semibold py-3 hover:bg-red-900 border border-red-800"
                                    >
                                        Clear All
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={isSubmitting}
                                        className="flex-[2] rounded-lg bg-green-600 text-white font-bold py-3 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {isSubmitting ? 'Submitting...' : 'Confirm Order'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
