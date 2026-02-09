'use server';

import { db } from '@/db/db';
import { items, logs } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';

export async function updateStock(
    itemId: string,
    changeAmount: number,
    reason: 'consumed' | 'restocked' | 'adjustment'
) {
    try {
        // Get current item
        const item = await db.select().from(items).where(eq(items.id, itemId)).limit(1);

        if (item.length === 0) {
            return { success: false, error: 'Item not found' };
        }

        const currentItem = item[0];
        const newStock = currentItem.stock + changeAmount;

        // Prevent negative stock
        if (newStock < 0) {
            return { success: false, error: 'Cannot have negative stock' };
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
            reason,
        });

        revalidatePath('/');

        return {
            success: true,
            newStock,
            itemName: currentItem.name
        };
    } catch (error) {
        console.error('Error updating stock:', error);
        return { success: false, error: 'Failed to update stock' };
    }
}

export async function createItem(formData: {
    name: string;
    sku: string;
    stock: number;
    minThreshold: number;
    category: string;
    quantityPerUnit: number;
    unitName: string;
}) {
    try {
        // Check if SKU already exists
        const existing = await db.select().from(items).where(eq(items.sku, formData.sku)).limit(1);

        if (existing.length > 0) {
            return { success: false, error: 'SKU already exists' };
        }

        // Insert new item
        await db.insert(items).values(formData);

        revalidatePath('/');
        revalidatePath('/restock');

        return { success: true };
    } catch (error) {
        console.error('Error creating item:', error);
        return { success: false, error: 'Failed to create item' };
    }
}

export async function updateItem(itemId: string, formData: {
    name: string;
    sku: string;
    stock: number;
    minThreshold: number;
    category: string;
    quantityPerUnit: number;
    unitName: string;
}) {
    try {
        // Check if item exists
        const existing = await db.select().from(items).where(eq(items.id, itemId)).limit(1);

        if (existing.length === 0) {
            return { success: false, error: 'Item not found' };
        }

        // Check if SKU is being changed and if it conflicts with another item
        if (existing[0].sku !== formData.sku) {
            const skuExists = await db.select().from(items).where(eq(items.sku, formData.sku)).limit(1);
            if (skuExists.length > 0) {
                return { success: false, error: 'SKU already exists' };
            }
        }

        // Update item
        await db.update(items).set(formData).where(eq(items.id, itemId));

        revalidatePath('/');
        revalidatePath('/restock');
        revalidatePath(`/item/${itemId}`);

        return { success: true };
    } catch (error) {
        console.error('Error updating item:', error);
        return { success: false, error: 'Failed to update item' };
    }
}

export async function deleteItem(itemId: string) {
    try {
        // Check if item exists
        const existing = await db.select().from(items).where(eq(items.id, itemId)).limit(1);

        if (existing.length === 0) {
            return { success: false, error: 'Item not found' };
        }

        // Delete associated logs first (foreign key constraint)
        await db.delete(logs).where(eq(logs.itemId, itemId));

        // Delete the item
        await db.delete(items).where(eq(items.id, itemId));

        revalidatePath('/');
        revalidatePath('/restock');

        return { success: true };
    } catch (error) {
        console.error('Error deleting item:', error);
        return { success: false, error: 'Failed to delete item' };
    }
}
