'use server';

import { db } from '@/db/db';
import { locations, orders, orderItems, items } from '@/db/schema';
import { eq, asc, desc, gt, inArray } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';

// Types
export type OrderStatus = 'new' | 'in_progress' | 'done';

export interface OrderWithDetails {
    id: string;
    locationId: string;
    locationName: string;
    status: OrderStatus;
    createdAt: Date;
    completedAt: Date | null;
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

export async function getAvailableItems() {
    try {
        // Single query: get items with stock > 0, excluding exact stock numbers
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
            .where(gt(items.stock, 0))
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
    requestedItems: Record<string, number> // itemId -> quantity
) {
    try {
        // Filter out zero quantities
        const validItems = Object.entries(requestedItems).filter(
            ([, qty]) => qty > 0
        );

        if (validItems.length === 0) {
            return { success: false, error: 'No items selected' };
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

            // Fetch all item details including coldStorage field
            const itemIds = validItems.map(([id]) => id);
            const existingItems = tx
                .select({
                    id: items.id,
                    coldStorage: items.coldStorage,
                })
                .from(items)
                .where(inArray(items.id, itemIds))
                .all();

            if (!existingItems) {
                throw new Error('Failed to validate items');
            }

            const existingIds = new Set(existingItems.map(i => i.id));
            const missingIds = itemIds.filter(id => !existingIds.has(id));

            if (missingIds.length > 0) {
                throw new Error('Some requested items no longer exist');
            }

            // Create a map of itemId -> coldStorage status
            const itemStorageMap = new Map(existingItems.map(i => [i.id, i.coldStorage]));

            // Separate items by storage type
            const normalItems: Array<[string, number]> = [];
            const coldItems: Array<[string, number]> = [];

            for (const [itemId, quantity] of validItems) {
                const isColdStorage = itemStorageMap.get(itemId);
                if (isColdStorage) {
                    coldItems.push([itemId, quantity]);
                } else {
                    normalItems.push([itemId, quantity]);
                }
            }

            const orderIds: string[] = [];

            // Create normal warehouse order if there are normal items
            if (normalItems.length > 0) {
                const normalOrder = tx
                    .insert(orders)
                    .values({
                        locationId,
                        status: 'new',
                        storageType: 'normal',
                    })
                    .returning()
                    .all();

                if (!normalOrder || normalOrder.length === 0) {
                    throw new Error('Failed to create normal order');
                }

                const normalOrderId = normalOrder[0].id;
                orderIds.push(normalOrderId);

                // Create order items for normal storage
                for (const [itemId, quantity] of normalItems) {
                    tx.insert(orderItems).values({
                        orderId: normalOrderId,
                        itemId,
                        quantity,
                    }).run();
                }
            }

            // Create cold storage order if there are cold items
            if (coldItems.length > 0) {
                const coldOrder = tx
                    .insert(orders)
                    .values({
                        locationId,
                        status: 'new',
                        storageType: 'cold',
                    })
                    .returning()
                    .all();

                if (!coldOrder || coldOrder.length === 0) {
                    throw new Error('Failed to create cold order');
                }

                const coldOrderId = coldOrder[0].id;
                orderIds.push(coldOrderId);

                // Create order items for cold storage
                for (const [itemId, quantity] of coldItems) {
                    tx.insert(orderItems).values({
                        orderId: coldOrderId,
                        itemId,
                        quantity,
                    }).run();
                }
            }

            return { orderIds, normalCount: normalItems.length, coldCount: coldItems.length };
        });

        revalidatePath('/orders');
        revalidatePath('/orders/cold-storage');

        let message = 'Order submitted successfully';
        if (result.normalCount > 0 && result.coldCount > 0) {
            message = `Order split: ${result.normalCount} normal items, ${result.coldCount} cold storage items`;
        }

        return { success: true, orderIds: result.orderIds, message };
    } catch (error) {
        console.error('Error submitting volunteer request:', error);
        return { success: false, error: error instanceof Error ? error.message : 'Failed to submit request' };
    }
}

export async function getOrders(
    statusFilter?: OrderStatus | 'all',
    storageTypeFilter?: 'normal' | 'cold' | 'all'
) {
    try {
        // Fetch orders with location names via JOIN
        const allOrders = await db
            .select({
                id: orders.id,
                locationId: orders.locationId,
                locationName: locations.name,
                status: orders.status,
                storageType: orders.storageType,
                createdAt: orders.createdAt,
                completedAt: orders.completedAt,
            })
            .from(orders)
            .leftJoin(locations, eq(orders.locationId, locations.id))
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

        // Build response with filtering
        const ordersWithDetails: OrderWithDetails[] = allOrders
            .filter(order => {
                const statusMatch = statusFilter === 'all' || !statusFilter || order.status === statusFilter;
                const storageMatch = !storageTypeFilter || storageTypeFilter === 'all' || order.storageType === storageTypeFilter;
                return statusMatch && storageMatch;
            })
            .map(order => ({
                id: order.id,
                locationId: order.locationId,
                locationName: order.locationName || 'Unknown',
                status: order.status as OrderStatus,
                storageType: order.storageType as 'normal' | 'cold',
                createdAt: order.createdAt,
                completedAt: order.completedAt,
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
