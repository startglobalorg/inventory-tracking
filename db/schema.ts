import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
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
});

export type Item = typeof items.$inferSelect;
export type NewItem = typeof items.$inferInsert;
export type Log = typeof logs.$inferSelect;
export type NewLog = typeof logs.$inferInsert;
