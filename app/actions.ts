'use server';

import { db } from '@/db/db';
import { items, logs } from '@/db/schema';
import { eq, sql } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';

export async function updateStock(
    itemId: string,
    changeAmount: number,
    reason: 'consumed' | 'restocked' | 'adjustment',
    userName?: string
) {
    try {
        // Atomic stock update with negative-stock guard
        const result = await db
            .update(items)
            .set({ stock: sql`${items.stock} + ${changeAmount}` })
            .where(
                changeAmount < 0
                    ? sql`${items.id} = ${itemId} AND ${items.stock} + ${changeAmount} >= 0`
                    : eq(items.id, itemId)
            )
            .returning({ id: items.id, stock: items.stock, name: items.name });

        if (result.length === 0) {
            // Distinguish between "item not found" and "insufficient stock"
            const item = await db.select().from(items).where(eq(items.id, itemId)).limit(1);
            if (item.length === 0) {
                return { success: false, error: 'Item not found' };
            }
            return { success: false, error: 'Cannot have negative stock' };
        }

        // Log the change
        await db.insert(logs).values({
            itemId,
            changeAmount,
            reason,
            userName: userName || undefined,
        });

        revalidatePath('/');

        return {
            success: true,
            newStock: result[0].stock,
            itemName: result[0].name
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
        // Validate numeric fields
        if (formData.stock < 0) {
            return { success: false, error: 'Stock cannot be negative' };
        }
        if (formData.minThreshold < 0) {
            return { success: false, error: 'Minimum threshold cannot be negative' };
        }
        if (formData.quantityPerUnit < 1) {
            return { success: false, error: 'Quantity per unit must be at least 1' };
        }

        // Insert and rely on unique constraint for SKU conflicts
        await db.insert(items).values(formData);

        revalidatePath('/');
        revalidatePath('/restock');

        return { success: true };
    } catch (error: unknown) {
        console.error('Error creating item:', error);
        // Handle unique constraint violation
        if (error instanceof Error && error.message.includes('UNIQUE constraint failed')) {
            return { success: false, error: 'SKU already exists' };
        }
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
        // Validate numeric fields
        if (formData.stock < 0) {
            return { success: false, error: 'Stock cannot be negative' };
        }
        if (formData.minThreshold < 0) {
            return { success: false, error: 'Minimum threshold cannot be negative' };
        }
        if (formData.quantityPerUnit < 1) {
            return { success: false, error: 'Quantity per unit must be at least 1' };
        }

        // Check if item exists
        const existing = await db.select().from(items).where(eq(items.id, itemId)).limit(1);

        if (existing.length === 0) {
            return { success: false, error: 'Item not found' };
        }

        // Update item — rely on unique constraint for SKU conflicts
        await db.update(items).set(formData).where(eq(items.id, itemId));

        revalidatePath('/');
        revalidatePath('/restock');
        revalidatePath(`/item/${itemId}`);

        return { success: true };
    } catch (error: unknown) {
        console.error('Error updating item:', error);
        if (error instanceof Error && error.message.includes('UNIQUE constraint failed')) {
            return { success: false, error: 'SKU already exists' };
        }
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

        // Delete the item (cascade handles associated logs)
        await db.delete(items).where(eq(items.id, itemId));

        revalidatePath('/');
        revalidatePath('/restock');

        return { success: true };
    } catch (error) {
        console.error('Error deleting item:', error);
        return { success: false, error: 'Failed to delete item' };
    }
}
