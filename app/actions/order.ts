'use server';

import { db } from '@/db/db';
import { items, logs } from '@/db/schema';
import { eq, sql } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { notifyLowStock } from './webhook';

export async function submitOrder(
    cartItems: Record<string, number>,
    userName: string
) {
    try {
        // Validate input
        if (!userName || !userName.trim()) {
            return { success: false, error: 'User name is required' };
        }

        if (!cartItems || Object.keys(cartItems).length === 0) {
            return { success: false, error: 'Cart is empty' };
        }

        // Use a transaction for atomicity
        // Note: better-sqlite3 transactions must be synchronous (no async/await)
        const result = db.transaction((tx) => {
            const lowStockItems: Array<{
                id: string;
                name: string;
                sku: string;
                category: string;
                stock: number;
                minThreshold: number;
            }> = [];

            for (const [itemId, changeAmount] of Object.entries(cartItems)) {
                if (changeAmount === 0) continue;

                // Read current item state for threshold checks and error messages
                const item = tx.select().from(items).where(eq(items.id, itemId)).limit(1).all();

                if (item.length === 0) {
                    throw new Error(`Item not found: ${itemId}`);
                }

                const currentItem = item[0];

                // Atomic stock update with negative-stock guard
                const updated = tx
                    .update(items)
                    .set({ stock: sql`${items.stock} + ${changeAmount}` })
                    .where(
                        changeAmount < 0
                            ? sql`${items.id} = ${itemId} AND ${items.stock} + ${changeAmount} >= 0`
                            : eq(items.id, itemId)
                    )
                    .returning({ stock: items.stock })
                    .all();

                if (!updated || updated.length === 0) {
                    throw new Error(
                        `Insufficient stock for ${currentItem.name}. Available: ${currentItem.stock}`
                    );
                }

                // Log the change
                tx.insert(logs).values({
                    itemId,
                    changeAmount,
                    reason: changeAmount > 0 ? 'restocked' : 'consumed',
                    userName,
                }).run();

                // Calculate the new stock value (update succeeded, so we know the new value)
                const newStock = currentItem.stock + changeAmount;
                const wasAboveThreshold = currentItem.stock > currentItem.minThreshold;
                const isNowAtOrBelowThreshold = newStock <= currentItem.minThreshold;

                if (changeAmount < 0 && wasAboveThreshold && isNowAtOrBelowThreshold) {
                    lowStockItems.push({
                        id: currentItem.id,
                        name: currentItem.name,
                        sku: currentItem.sku,
                        category: currentItem.category,
                        stock: newStock,
                        minThreshold: currentItem.minThreshold,
                    });
                }
            }

            return { lowStockItems };
        });

        // Send low stock notifications outside the transaction (non-blocking)
        for (const item of result.lowStockItems) {
            notifyLowStock(item).catch(error => {
                console.error('Failed to send low stock notification:', error);
            });
        }

        revalidatePath('/');
        revalidatePath('/restock');
        return { success: true };
    } catch (error) {
        console.error('Error submitting order:', error);
        return { success: false, error: `Failed to submit order: ${error instanceof Error ? error.message : 'Unknown error'}` };
    }
}
