'use client';

import { useEffect, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useCart } from './CartProvider';
import { useToast } from './ToastProvider';

export function CartInitializer() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const { setCartItems, setLinkedOrderId, items } = useCart();
    const { showToast } = useToast();
    const initialized = useRef(false);

    useEffect(() => {
        // Only initialize once and only if cart is empty
        if (initialized.current || Object.keys(items).length > 0) return;

        const loadCart = searchParams.get('loadCart');
        const orderId = searchParams.get('orderId');

        if (loadCart) {
            try {
                const cartData = JSON.parse(decodeURIComponent(loadCart));
                setCartItems(cartData);

                if (orderId) {
                    setLinkedOrderId(orderId);
                }

                initialized.current = true;
                showToast('Order loaded into cart. Review and submit when ready.', 'info');

                // Clean up URL parameters
                router.replace('/', { scroll: false });
            } catch (error) {
                console.error('Failed to parse cart data:', error);
                showToast('Failed to load order data', 'error');
            }
        }
    }, [searchParams, setCartItems, setLinkedOrderId, showToast, router, items]);

    return null;
}
