'use server';

import { db } from '@/db/db';
import { items, logs } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';

export async function submitOrder(
    cartItems: Record<string, number>,
    userName: string
) {
    try {
        // Process all items in a transaction-like manner
        // SQLite doesn't support complex transactions in Drizzle as natively as PG, 
        // but better-sqlite3 is synchronous so sequential operations are safe enough for this scale.

        for (const [itemId, changeAmount] of Object.entries(cartItems)) {
            if (changeAmount === 0) continue;

            // Get current item to check constraints
            const item = await db.select().from(items).where(eq(items.id, itemId)).limit(1);

            if (item.length === 0) continue;

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
        }

        revalidatePath('/');
        return { success: true };
    } catch (error) {
        console.error('Error submitting order:', error);
        return { success: false, error: 'Failed to submit order' };
    }
}
