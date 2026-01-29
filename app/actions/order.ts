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
        console.log('Submitting order for user:', userName);
        console.log('Cart items:', cartItems);

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

            console.log(`Processing item ${itemId} with change ${changeAmount}`);

            // Get current item to check constraints
            const item = await db.select().from(items).where(eq(items.id, itemId)).limit(1);

            if (item.length === 0) {
                console.log(`Item ${itemId} not found`);
                continue;
            }

            const currentItem = item[0];
            const newStock = currentItem.stock + changeAmount;

            if (newStock < 0) {
                console.log(`Insufficient stock for ${currentItem.name}`);
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

            console.log(`Updated stock for ${currentItem.name} to ${newStock}`);

            // Log the change
            await db.insert(logs).values({
                itemId,
                changeAmount,
                reason: changeAmount > 0 ? 'restocked' : 'consumed',
                userName,
            });

            console.log(`Logged change for ${currentItem.name}`);
        }

        revalidatePath('/');
        revalidatePath('/restock');
        console.log('Order submitted successfully');
        return { success: true };
    } catch (error) {
        console.error('Error submitting order:', error);
        return { success: false, error: `Failed to submit order: ${error instanceof Error ? error.message : 'Unknown error'}` };
    }
}
