import { db } from '@/db/db';
import { items } from '@/db/schema';
import { InventoryList } from '@/components/InventoryList';
import { CartProvider } from '@/components/CartProvider';
import { CartSummary } from '@/components/CartSummary';
import { ToastProvider } from '@/components/ToastProvider';

export default async function RestockPage() {
    const allItems = await db.select().from(items).orderBy(items.name);

    return (
        <ToastProvider>
            <CartProvider>
                <InventoryList initialItems={allItems} mode="restock" />
                <CartSummary allItems={allItems} />
            </CartProvider>
        </ToastProvider>
    );
}
