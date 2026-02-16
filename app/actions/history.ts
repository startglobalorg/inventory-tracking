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

export async function editOrderLog(logId: string, newAmount: number, _reason: string) {
    try {
        // Note: better-sqlite3 transactions must be synchronous (no async/await)
        const result = db.transaction((tx) => {
            // Get the original log
            const originalLog = tx.select().from(logs).where(eq(logs.id, logId)).limit(1).all();

            if (originalLog.length === 0) {
                throw new Error('Log not found');
            }

            const log = originalLog[0];
            const difference = newAmount - log.changeAmount;

            // If no change, just return
            if (difference === 0) {
                return { noChange: true };
            }

            // Atomic stock update with negative-stock guard
            const updated = tx
                .update(items)
                .set({ stock: sql`${items.stock} + ${difference}` })
                .where(
                    sql`${items.id} = ${log.itemId} AND ${items.stock} + ${difference} >= 0`
                )
                .returning({ stock: items.stock })
                .all();

            if (!updated || updated.length === 0) {
                // Check if item exists
                const item = tx.select().from(items).where(eq(items.id, log.itemId)).limit(1).all();
                if (!item || item.length === 0) {
                    throw new Error('Item not found');
                }
                throw new Error('Adjustment would result in negative stock');
            }

            // Update the log
            tx
                .update(logs)
                .set({ changeAmount: newAmount })
                .where(eq(logs.id, logId))
                .run();

            // Create an adjustment log to track the edit
            tx.insert(logs).values({
                itemId: log.itemId,
                changeAmount: difference,
                reason: 'adjustment',
                userName: `System (Edit of log ${logId.substring(0, 8)})`,
            }).run();

            return { noChange: false };
        });

        if (result.noChange) {
            return { success: true };
        }

        revalidatePath('/');
        revalidatePath('/orders');
        revalidatePath('/history');

        return { success: true };
    } catch (error) {
        console.error('Error editing order log:', error);
        return { success: false, error: error instanceof Error ? error.message : 'Failed to edit order log' };
    }
}

export async function deleteOrderLog(logId: string) {
    try {
        // Note: better-sqlite3 transactions must be synchronous (no async/await)
        db.transaction((tx) => {
            // Get the log to reverse its effect
            const originalLog = tx.select().from(logs).where(eq(logs.id, logId)).limit(1).all();

            if (originalLog.length === 0) {
                throw new Error('Log not found');
            }

            const log = originalLog[0];

            // Atomic stock reversal with negative-stock guard
            const updated = tx
                .update(items)
                .set({ stock: sql`${items.stock} - ${log.changeAmount}` })
                .where(
                    sql`${items.id} = ${log.itemId} AND ${items.stock} - ${log.changeAmount} >= 0`
                )
                .returning({ stock: items.stock })
                .all();

            if (!updated || updated.length === 0) {
                // Check if item exists
                const item = tx.select().from(items).where(eq(items.id, log.itemId)).limit(1).all();
                if (!item || item.length === 0) {
                    throw new Error('Item not found');
                }
                throw new Error('Deleting this log would result in negative stock');
            }

            // Delete the log
            tx.delete(logs).where(eq(logs.id, logId)).run();

            // Create an adjustment log to track the deletion
            tx.insert(logs).values({
                itemId: log.itemId,
                changeAmount: -log.changeAmount,
                reason: 'adjustment',
                userName: `System (Deleted log ${logId.substring(0, 8)})`,
            }).run();
        });

        revalidatePath('/');
        revalidatePath('/orders');
        revalidatePath('/history');

        return { success: true };
    } catch (error) {
        console.error('Error deleting order log:', error);
        return { success: false, error: error instanceof Error ? error.message : 'Failed to delete order log' };
    }
}

export async function getStockOverTime() {
    try {
        // Get current total stock
        const currentStockResult = await db
            .select({
                totalStock: sql<number>`SUM(CAST(${items.stock} AS INTEGER))`,
            })
            .from(items);

        const currentTotalStock = currentStockResult[0]?.totalStock || 0;

        // Get all logs ordered by createdAt DESC
        const allLogs = await db
            .select({
                changeAmount: logs.changeAmount,
                createdAt: logs.createdAt,
            })
            .from(logs)
            .orderBy(desc(logs.createdAt));

        if (allLogs.length === 0) {
            // No history, return current stock only
            return {
                success: true,
                data: [{
                    date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
                    totalStock: currentTotalStock,
                }],
            };
        }

        // Build historical data by walking backward from current stock
        const dataPoints: { timestamp: number; totalStock: number }[] = [];
        let runningStock = currentTotalStock;

        // Add current point
        dataPoints.push({
            timestamp: Date.now(),
            totalStock: runningStock,
        });

        // Walk backward through logs
        for (const log of allLogs) {
            runningStock -= log.changeAmount;
            dataPoints.push({
                timestamp: log.createdAt.getTime(),
                totalStock: runningStock,
            });
        }

        // Reverse to get chronological order
        dataPoints.reverse();

        // Group by day to reduce data points
        const dailyData = new Map<string, number>();
        for (const point of dataPoints) {
            const date = new Date(point.timestamp).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
            });
            // Keep the last value for each day (most recent)
            dailyData.set(date, point.totalStock);
        }

        // Convert to array format for chart
        const chartData = Array.from(dailyData.entries()).map(([date, totalStock]) => ({
            date,
            totalStock,
        }));

        return {
            success: true,
            data: chartData,
        };
    } catch (error) {
        console.error('Error fetching stock over time:', error);
        return { success: false, error: 'Failed to fetch stock history' };
    }
}
