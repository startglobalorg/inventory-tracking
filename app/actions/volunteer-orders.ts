'use server';

import { db } from '@/db/db';
import { locations, orders, orderItems, items } from '@/db/schema';
import { eq, asc, desc } from 'drizzle-orm';
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
        // Get items with stock > 0 but don't expose exact stock numbers
        const availableItems = await db
            .select({
                id: items.id,
                name: items.name,
                category: items.category,
                imageUrl: items.imageUrl,
                quantityPerUnit: items.quantityPerUnit,
                unitName: items.unitName,
            })
            .from(items)
            .where(eq(items.stock, items.stock)) // Placeholder - we filter in JS
            .orderBy(asc(items.category), asc(items.name));

        // Filter to only items with stock > 0
        const allItems = await db.select().from(items);
        const inStockItems = availableItems.filter(item => {
            const fullItem = allItems.find(i => i.id === item.id);
            return fullItem && fullItem.stock > 0;
        });

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
        // Validate location exists
        const location = await db
            .select()
            .from(locations)
            .where(eq(locations.id, locationId))
            .limit(1);

        if (location.length === 0) {
            return { success: false, error: 'Location not found' };
        }

        // Filter out zero quantities
        const validItems = Object.entries(requestedItems).filter(
            ([, qty]) => qty > 0
        );

        if (validItems.length === 0) {
            return { success: false, error: 'No items selected' };
        }

        // Create order
        const newOrder = await db
            .insert(orders)
            .values({
                locationId,
                status: 'new',
            })
            .returning();

        const orderId = newOrder[0].id;

        // Create order items
        for (const [itemId, quantity] of validItems) {
            // Verify item exists
            const item = await db
                .select()
                .from(items)
                .where(eq(items.id, itemId))
                .limit(1);

            if (item.length > 0) {
                await db.insert(orderItems).values({
                    orderId,
                    itemId,
                    quantity,
                });
            }
        }

        revalidatePath('/orders');
        return { success: true, orderId };
    } catch (error) {
        console.error('Error submitting volunteer request:', error);
        return { success: false, error: 'Failed to submit request' };
    }
}

export async function getOrders(statusFilter?: OrderStatus | 'all') {
    try {
        // Get all orders with location info
        const allOrders = await db
            .select({
                id: orders.id,
                locationId: orders.locationId,
                status: orders.status,
                createdAt: orders.createdAt,
                completedAt: orders.completedAt,
            })
            .from(orders)
            .orderBy(asc(orders.createdAt));

        // Get location names
        const allLocations = await db.select().from(locations);
        const locationMap = new Map(allLocations.map(l => [l.id, l.name]));

        // Get all order items with item names
        const allOrderItems = await db
            .select({
                id: orderItems.id,
                orderId: orderItems.orderId,
                itemId: orderItems.itemId,
                quantity: orderItems.quantity,
            })
            .from(orderItems);

        const allItems = await db.select().from(items);
        const itemMap = new Map(allItems.map(i => [i.id, i.name]));

        // Build response
        const ordersWithDetails: OrderWithDetails[] = allOrders
            .filter(order => statusFilter === 'all' || !statusFilter || order.status === statusFilter)
            .map(order => ({
                id: order.id,
                locationId: order.locationId,
                locationName: locationMap.get(order.locationId) || 'Unknown',
                status: order.status as OrderStatus,
                createdAt: order.createdAt,
                completedAt: order.completedAt,
                items: allOrderItems
                    .filter(oi => oi.orderId === order.id)
                    .map(oi => ({
                        id: oi.id,
                        itemId: oi.itemId,
                        itemName: itemMap.get(oi.itemId) || 'Unknown Item',
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

        // Get location name
        const location = await db
            .select()
            .from(locations)
            .where(eq(locations.id, locationId))
            .limit(1);

        const locationName = location[0]?.name || 'Unknown';

        // Get all order items for these orders
        const allOrderItems = await db
            .select({
                id: orderItems.id,
                orderId: orderItems.orderId,
                itemId: orderItems.itemId,
                quantity: orderItems.quantity,
            })
            .from(orderItems);

        const allItems = await db.select().from(items);
        const itemMap = new Map(allItems.map(i => [i.id, i.name]));

        // Build response
        const ordersWithDetails: OrderWithDetails[] = locationOrders.map(order => ({
            id: order.id,
            locationId: order.locationId,
            locationName,
            status: order.status as OrderStatus,
            createdAt: order.createdAt,
            completedAt: order.completedAt,
            items: allOrderItems
                .filter(oi => oi.orderId === order.id)
                .map(oi => ({
                    id: oi.id,
                    itemId: oi.itemId,
                    itemName: itemMap.get(oi.itemId) || 'Unknown Item',
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
        const order = await db
            .select()
            .from(orders)
            .where(eq(orders.id, orderId))
            .limit(1);

        if (order.length === 0) {
            return { success: false, error: 'Order not found' };
        }

        // Get location name
        const location = await db
            .select()
            .from(locations)
            .where(eq(locations.id, order[0].locationId))
            .limit(1);

        // Get order items
        const orderItemsList = await db
            .select()
            .from(orderItems)
            .where(eq(orderItems.orderId, orderId));

        // Get item details
        const itemDetails = await db.select().from(items);
        const itemMap = new Map(itemDetails.map(i => [i.id, i]));

        const orderWithDetails: OrderWithDetails = {
            id: order[0].id,
            locationId: order[0].locationId,
            locationName: location[0]?.name || 'Unknown',
            status: order[0].status as OrderStatus,
            createdAt: order[0].createdAt,
            completedAt: order[0].completedAt,
            items: orderItemsList.map(oi => ({
                id: oi.id,
                itemId: oi.itemId,
                itemName: itemMap.get(oi.itemId)?.name || 'Unknown Item',
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
