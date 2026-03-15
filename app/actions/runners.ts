'use server';

import { db } from '@/db/db';
import { runners, orders, orderItems, items, locations, logs } from '@/db/schema';
import { eq, asc, isNull, and, ne, inArray, sql } from 'drizzle-orm';
import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { notifyLowStock } from './webhook';
import type { Runner } from '@/db/schema';

export async function getRunners() {
    try {
        const allRunners = await db
            .select()
            .from(runners)
            .orderBy(asc(runners.name));
        return { success: true, data: allRunners };
    } catch (error) {
        console.error('Error fetching runners:', error);
        return { success: false, error: 'Failed to fetch runners', data: [] as Runner[] };
    }
}

export async function getRunnerById(id: string) {
    try {
        const result = await db
            .select()
            .from(runners)
            .where(eq(runners.id, id))
            .limit(1);

        if (result.length === 0) {
            return { success: false, error: 'Runner not found' };
        }
        return { success: true, data: result[0] };
    } catch (error) {
        console.error('Error fetching runner:', error);
        return { success: false, error: 'Failed to fetch runner' };
    }
}

export async function createRunner(name: string) {
    try {
        const trimmed = name.trim();
        if (!trimmed) {
            return { success: false, error: 'Name cannot be empty' };
        }
        if (trimmed.length > 50) {
            return { success: false, error: 'Name is too long (max 50 characters)' };
        }

        const newRunner = await db
            .insert(runners)
            .values({ name: trimmed })
            .returning();

        await setRunnerCookie(newRunner[0].id);
        revalidatePath('/runner');
        revalidatePath('/orders');
        return { success: true, data: newRunner[0] };
    } catch (error) {
        console.error('Error creating runner:', error);
        return { success: false, error: 'A runner with that name already exists' };
    }
}

export async function setRunnerCookie(runnerId: string) {
    const cookieStore = await cookies();
    cookieStore.set('volunteerId', runnerId, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        maxAge: 60 * 60 * 24 * 3, // 3 days
        path: '/',
        sameSite: 'lax',
    });
}

export async function clearRunnerCookie() {
    const cookieStore = await cookies();
    cookieStore.delete('volunteerId');
}

export async function deleteRunner(runnerId: string) {
    try {
        const { backupDatabaseSync } = await import('@/lib/backup');
        const backup = backupDatabaseSync('delete-runner');
        if (!backup) {
            return { success: false, error: 'Backup failed — aborting deletion for safety' };
        }

        // Manually clear runner_id on orders (FK cascade not enforced without PRAGMA foreign_keys = ON)
        await db.update(orders).set({ runnerId: null }).where(eq(orders.runnerId, runnerId));
        await db.delete(runners).where(eq(runners.id, runnerId));
        revalidatePath('/admin');
        revalidatePath('/orders');
        revalidatePath('/volunteer');
        return { success: true };
    } catch (error) {
        console.error('Error deleting runner:', error);
        return { success: false, error: 'Failed to delete volunteer' };
    }
}

export async function assignOrder(orderId: string, runnerId: string | null) {
    try {
        await db
            .update(orders)
            .set({ runnerId })
            .where(eq(orders.id, orderId));

        revalidatePath('/orders');
        revalidatePath('/runner');
        return { success: true };
    } catch (error) {
        console.error('Error assigning order:', error);
        return { success: false, error: 'Failed to assign order' };
    }
}

export async function claimOrder(orderId: string, runnerId: string) {
    try {
        const updated = await db
            .update(orders)
            .set({ runnerId, status: 'in_progress' })
            .where(and(eq(orders.id, orderId), isNull(orders.runnerId)))
            .returning({ id: orders.id });

        if (!updated || updated.length === 0) {
            return { success: false, error: 'Order already claimed by someone else' };
        }

        revalidatePath('/orders');
        revalidatePath('/volunteer');
        return { success: true };
    } catch (error) {
        console.error('Error claiming order:', error);
        return { success: false, error: 'Failed to claim order' };
    }
}

export async function getUnassignedOrders() {
    try {
        const unassigned = await db
            .select({
                id: orders.id,
                locationId: orders.locationId,
                locationName: locations.name,
                status: orders.status,
                createdAt: orders.createdAt,
                completedAt: orders.completedAt,
                customRequest: orders.customRequest,
                cancelledBy: orders.cancelledBy,
            })
            .from(orders)
            .leftJoin(locations, eq(orders.locationId, locations.id))
            .where(and(eq(orders.status, 'new'), isNull(orders.runnerId)))
            .orderBy(asc(orders.createdAt));

        if (unassigned.length === 0) {
            return { success: true, data: [] };
        }

        const orderIds = unassigned.map(o => o.id);
        const allOrderItems = await db
            .select({
                id: orderItems.id,
                orderId: orderItems.orderId,
                itemId: orderItems.itemId,
                itemName: items.name,
                quantity: orderItems.quantity,
                quantityPerUnit: items.quantityPerUnit,
                unitName: items.unitName,
            })
            .from(orderItems)
            .leftJoin(items, eq(orderItems.itemId, items.id))
            .where(inArray(orderItems.orderId, orderIds));

        const itemsByOrder = new Map<string, typeof allOrderItems>();
        for (const oi of allOrderItems) {
            const arr = itemsByOrder.get(oi.orderId) || [];
            arr.push(oi);
            itemsByOrder.set(oi.orderId, arr);
        }

        const data = unassigned.map(o => ({
            id: o.id,
            locationId: o.locationId,
            locationName: o.locationName || 'Unknown',
            status: o.status as 'new' | 'in_progress' | 'done',
            createdAt: o.createdAt,
            completedAt: o.completedAt,
            runnerId: null as string | null,
            runnerName: null as string | null,
            customRequest: o.customRequest ?? null,
            cancelledBy: o.cancelledBy ?? null,
            items: (itemsByOrder.get(o.id) || []).map(oi => ({
                id: oi.id,
                itemId: oi.itemId,
                itemName: oi.itemName || 'Unknown Item',
                quantity: oi.quantity,
                quantityPerUnit: oi.quantityPerUnit ?? null,
                unitName: oi.unitName ?? null,
            })),
        }));

        return { success: true, data };
    } catch (error) {
        console.error('Error fetching unassigned orders:', error);
        return { success: false, error: 'Failed to fetch unassigned orders', data: [] };
    }
}

export async function getRunnerOrders(runnerId: string) {
    try {
        const runnerOrders = await db
            .select({
                id: orders.id,
                locationId: orders.locationId,
                locationName: locations.name,
                status: orders.status,
                createdAt: orders.createdAt,
                completedAt: orders.completedAt,
                customRequest: orders.customRequest,
                cancelledBy: orders.cancelledBy,
            })
            .from(orders)
            .leftJoin(locations, eq(orders.locationId, locations.id))
            .where(and(eq(orders.runnerId, runnerId), ne(orders.status, 'done')))
            .orderBy(asc(orders.createdAt));

        if (runnerOrders.length === 0) {
            return { success: true, data: [] };
        }

        const orderIds = runnerOrders.map(o => o.id);
        const allOrderItems = await db
            .select({
                id: orderItems.id,
                orderId: orderItems.orderId,
                itemId: orderItems.itemId,
                itemName: items.name,
                quantity: orderItems.quantity,
                quantityPerUnit: items.quantityPerUnit,
                unitName: items.unitName,
            })
            .from(orderItems)
            .leftJoin(items, eq(orderItems.itemId, items.id))
            .where(inArray(orderItems.orderId, orderIds));

        const itemsByOrder = new Map<string, typeof allOrderItems>();
        for (const oi of allOrderItems) {
            const arr = itemsByOrder.get(oi.orderId) || [];
            arr.push(oi);
            itemsByOrder.set(oi.orderId, arr);
        }

        const runnerResult = await db
            .select({ name: runners.name })
            .from(runners)
            .where(eq(runners.id, runnerId))
            .limit(1);

        const runnerName = runnerResult[0]?.name ?? null;

        const data = runnerOrders.map(o => ({
            id: o.id,
            locationId: o.locationId,
            locationName: o.locationName || 'Unknown',
            status: o.status as 'new' | 'in_progress' | 'done',
            createdAt: o.createdAt,
            completedAt: o.completedAt,
            runnerId,
            runnerName,
            customRequest: o.customRequest ?? null,
            cancelledBy: o.cancelledBy ?? null,
            items: (itemsByOrder.get(o.id) || []).map(oi => ({
                id: oi.id,
                itemId: oi.itemId,
                itemName: oi.itemName || 'Unknown Item',
                quantity: oi.quantity,
                quantityPerUnit: oi.quantityPerUnit ?? null,
                unitName: oi.unitName ?? null,
            })),
        }));

        return { success: true, data };
    } catch (error) {
        console.error('Error fetching runner orders:', error);
        return { success: false, error: 'Failed to fetch runner orders', data: [] };
    }
}

export async function getRunnerOrderCounts(): Promise<Record<string, { open: number; total: number }>> {
    try {
        const rows = await db
            .select({
                runnerId: orders.runnerId,
                open: sql<number>`sum(case when ${orders.status} != 'done' then 1 else 0 end)`,
                total: sql<number>`count(*)`,
            })
            .from(orders)
            .where(sql`${orders.runnerId} is not null`)
            .groupBy(orders.runnerId);

        const result: Record<string, { open: number; total: number }> = {};
        for (const row of rows) {
            if (row.runnerId) result[row.runnerId] = { open: Number(row.open), total: Number(row.total) };
        }
        return result;
    } catch {
        return {};
    }
}

// Deduct stock for all order items and mark the order as done in one transaction.
// Used when a delivery volunteer completes an order directly (no cart flow).
export async function completeVolunteerOrder(orderId: string, volunteerName: string) {
    try {
        const result = db.transaction((tx) => {
            // Idempotency guard — prevent double stock deduction if tapped twice
            const currentOrder = tx
                .select({ status: orders.status })
                .from(orders)
                .where(eq(orders.id, orderId))
                .limit(1)
                .all();
            if (currentOrder.length === 0) throw new Error('Order not found');
            if (currentOrder[0].status === 'done') throw new Error('Order already completed');

            const orderItemsList = tx
                .select({ itemId: orderItems.itemId, quantity: orderItems.quantity })
                .from(orderItems)
                .where(eq(orderItems.orderId, orderId))
                .all();

            // Text-based orders have no order_items — just mark done, no stock deduction
            if (orderItemsList.length === 0) {
                tx.update(orders)
                    .set({ status: 'done', completedAt: new Date() })
                    .where(eq(orders.id, orderId))
                    .run();
                return { lowStockItems: [] };
            }

            const lowStockItems: Array<{
                id: string; name: string; sku: string;
                category: string; stock: number; minThreshold: number;
            }> = [];

            for (const oi of orderItemsList) {
                const changeAmount = -oi.quantity;

                const item = tx.select().from(items).where(eq(items.id, oi.itemId)).limit(1).all();
                if (item.length === 0) throw new Error(`Item not found: ${oi.itemId}`);
                const currentItem = item[0];

                const updated = tx
                    .update(items)
                    .set({ stock: sql`${items.stock} + ${changeAmount}` })
                    .where(sql`${items.id} = ${oi.itemId} AND ${items.stock} + ${changeAmount} >= 0`)
                    .returning({ stock: items.stock })
                    .all();

                if (!updated || updated.length === 0) {
                    throw new Error(`Insufficient stock for ${currentItem.name}`);
                }

                tx.insert(logs).values({
                    itemId: oi.itemId,
                    changeAmount,
                    reason: 'consumed',
                    userName: volunteerName,
                }).run();

                const newStock = currentItem.stock + changeAmount;
                if (currentItem.stock > currentItem.minThreshold && newStock <= currentItem.minThreshold) {
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

            tx.update(orders)
                .set({ status: 'done', completedAt: new Date() })
                .where(eq(orders.id, orderId))
                .run();

            return { lowStockItems };
        });

        for (const item of result.lowStockItems) {
            notifyLowStock(item).catch(err => {
                console.error('Failed to send low stock notification:', err);
            });
        }

        revalidatePath('/');
        revalidatePath('/restock');
        revalidatePath('/orders');
        revalidatePath('/volunteer');
        return { success: true };
    } catch (error) {
        console.error('Error completing volunteer order:', error);
        return { success: false, error: error instanceof Error ? error.message : 'Failed to complete order' };
    }
}
