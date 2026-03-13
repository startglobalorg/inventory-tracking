'use server';

import { db } from '@/db/db';
import { locations, orders, orderItems, items, runners } from '@/db/schema';
import { eq, asc, desc, gt, inArray, or, isNull, and, sql } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';

// Types
export type OrderStatus = 'new' | 'in_progress' | 'done' | 'cancelled';

export interface OrderWithDetails {
    id: string;
    locationId: string;
    locationName: string;
    status: OrderStatus;
    createdAt: Date;
    completedAt: Date | null;
    runnerId: string | null;
    runnerName: string | null;
    customRequest: string | null;
    cancelledBy: string | null;
    items: {
        id: string;
        itemId: string;
        itemName: string;
        quantity: number;
    }[];
}

// Location Actions

export async function getLocations() {
    try {
        const allLocations = await db.select().from(locations).orderBy(asc(locations.name));
        return { success: true, data: allLocations };
    } catch (error) {
        console.error('Error fetching locations:', error);
        return { success: false, error: 'Failed to fetch locations' };
    }
}

export async function getLocationBySlug(slug: string) {
    try {
        const location = await db
            .select()
            .from(locations)
            .where(eq(locations.slug, slug))
            .limit(1);

        if (location.length === 0) {
            return { success: false, error: 'Location not found' };
        }

        return { success: true, data: location[0] };
    } catch (error) {
        console.error('Error fetching location:', error);
        return { success: false, error: 'Failed to fetch location' };
    }
}

export async function createLocation(name: string, slug: string) {
    try {
        // Check if slug already exists
        const existing = await db
            .select()
            .from(locations)
            .where(eq(locations.slug, slug))
            .limit(1);

        if (existing.length > 0) {
            return { success: false, error: 'Slug already exists' };
        }

        const newLocation = await db
            .insert(locations)
            .values({ name, slug })
            .returning();

        revalidatePath('/orders');
        return { success: true, data: newLocation[0] };
    } catch (error) {
        console.error('Error creating location:', error);
        return { success: false, error: 'Failed to create location' };
    }
}

// Item Actions (for volunteer view)

export async function getAvailableItems(locationSlug: string) {
    try {
        // Get items with stock > 0 that are either unrestricted or restricted to this location
        const inStockItems = await db
            .select({
                id: items.id,
                name: items.name,
                category: items.category,
                imageUrl: items.imageUrl,
                quantityPerUnit: items.quantityPerUnit,
                unitName: items.unitName,
                coldStorage: items.coldStorage,
            })
            .from(items)
            .where(
                and(
                    gt(items.stock, 0),
                    or(isNull(items.restrictedToLocationSlug), eq(items.restrictedToLocationSlug, locationSlug))
                )
            )
            .orderBy(asc(items.category), asc(items.name));

        return { success: true, data: inStockItems };
    } catch (error) {
        console.error('Error fetching available items:', error);
        return { success: false, error: 'Failed to fetch items' };
    }
}

// Order Actions

export async function submitVolunteerRequest(
    locationId: string,
    requestedItems: Record<string, number>, // itemId -> quantity
    customRequest?: string
) {
    try {
        // Validate text length to prevent abuse
        if (customRequest && customRequest.length > 1000) {
            return { success: false, error: 'Request text is too long (max 1000 characters)' };
        }

        const isTextRequest = !!customRequest?.trim();

        if (!isTextRequest) {
            const validItems = Object.entries(requestedItems).filter(([, qty]) =>
                Number.isInteger(qty) && Number.isFinite(qty) && qty > 0 && qty <= 10_000
            );
            if (validItems.length === 0) {
                return { success: false, error: 'No items selected' };
            }
        }

        // Note: better-sqlite3 transactions must be synchronous (no async/await)
        const result = db.transaction((tx) => {
            // Validate location exists
            const location = tx
                .select()
                .from(locations)
                .where(eq(locations.id, locationId))
                .limit(1)
                .all();

            if (!location || location.length === 0) {
                throw new Error('Location not found');
            }

            if (isTextRequest) {
                // Text request: store the message, skip order_items
                const newOrder = tx
                    .insert(orders)
                    .values({ locationId, status: 'new', customRequest: customRequest!.trim() })
                    .returning()
                    .all();
                if (!newOrder || newOrder.length === 0) throw new Error('Failed to create order');
                return { orderId: newOrder[0].id };
            }

            // Inventory request: validate items then insert order + order_items
            const validItems = Object.entries(requestedItems).filter(([, qty]) =>
                Number.isInteger(qty) && Number.isFinite(qty) && qty > 0 && qty <= 10_000
            );
            const itemIds = validItems.map(([id]) => id);
            const existingItems = tx
                .select({ id: items.id })
                .from(items)
                .where(inArray(items.id, itemIds))
                .all();

            if (!existingItems) throw new Error('Failed to validate items');

            const existingIds = new Set(existingItems.map(i => i.id));
            const missingIds = itemIds.filter(id => !existingIds.has(id));
            if (missingIds.length > 0) throw new Error('Some requested items no longer exist');

            const newOrder = tx
                .insert(orders)
                .values({ locationId, status: 'new' })
                .returning()
                .all();
            if (!newOrder || newOrder.length === 0) throw new Error('Failed to create order');

            const orderId = newOrder[0].id;
            for (const [itemId, quantity] of validItems) {
                tx.insert(orderItems).values({ orderId, itemId, quantity }).run();
            }
            return { orderId };
        });

        revalidatePath('/orders');

        return { success: true, orderIds: [result.orderId], message: 'Order submitted successfully' };
    } catch (error) {
        console.error('Error submitting volunteer request:', error);
        return { success: false, error: error instanceof Error ? error.message : 'Failed to submit request' };
    }
}

export async function getOrders(statusFilter?: OrderStatus | 'all') {
    try {
        // Fetch orders with location names and runner names via JOINs
        const allOrders = await db
            .select({
                id: orders.id,
                locationId: orders.locationId,
                locationName: locations.name,
                status: orders.status,
                createdAt: orders.createdAt,
                completedAt: orders.completedAt,
                runnerId: orders.runnerId,
                runnerName: runners.name,
                customRequest: orders.customRequest,
                cancelledBy: orders.cancelledBy,
            })
            .from(orders)
            .leftJoin(locations, eq(orders.locationId, locations.id))
            .leftJoin(runners, eq(orders.runnerId, runners.id))
            .orderBy(asc(orders.createdAt));

        // Fetch order items with item names via JOIN
        const allOrderItems = await db
            .select({
                id: orderItems.id,
                orderId: orderItems.orderId,
                itemId: orderItems.itemId,
                itemName: items.name,
                quantity: orderItems.quantity,
            })
            .from(orderItems)
            .leftJoin(items, eq(orderItems.itemId, items.id));

        // Group order items by orderId for efficient lookup
        const orderItemsByOrderId = new Map<string, typeof allOrderItems>();
        for (const oi of allOrderItems) {
            const existing = orderItemsByOrderId.get(oi.orderId) || [];
            existing.push(oi);
            orderItemsByOrderId.set(oi.orderId, existing);
        }

        // Build response with optional status filtering
        const ordersWithDetails: OrderWithDetails[] = allOrders
            .filter(order => statusFilter === 'all' || !statusFilter || order.status === statusFilter)
            .map(order => ({
                id: order.id,
                locationId: order.locationId,
                locationName: order.locationName || 'Unknown',
                status: order.status as OrderStatus,
                createdAt: order.createdAt,
                completedAt: order.completedAt,
                runnerId: order.runnerId ?? null,
                runnerName: order.runnerName ?? null,
                customRequest: order.customRequest ?? null,
                cancelledBy: order.cancelledBy ?? null,
                items: (orderItemsByOrderId.get(order.id) || []).map(oi => ({
                    id: oi.id,
                    itemId: oi.itemId,
                    itemName: oi.itemName || 'Unknown Item',
                    quantity: oi.quantity,
                })),
            }));

        return { success: true, data: ordersWithDetails };
    } catch (error) {
        console.error('Error fetching orders:', error);
        return { success: false, error: 'Failed to fetch orders' };
    }
}

export async function getOrdersByLocation(locationId: string) {
    try {
        // Get location name
        const location = await db
            .select()
            .from(locations)
            .where(eq(locations.id, locationId))
            .limit(1);

        const locationName = location[0]?.name || 'Unknown';

        // Get all orders for this location
        const locationOrders = await db
            .select({
                id: orders.id,
                locationId: orders.locationId,
                status: orders.status,
                createdAt: orders.createdAt,
                completedAt: orders.completedAt,
                customRequest: orders.customRequest,
                cancelledBy: orders.cancelledBy,
            })
            .from(orders)
            .where(eq(orders.locationId, locationId))
            .orderBy(desc(orders.createdAt));

        if (locationOrders.length === 0) {
            return { success: true, data: [] };
        }

        // Get order items for these specific orders via JOIN
        const orderIds = locationOrders.map(o => o.id);
        const relevantOrderItems = await db
            .select({
                id: orderItems.id,
                orderId: orderItems.orderId,
                itemId: orderItems.itemId,
                itemName: items.name,
                quantity: orderItems.quantity,
            })
            .from(orderItems)
            .leftJoin(items, eq(orderItems.itemId, items.id))
            .where(inArray(orderItems.orderId, orderIds));

        // Group order items by orderId
        const orderItemsByOrderId = new Map<string, typeof relevantOrderItems>();
        for (const oi of relevantOrderItems) {
            const existing = orderItemsByOrderId.get(oi.orderId) || [];
            existing.push(oi);
            orderItemsByOrderId.set(oi.orderId, existing);
        }

        // Build response
        const ordersWithDetails: OrderWithDetails[] = locationOrders.map(order => ({
            id: order.id,
            locationId: order.locationId,
            locationName,
            status: order.status as OrderStatus,
            createdAt: order.createdAt,
            completedAt: order.completedAt,
            runnerId: null,
            runnerName: null,
            customRequest: order.customRequest ?? null,
            cancelledBy: order.cancelledBy ?? null,
            items: (orderItemsByOrderId.get(order.id) || []).map(oi => ({
                id: oi.id,
                itemId: oi.itemId,
                itemName: oi.itemName || 'Unknown Item',
                quantity: oi.quantity,
            })),
        }));

        return { success: true, data: ordersWithDetails };
    } catch (error) {
        console.error('Error fetching location orders:', error);
        return { success: false, error: 'Failed to fetch location orders' };
    }
}

export async function getOrderById(orderId: string) {
    try {
        // Get order with location via JOIN
        const orderResult = await db
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
            .where(eq(orders.id, orderId))
            .limit(1);

        if (orderResult.length === 0) {
            return { success: false, error: 'Order not found' };
        }

        const order = orderResult[0];

        // Get order items with item names via JOIN
        const orderItemsList = await db
            .select({
                id: orderItems.id,
                itemId: orderItems.itemId,
                itemName: items.name,
                quantity: orderItems.quantity,
            })
            .from(orderItems)
            .leftJoin(items, eq(orderItems.itemId, items.id))
            .where(eq(orderItems.orderId, orderId));

        const orderWithDetails: OrderWithDetails = {
            id: order.id,
            locationId: order.locationId,
            locationName: order.locationName || 'Unknown',
            status: order.status as OrderStatus,
            createdAt: order.createdAt,
            completedAt: order.completedAt,
            runnerId: null,
            runnerName: null,
            customRequest: order.customRequest ?? null,
            cancelledBy: order.cancelledBy ?? null,
            items: orderItemsList.map(oi => ({
                id: oi.id,
                itemId: oi.itemId,
                itemName: oi.itemName || 'Unknown Item',
                quantity: oi.quantity,
            })),
        };

        return { success: true, data: orderWithDetails };
    } catch (error) {
        console.error('Error fetching order:', error);
        return { success: false, error: 'Failed to fetch order' };
    }
}

export async function updateOrderStatus(
    orderId: string,
    newStatus: OrderStatus
) {
    try {
        const order = await db
            .select()
            .from(orders)
            .where(eq(orders.id, orderId))
            .limit(1);

        if (order.length === 0) {
            return { success: false, error: 'Order not found' };
        }

        if (order[0].status === 'cancelled') {
            return { success: false, error: 'Cannot change status of a cancelled order' };
        }

        const updateData: { status: OrderStatus; completedAt?: Date | null } = {
            status: newStatus,
        };

        // Set completedAt when marking as done, clear it when reverting
        if (newStatus === 'done') {
            updateData.completedAt = new Date();
        } else if (newStatus === 'in_progress') {
            updateData.completedAt = null;
        }

        await db
            .update(orders)
            .set(updateData)
            .where(eq(orders.id, orderId));

        revalidatePath('/orders');
        revalidatePath('/runner');
        return { success: true };
    } catch (error) {
        console.error('Error updating order status:', error);
        return { success: false, error: 'Failed to update order status' };
    }
}

// Get order items formatted for loading into cart (negative values for consumption)
export async function getOrderForCart(orderId: string) {
    try {
        const orderItemsList = await db
            .select()
            .from(orderItems)
            .where(eq(orderItems.orderId, orderId));

        if (orderItemsList.length === 0) {
            return { success: false, error: 'Order not found or has no items' };
        }

        // Format as cart items (negative for consumption)
        const cartItems: Record<string, number> = {};
        for (const oi of orderItemsList) {
            cartItems[oi.itemId] = -oi.quantity;
        }

        return { success: true, data: cartItems };
    } catch (error) {
        console.error('Error getting order for cart:', error);
        return { success: false, error: 'Failed to get order for cart' };
    }
}

export async function cancelOrder(orderId: string, locationName: string) {
    try {
        const order = await db
            .select({ status: orders.status })
            .from(orders)
            .where(eq(orders.id, orderId))
            .limit(1);

        if (order.length === 0) {
            return { success: false, error: 'Order not found' };
        }

        if (order[0].status === 'done' || order[0].status === 'cancelled') {
            return { success: false, error: 'Order cannot be cancelled' };
        }

        await db
            .update(orders)
            .set({ status: 'cancelled', cancelledBy: locationName })
            .where(eq(orders.id, orderId));

        revalidatePath('/orders');
        return { success: true };
    } catch (error) {
        console.error('Error cancelling order:', error);
        return { success: false, error: 'Failed to cancel order' };
    }
}

export async function getLocationOrderCounts(): Promise<Record<string, { open: number; done: number; total: number }>> {
    try {
        const rows = await db
            .select({
                locationId: orders.locationId,
                open: sql<number>`sum(case when ${orders.status} not in ('done', 'cancelled') then 1 else 0 end)`,
                done: sql<number>`sum(case when ${orders.status} = 'done' then 1 else 0 end)`,
                total: sql<number>`count(*)`,
            })
            .from(orders)
            .groupBy(orders.locationId);

        const result: Record<string, { open: number; done: number; total: number }> = {};
        for (const row of rows) {
            result[row.locationId] = { open: Number(row.open), done: Number(row.done), total: Number(row.total) };
        }
        return result;
    } catch {
        return {};
    }
}

export async function deleteLocationHistory(locationId: string) {
    try {
        const { backupDatabaseSync } = await import('@/lib/backup');
        const backup = backupDatabaseSync('delete-loc-history');
        if (!backup) {
            return { success: false, error: 'Backup failed — aborting deletion for safety' };
        }

        // Delete completed orders for this location (status = 'done')
        // order_items cascade-delete via FK
        const deleted = await db
            .delete(orders)
            .where(and(eq(orders.locationId, locationId), eq(orders.status, 'done')))
            .returning({ id: orders.id });

        revalidatePath('/admin');
        revalidatePath('/orders');
        return { success: true, deletedCount: deleted.length };
    } catch (error) {
        console.error('Error deleting location history:', error);
        return { success: false, error: 'Failed to delete location history' };
    }
}

export async function deleteOrder(orderId: string) {
    try {
        const { backupDatabaseSync } = await import('@/lib/backup');
        const backup = backupDatabaseSync('delete-order');
        if (!backup) {
            return { success: false, error: 'Backup failed — aborting deletion for safety' };
        }

        await db.delete(orders).where(eq(orders.id, orderId));
        revalidatePath('/orders');
        revalidatePath('/volunteer');
        return { success: true };
    } catch (error) {
        console.error('Error deleting order:', error);
        return { success: false, error: 'Failed to delete order' };
    }
}
