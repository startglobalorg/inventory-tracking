'use client';

import { createContext, useContext, useState, ReactNode, useCallback } from 'react';

export interface CartItem {
    itemId: string;
    change: number; // Positive (restock) or negative (consume)
}

interface CartContextType {
    items: Record<string, number>; // itemId -> total change
    addToCart: (itemId: string, amount: number) => void;
    setCartItems: (items: Record<string, number>) => void;
    clearCart: () => void;
    getItemChange: (itemId: string) => number;
    totalItems: number;
    linkedOrderId: string | null;
    setLinkedOrderId: (orderId: string | null) => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: ReactNode }) {
    const [items, setItems] = useState<Record<string, number>>({});
    const [linkedOrderId, setLinkedOrderIdState] = useState<string | null>(null);

    const addToCart = useCallback((itemId: string, amount: number) => {
        setItems((prev) => {
            const currentChange = prev[itemId] || 0;
            const newChange = currentChange + amount;

            if (newChange === 0) {
                const { [itemId]: _, ...rest } = prev;
                return rest;
            }

            return {
                ...prev,
                [itemId]: newChange,
            };
        });
    }, []);

    const setCartItems = useCallback((newItems: Record<string, number>) => {
        setItems(newItems);
    }, []);

    const clearCart = useCallback(() => {
        setItems({});
        setLinkedOrderIdState(null);
    }, []);

    const setLinkedOrderId = useCallback((orderId: string | null) => {
        setLinkedOrderIdState(orderId);
    }, []);

    const getItemChange = useCallback((itemId: string) => {
        return items[itemId] || 0;
    }, [items]);

    const totalItems = Object.keys(items).length;

    return (
        <CartContext.Provider value={{ items, addToCart, setCartItems, clearCart, getItemChange, totalItems, linkedOrderId, setLinkedOrderId }}>
            {children}
        </CartContext.Provider>
    );
}

export function useCart() {
    const context = useContext(CartContext);
    if (!context) {
        throw new Error('useCart must be used within CartProvider');
    }
    return context;
}
