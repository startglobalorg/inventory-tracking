'use server';

import { db } from '@/db/db';
import { items, logs } from '@/db/schema';
import { eq, desc, sql } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';

export async function getOrderHistory() {
    try {
        // Fetch all logs with item details
        const orderLogs = await db
            .select({
                logId: logs.id,
                itemId: logs.itemId,
                itemName: items.name,
                itemSku: items.sku,
                itemCategory: items.category,
                changeAmount: logs.changeAmount,
                reason: logs.reason,
                userName: logs.userName,
                createdAt: logs.createdAt,
            })
            .from(logs)
            .leftJoin(items, eq(logs.itemId, items.id))
            .orderBy(desc(logs.createdAt));

        return { success: true, data: orderLogs };
    } catch (error) {
        console.error('Error fetching order history:', error);
        return { success: false, error: 'Failed to fetch order history' };
    }
}

export async function getOrderStatistics() {
    try {
        // Get total consumed items
        const consumedStats = await db
            .select({
                totalConsumed: sql<number>`SUM(ABS(${logs.changeAmount}))`,
            })
            .from(logs)
            .where(sql`${logs.reason} = 'consumed'`);

        // Get total restocked items
        const restockedStats = await db
            .select({
                totalRestocked: sql<number>`SUM(${logs.changeAmount})`,
            })
            .from(logs)
            .where(sql`${logs.reason} = 'restocked'`);

        // Get most consumed items
        const topItems = await db
            .select({
                itemId: logs.itemId,
                itemName: items.name,
                itemCategory: items.category,
                totalConsumed: sql<number>`SUM(ABS(${logs.changeAmount}))`,
            })
            .from(logs)
            .leftJoin(items, eq(logs.itemId, items.id))
            .where(sql`${logs.reason} = 'consumed'`)
            .groupBy(logs.itemId, items.name, items.category)
            .orderBy(desc(sql`SUM(ABS(${logs.changeAmount}))`))
            .limit(5);

        // Get category breakdown
        const categoryStats = await db
            .select({
                category: items.category,
                totalConsumed: sql<number>`SUM(ABS(${logs.changeAmount}))`,
            })
            .from(logs)
            .leftJoin(items, eq(logs.itemId, items.id))
            .where(sql`${logs.reason} = 'consumed'`)
            .groupBy(items.category)
            .orderBy(desc(sql`SUM(ABS(${logs.changeAmount}))`));

        return {
            success: true,
            data: {
                totalConsumed: consumedStats[0]?.totalConsumed || 0,
                totalRestocked: restockedStats[0]?.totalRestocked || 0,
                topItems: topItems || [],
                categoryStats: categoryStats || [],
            },
        };
    } catch (error) {
        console.error('Error fetching order statistics:', error);
        return { success: false, error: 'Failed to fetch statistics' };
    }
}

export async function editOrderLog(logId: string, newAmount: number, reason: string) {
    try {
        // Get the original log
        const originalLog = await db.select().from(logs).where(eq(logs.id, logId)).limit(1);

        if (originalLog.length === 0) {
            return { success: false, error: 'Log not found' };
        }

        const log = originalLog[0];
        const difference = newAmount - log.changeAmount;

        // If no change, just return success
        if (difference === 0) {
            return { success: true };
        }

        // Update the item stock to reflect the adjustment
        const item = await db.select().from(items).where(eq(items.id, log.itemId)).limit(1);

        if (item.length === 0) {
            return { success: false, error: 'Item not found' };
        }

        const currentStock = item[0].stock;
        const newStock = currentStock + difference;

        if (newStock < 0) {
            return { success: false, error: 'Adjustment would result in negative stock' };
        }

        // Update the log
        await db
            .update(logs)
            .set({ changeAmount: newAmount })
            .where(eq(logs.id, logId));

        // Update the item stock
        await db
            .update(items)
            .set({ stock: newStock })
            .where(eq(items.id, log.itemId));

        // Create an adjustment log to track the edit
        await db.insert(logs).values({
            itemId: log.itemId,
            changeAmount: difference,
            reason: 'adjustment',
            userName: `System (Edit of log ${logId.substring(0, 8)})`,
        });

        revalidatePath('/');
        revalidatePath('/orders');

        return { success: true };
    } catch (error) {
        console.error('Error editing order log:', error);
        return { success: false, error: 'Failed to edit order log' };
    }
}

export async function deleteOrderLog(logId: string) {
    try {
        // Get the log to reverse its effect
        const originalLog = await db.select().from(logs).where(eq(logs.id, logId)).limit(1);

        if (originalLog.length === 0) {
            return { success: false, error: 'Log not found' };
        }

        const log = originalLog[0];

        // Reverse the stock change
        const item = await db.select().from(items).where(eq(items.id, log.itemId)).limit(1);

        if (item.length === 0) {
            return { success: false, error: 'Item not found' };
        }

        const currentStock = item[0].stock;
        const newStock = currentStock - log.changeAmount;

        if (newStock < 0) {
            return { success: false, error: 'Deleting this log would result in negative stock' };
        }

        // Update the item stock
        await db
            .update(items)
            .set({ stock: newStock })
            .where(eq(items.id, log.itemId));

        // Delete the log
        await db.delete(logs).where(eq(logs.id, logId));

        // Create an adjustment log to track the deletion
        await db.insert(logs).values({
            itemId: log.itemId,
            changeAmount: -log.changeAmount,
            reason: 'adjustment',
            userName: `System (Deleted log ${logId.substring(0, 8)})`,
        });

        revalidatePath('/');
        revalidatePath('/orders');

        return { success: true };
    } catch (error) {
        console.error('Error deleting order log:', error);
        return { success: false, error: 'Failed to delete order log' };
    }
}
