'use server';

import { db } from '@/db/db';
import { locationItemLimits, orders, orderItems } from '@/db/schema';
import { eq, and, ne, sql } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';

/**
 * Set limits for an item across locations.
 * Pass an array of { locationId, maxLimit } entries.
 * Locations not in the array will have their limits removed (= unlimited).
 */
export async function setLimits(
    itemId: string,
    limits: { locationId: string; maxLimit: number }[]
) {
    try {
        db.transaction((tx) => {
            // Remove all existing limits for this item
            tx.delete(locationItemLimits)
                .where(eq(locationItemLimits.itemId, itemId))
                .run();

            // Insert new limits
            for (const { locationId, maxLimit } of limits) {
                if (maxLimit >= 0) {
                    tx.insert(locationItemLimits)
                        .values({ locationId, itemId, maxLimit })
                        .run();
                }
            }
        });

        revalidatePath(`/item/${itemId}`);
        return { success: true };
    } catch (error) {
        console.error('Error setting limits:', error);
        return { success: false, error: 'Failed to save limits' };
    }
}

/**
 * Get all limit records for a specific item (used by admin edit page).
 */
export async function getLimitsForItem(itemId: string) {
    try {
        const limits = await db
            .select()
            .from(locationItemLimits)
            .where(eq(locationItemLimits.itemId, itemId));

        return { success: true, data: limits };
    } catch (error) {
        console.error('Error fetching limits for item:', error);
        return { success: false, error: 'Failed to fetch limits' };
    }
}

/**
 * Get all limit records for a specific location (used by volunteer form).
 */
export async function getLimitsForLocation(locationId: string) {
    try {
        const limits = await db
            .select({
                itemId: locationItemLimits.itemId,
                maxLimit: locationItemLimits.maxLimit,
            })
            .from(locationItemLimits)
            .where(eq(locationItemLimits.locationId, locationId));

        // Return as a map: itemId -> maxLimit
        const limitMap: Record<string, number> = {};
        for (const l of limits) {
            limitMap[l.itemId] = l.maxLimit;
        }
        return { success: true, data: limitMap };
    } catch (error) {
        console.error('Error fetching limits for location:', error);
        return { success: false, error: 'Failed to fetch limits' };
    }
}

/**
 * Get total ordered quantity per item for a location (non-cancelled orders only).
 */
export async function getLocationItemUsage(locationId: string) {
    try {
        const usage = await db
            .select({
                itemId: orderItems.itemId,
                totalOrdered: sql<number>`sum(${orderItems.quantity})`,
            })
            .from(orderItems)
            .innerJoin(orders, eq(orderItems.orderId, orders.id))
            .where(
                and(
                    eq(orders.locationId, locationId),
                    ne(orders.status, 'cancelled')
                )
            )
            .groupBy(orderItems.itemId);

        const usageMap: Record<string, number> = {};
        for (const u of usage) {
            usageMap[u.itemId] = Number(u.totalOrdered);
        }
        return { success: true, data: usageMap };
    } catch (error) {
        console.error('Error fetching location item usage:', error);
        return { success: false, error: 'Failed to fetch usage' };
    }
}
