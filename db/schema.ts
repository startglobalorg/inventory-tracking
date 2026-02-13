import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

// Items table - stores inventory items
export const items = sqliteTable('items', {
    id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
    name: text('name').notNull(),
    sku: text('sku').notNull().unique(),
    stock: integer('stock').notNull().default(0),
    minThreshold: integer('min_threshold').notNull().default(10),
    category: text('category').notNull(),
    imageUrl: text('image_url'),

    // New fields for batch updates
    quantityPerUnit: integer('quantity_per_unit').default(1),
    unitName: text('unit_name').default('case'),

    createdAt: integer('created_at', { mode: 'timestamp' })
        .notNull()
        .default(sql`(unixepoch())`),
});

// Logs table - tracks inventory changes
export const logs = sqliteTable('logs', {
    id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
    itemId: text('item_id')
        .notNull()
        .references(() => items.id, { onDelete: 'cascade' }),
    changeAmount: integer('change_amount').notNull(),
    reason: text('reason', {
        enum: ['consumed', 'restocked', 'adjustment']
    }).notNull(),
    userName: text('user_name'),
    createdAt: integer('created_at', { mode: 'timestamp' })
        .notNull()
        .default(sql`(unixepoch())`),
}, (table) => [
    index('logs_item_id_idx').on(table.itemId),
]);

// Locations table - stores coffee points and other volunteer stations
export const locations = sqliteTable('locations', {
    id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
    name: text('name').notNull(),
    slug: text('slug').notNull().unique(), // For QR codes, e.g., "coffee-point-1"
    createdAt: integer('created_at', { mode: 'timestamp' })
        .notNull()
        .default(sql`(unixepoch())`),
});

// Orders table - volunteer requests for items
export const orders = sqliteTable('orders', {
    id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
    locationId: text('location_id')
        .notNull()
        .references(() => locations.id, { onDelete: 'cascade' }),
    status: text('status', {
        enum: ['new', 'in_progress', 'done']
    }).notNull().default('new'),
    createdAt: integer('created_at', { mode: 'timestamp' })
        .notNull()
        .default(sql`(unixepoch())`),
    completedAt: integer('completed_at', { mode: 'timestamp' }),
}, (table) => [
    index('orders_location_id_idx').on(table.locationId),
]);

// Order items table - line items for each order
export const orderItems = sqliteTable('order_items', {
    id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
    orderId: text('order_id')
        .notNull()
        .references(() => orders.id, { onDelete: 'cascade' }),
    itemId: text('item_id')
        .notNull()
        .references(() => items.id, { onDelete: 'cascade' }),
    quantity: integer('quantity').notNull(),
}, (table) => [
    index('order_items_order_id_idx').on(table.orderId),
    index('order_items_item_id_idx').on(table.itemId),
]);

// Type exports
export type Item = typeof items.$inferSelect;
export type NewItem = typeof items.$inferInsert;
export type Log = typeof logs.$inferSelect;
export type NewLog = typeof logs.$inferInsert;
export type Location = typeof locations.$inferSelect;
export type NewLocation = typeof locations.$inferInsert;
export type Order = typeof orders.$inferSelect;
export type NewOrder = typeof orders.$inferInsert;
export type OrderItem = typeof orderItems.$inferSelect;
export type NewOrderItem = typeof orderItems.$inferInsert;
