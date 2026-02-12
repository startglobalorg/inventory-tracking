# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Next.js 16 full-stack inventory management system for coffee points (cafe/break rooms). It tracks stock levels with dual operating modes: **consumption tracking** (when items are taken) and **restocking** (when supplier deliveries arrive). All inventory changes are logged with full audit trails.

## Technology Stack

- **Next.js 16** with App Router (React Server Components + Client Components)
- **TypeScript 5** with strict type checking
- **Drizzle ORM 0.40** with SQLite (better-sqlite3)
- **Tailwind CSS 4** for styling
- **React 19** with Context API for cart state management

## Development Commands

```bash
npm run dev              # Start dev server on http://localhost:3000
npm run build            # Create production build (standalone output)
npm start                # Run production build
npm run lint             # Run ESLint

npm run db:push          # Apply schema changes to database
npm run db:studio        # Open Drizzle Studio (web UI for database)
npm run db:seed          # Seed database with initial items (see db/seed.ts)
```

**Docker deployment**: Multi-stage build with Alpine base. Production runs on port 3001 (mapped from internal 3000). See `docker-compose.prod.yml`.

---

## Current Features (as of Feb 2026)

### Core Functionality

| Feature | Description | Files |
|---------|-------------|-------|
| **Consume Mode** | Track items taken from stock | `app/page.tsx` |
| **Restock Mode** | Record supplier deliveries | `app/restock/page.tsx` |
| **Order History** | View all past transactions with edit/delete | `app/orders/page.tsx` |
| **Statistics Dashboard** | Consumption trends, top items, category breakdown | `components/StatsDashboard.tsx` |
| **Item Management** | Full CRUD for inventory items | `app/item/[id]/page.tsx`, `app/add-item/page.tsx` |
| **Low Stock Alerts** | Webhook notifications via n8n/Slack | `app/actions/webhook.ts` |

### Ordering Options

| Option | Description |
|--------|-------------|
| **Batch Button** | Quick "Take 24 (case)" for full units |
| **Custom Units** | Enter number of cases/boxes to take |
| **Custom Items** | Enter exact number of individual items |

### Recent Additions

- **Item Edit Page** (`/item/[id]`) - Edit all item properties, delete items
- **Auto-generated SKU** - SKU created from category-name-size pattern (ensures uniqueness)
- **Searchable Brand Dropdown** - 28 predefined brands + custom option
- **Custom Unit Ordering** - Order by cases/boxes, not just individual items
- **Delete Functionality** - Remove items with confirmation modal
- **Mobile Optimization** - Responsive design, touch-friendly buttons

### Volunteer Ordering System (START Summit x Hack 2026)

| Feature | Description | Files |
|---------|-------------|-------|
| **Volunteer Request** | Public mobile form for volunteers to request items | `app/request/[slug]/page.tsx` |
| **Location Order History** | View past orders for each coffee point | `app/request/[slug]/history/page.tsx` |
| **Order Fulfillment** | Kanban/list view for inventory team | `app/orders/page.tsx` |
| **Prepare Order** | Load volunteer request into cart for fulfillment | `components/CartInitializer.tsx` |
| **Locations** | 12 Coffee Points + Accreditation seeded | `db/seed.ts` |

**Workflow:**
1. Volunteer scans QR code → `/request/coffee-point-1`
2. Selects items needed (no stock numbers shown, can order by case/unit)
3. Submits request → Order status: `new`
4. Can view past orders → `/request/coffee-point-1/history`
5. Inventory team sees order in `/orders`
6. Clicks "Prepare Order" → Items loaded into cart on main page
7. Adjusts quantities if needed, submits → Stock deducted, order marked `done`

---

## Architecture Overview

### Page Structure

```
app/
├── page.tsx              # Consume mode (main inventory view)
├── restock/page.tsx      # Restock mode (supplier deliveries)
├── history/page.tsx      # Order history + statistics
├── orders/page.tsx       # Volunteer order fulfillment dashboard
├── add-item/page.tsx     # Create new items
├── item/[id]/page.tsx    # Edit/delete individual items
├── request/[slug]/
│   ├── page.tsx          # Volunteer request form (public)
│   └── history/page.tsx  # Location-specific order history
├── actions.ts            # Item CRUD server actions
└── actions/
    ├── order.ts          # submitOrder (batch stock updates)
    ├── history.ts        # Order history queries
    ├── webhook.ts        # Low stock notifications
    └── volunteer-orders.ts  # Volunteer order management
```

### Database Schema

**File:** `db/schema.ts`

```typescript
// items table
{
  id: text (UUID, primary key)
  name: text
  sku: text (unique)
  stock: integer
  minThreshold: integer
  category: text
  quantityPerUnit: integer (e.g., 24 for a case)
  unitName: text (e.g., "case", "box")
  createdAt: timestamp
}

// logs table (audit trail)
{
  id: text (UUID, primary key)
  itemId: text (FK to items)
  changeAmount: integer (positive or negative)
  reason: enum ('consumed' | 'restocked' | 'adjustment')
  userName: text
  createdAt: timestamp
}

// locations table (volunteer stations)
{
  id: text (UUID, primary key)
  name: text (e.g., "Coffee Point 1")
  slug: text (unique, for QR codes)
  createdAt: timestamp
}

// orders table (volunteer requests)
{
  id: text (UUID, primary key)
  locationId: text (FK to locations)
  status: enum ('new' | 'in_progress' | 'done')
  createdAt: timestamp
  completedAt: timestamp (nullable)
}

// order_items table (line items)
{
  id: text (UUID, primary key)
  orderId: text (FK to orders)
  itemId: text (FK to items)
  quantity: integer
}
```

### Server Actions

| Action | File | Purpose |
|--------|------|---------|
| `updateStock()` | `app/actions.ts` | Single item stock change |
| `createItem()` | `app/actions.ts` | Add new item |
| `updateItem()` | `app/actions.ts` | Edit item properties |
| `deleteItem()` | `app/actions.ts` | Remove item + logs |
| `submitOrder()` | `app/actions/order.ts` | Batch update multiple items |
| `getOrderHistory()` | `app/actions/history.ts` | Fetch audit logs |
| `getOrderStatistics()` | `app/actions/history.ts` | Consumption stats |
| `editOrderLog()` | `app/actions/history.ts` | Modify log entry |
| `deleteOrderLog()` | `app/actions/history.ts` | Remove log entry |
| `notifyLowStock()` | `app/actions/webhook.ts` | Send webhook alert |
| `getLocations()` | `app/actions/volunteer-orders.ts` | List all locations |
| `getLocationBySlug()` | `app/actions/volunteer-orders.ts` | Get location by URL slug |
| `getAvailableItems()` | `app/actions/volunteer-orders.ts` | Items with stock > 0 (no qty shown) |
| `submitVolunteerRequest()` | `app/actions/volunteer-orders.ts` | Create new volunteer order |
| `getOrders()` | `app/actions/volunteer-orders.ts` | Fetch orders with items |
| `getOrdersByLocation()` | `app/actions/volunteer-orders.ts` | Fetch orders for specific location |
| `updateOrderStatus()` | `app/actions/volunteer-orders.ts` | Change order status |
| `getOrderForCart()` | `app/actions/volunteer-orders.ts` | Get order items for cart loading |

### Component Architecture

**Client Components** (`"use client"`):
- `CartProvider.tsx` - Cart state context (itemId → quantity delta, linkedOrderId)
- `CartSummary.tsx` - Floating review panel + submit form (handles order fulfillment)
- `CartInitializer.tsx` - Reads URL params to pre-populate cart from volunteer orders
- `InventoryCard.tsx` - Item card with ordering buttons
- `InventoryList.tsx` - Grid view with search/filter
- `EditItemForm.tsx` - Item edit form with delete
- `OrderHistoryClient.tsx` - Log table with edit/delete
- `StatsDashboard.tsx` - Statistics display
- `ToastProvider.tsx` - Toast notifications
- `VolunteerRequestForm.tsx` - Mobile form for volunteers (`app/request/[slug]/`)
- `LocationOrderHistory.tsx` - Order history per location (`app/request/[slug]/history/`)
- `FulfillmentDashboard.tsx` - Kanban/list view for orders (`app/orders/`)

**Server Components**:
- All page.tsx files fetch data and render client components

### Key Patterns

1. **Dynamic Rendering**: All database-dependent pages use `export const dynamic = 'force-dynamic'`
2. **Optimistic UI**: Cart shows changes before server confirmation
3. **Server Actions**: All mutations via `"use server"` functions
4. **Audit Trail**: Every stock change creates a log entry

---

## Deployment

### Docker (Production)

```bash
# Build and deploy
docker compose -f docker-compose.prod.yml down
docker compose -f docker-compose.prod.yml build --no-cache
docker compose -f docker-compose.prod.yml up -d
```

**Key files:**
- `Dockerfile` - Multi-stage build with Alpine
- `docker-compose.prod.yml` - Production config (port 3001)
- `.dockerignore` - Excludes node_modules, .next, database files
- `scripts/start.sh` - Container startup (handles permissions)
- `scripts/init-db.js` - Database initialization

### Environment Variables

```env
DATABASE_URL=/app/sqlite-data/sqlite.db
NODE_ENV=production
```

---

## Webhook Integration

Low stock alerts are sent via webhook when an item drops to or below `minThreshold`:

**Endpoint:** `https://n8n.startglobal.org/webhook/4576bef6-c2b0-4560-852e-93e9cf7d72ae`

**Payload:**
```json
{
  "event": "low_stock_alert",
  "item": { "id", "name", "sku", "category", "stock", "minThreshold" },
  "timestamp": "ISO date"
}
```

See `WEBHOOK_INTEGRATION.md` for setup details.

---

## Current Limitations

- No user authentication (volunteer requests are public by design)
- No role-based access control (order fulfillment dashboard is open)
- `userName` in logs is free text input

## Future Enhancements

Potential improvements:
- PIN protection for order fulfillment dashboard
- User authentication for inventory managers
- QR code generation for location URLs
- Push notifications for new orders
- Order history and analytics

---

## File Reference

### Core Files to Know

| File | Purpose |
|------|---------|
| `db/schema.ts` | Database table definitions |
| `app/actions.ts` | Item CRUD operations |
| `app/actions/order.ts` | Order submission logic |
| `app/actions/volunteer-orders.ts` | Volunteer order management |
| `components/CartProvider.tsx` | Cart state management |
| `components/CartInitializer.tsx` | URL param cart loading |
| `components/InventoryCard.tsx` | Main item UI component |
| `app/request/[slug]/VolunteerRequestForm.tsx` | Volunteer mobile form |
| `app/orders/FulfillmentDashboard.tsx` | Order fulfillment UI |
| `next.config.ts` | Next.js config (standalone output) |
| `drizzle.config.ts` | Database connection config |

### Documentation

| File | Purpose |
|------|---------|
| `CLAUDE.md` | This file - project overview |
| `README.md` | Quick start guide |
| `ADDING_ITEMS.md` | How to add inventory items |
| `HETZNER_DEPLOY.md` | Production deployment guide |
| `WEBHOOK_INTEGRATION.md` | Slack notification setup |
