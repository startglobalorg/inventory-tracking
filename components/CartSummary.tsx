'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useCart } from './CartProvider';
import { submitOrder } from '@/app/actions/order';
import { updateOrderStatus } from '@/app/actions/volunteer-orders';
import { useToast } from './ToastProvider';
import type { Item } from '@/db/schema';

export function CartSummary({ allItems }: { allItems: Item[] }) {
    const router = useRouter();
    const { items, totalItems, clearCart, linkedOrderId, addToCart } = useCart();
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
                // If linked to a volunteer order, mark it as done
                if (linkedOrderId) {
                    await updateOrderStatus(linkedOrderId, 'done');
                    showToast('Order fulfilled and stock updated!', 'success');
                } else {
                    showToast('Order submitted successfully!', 'success');
                }
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
            <div className={`fixed bottom-0 left-0 z-40 w-full border-t p-3 sm:p-4 shadow-2xl safe-area-bottom ${linkedOrderId ? 'bg-purple-900 border-purple-700' : 'bg-slate-800 border-slate-700'}`}>
                <div className="container mx-auto flex items-center justify-between gap-2 sm:gap-4">
                    <div className="flex items-center gap-2 sm:gap-3">
                        <div className={`flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-full font-bold text-white text-sm sm:text-base ${linkedOrderId ? 'bg-purple-600' : 'bg-blue-600'}`}>
                            {totalItems}
                        </div>
                        <div className="text-white">
                            <p className="font-semibold text-sm sm:text-base">
                                {linkedOrderId ? 'Fulfilling Order' : 'Items in basket'}
                            </p>
                            <p className="text-xs text-slate-400 hidden sm:block">
                                {linkedOrderId ? 'Adjust quantities if needed' : 'Review to confirm'}
                            </p>
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
                <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-sm p-4 sm:items-center" role="dialog" aria-modal="true" aria-label="Review order">
                    <div className="w-full max-w-md rounded-2xl bg-slate-900 border border-slate-700 shadow-2xl animate-slide-up max-h-[80vh] flex flex-col">
                        <div className="p-6 flex flex-col h-full">
                            <div className="flex items-center justify-between mb-4">
                                <div>
                                    <h2 className="text-xl font-bold text-white">
                                        {linkedOrderId ? 'Fulfill Order' : 'Review Order'}
                                    </h2>
                                    {linkedOrderId && (
                                        <p className="text-sm text-purple-400">
                                            Linked to volunteer request
                                        </p>
                                    )}
                                </div>
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
                                    const displayAmount = detail.amount > 0 ? `+${detail.amount}` : detail.amount;

                                    return (
                                        <div key={detail.id} className="rounded-lg bg-slate-800 p-3 space-y-2">
                                            <div className="flex justify-between items-center">
                                                <span className="font-medium text-white">{detail.name}</span>
                                                <span className={`font-bold ${detail.amount > 0 ? 'text-green-400' : 'text-red-400'}`}>
                                                    {displayAmount}
                                                </span>
                                            </div>

                                            {/* Adjustment Controls */}
                                            <div className="flex items-center gap-2">
                                                <div className="flex items-center gap-1 bg-slate-700 rounded-lg p-1">
                                                    {/* Decrease quantity (reduce consumption) */}
                                                    <button
                                                        type="button"
                                                        onClick={() => addToCart(detail.id, 1)}
                                                        className="h-8 w-8 rounded-md bg-slate-600 text-white font-bold hover:bg-slate-500 active:scale-95 transition-all"
                                                        title="Reduce quantity"
                                                    >
                                                        −
                                                    </button>

                                                    <span className="px-3 text-sm font-semibold text-white min-w-[3rem] text-center">
                                                        {Math.abs(detail.amount)}
                                                    </span>

                                                    {/* Increase quantity (add more consumption) */}
                                                    <button
                                                        type="button"
                                                        onClick={() => addToCart(detail.id, -1)}
                                                        className="h-8 w-8 rounded-md bg-slate-600 text-white font-bold hover:bg-slate-500 active:scale-95 transition-all"
                                                        title="Increase quantity"
                                                    >
                                                        +
                                                    </button>
                                                </div>

                                                {/* Remove from cart */}
                                                <button
                                                    type="button"
                                                    onClick={() => addToCart(detail.id, -detail.amount)}
                                                    className="ml-auto h-8 px-3 rounded-md bg-red-900/50 text-red-200 text-sm font-semibold hover:bg-red-900 border border-red-800 active:scale-95 transition-all"
                                                    title="Remove from cart"
                                                >
                                                    Remove
                                                </button>
                                            </div>
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
                                        className={`flex-[2] rounded-lg text-white font-bold py-3 disabled:opacity-50 disabled:cursor-not-allowed ${linkedOrderId ? 'bg-purple-600 hover:bg-purple-700' : 'bg-green-600 hover:bg-green-700'}`}
                                    >
                                        {isSubmitting ? 'Submitting...' : linkedOrderId ? 'Fulfill Order' : 'Confirm Order'}
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
