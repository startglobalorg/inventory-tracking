'use server';

import { db } from '@/db/db';
import { items, logs } from '@/db/schema';
import { eq } from 'drizzle-orm';
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

        // Process all items in a transaction-like manner
        // SQLite doesn't support complex transactions in Drizzle as natively as PG,
        // but better-sqlite3 is synchronous so sequential operations are safe enough for this scale.

        for (const [itemId, changeAmount] of Object.entries(cartItems)) {
            if (changeAmount === 0) continue;

            // Get current item to check constraints
            const item = await db.select().from(items).where(eq(items.id, itemId)).limit(1);

            if (item.length === 0) {
                continue;
            }

            const currentItem = item[0];
            const newStock = currentItem.stock + changeAmount;

            if (newStock < 0) {
                return {
                    success: false,
                    error: `Insufficient stock for ${currentItem.name}. Available: ${currentItem.stock}`
                };
            }

            // Update stock
            await db
                .update(items)
                .set({ stock: newStock })
                .where(eq(items.id, itemId));

            // Log the change
            await db.insert(logs).values({
                itemId,
                changeAmount,
                reason: changeAmount > 0 ? 'restocked' : 'consumed',
                userName,
            });

            // Check if item is now at or below minimum threshold
            // Only notify when consuming items (negative changeAmount)
            const wasAboveThreshold = currentItem.stock > currentItem.minThreshold;
            const isNowAtOrBelowThreshold = newStock <= currentItem.minThreshold;

            if (changeAmount < 0 && wasAboveThreshold && isNowAtOrBelowThreshold) {
                // Trigger low stock webhook notification (don't await to avoid blocking)
                notifyLowStock({
                    id: currentItem.id,
                    name: currentItem.name,
                    sku: currentItem.sku,
                    category: currentItem.category,
                    stock: newStock,
                    minThreshold: currentItem.minThreshold,
                }).catch(error => {
                    console.error('Failed to send low stock notification:', error);
                    // Don't fail the order if webhook fails
                });
            }
        }

        revalidatePath('/');
        revalidatePath('/restock');
        return { success: true };
    } catch (error) {
        console.error('Error submitting order:', error);
        return { success: false, error: `Failed to submit order: ${error instanceof Error ? error.message : 'Unknown error'}` };
    }
}
