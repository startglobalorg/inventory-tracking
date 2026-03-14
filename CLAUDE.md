# CLAUDE.md

## Project Overview

Next.js 16 full-stack inventory management system for coffee points at START Summit x Hack 2026. Dual modes: **consumption tracking** and **restocking**. Volunteers request items via QR code → coordinators fulfill → runners deliver.

**Stack:** Next.js 16 (App Router), TypeScript 5, Drizzle ORM 0.40 + SQLite (better-sqlite3), Tailwind CSS 4, React 19.

## Commands

```bash
npm run dev          # Dev server on :3000
npm run build        # Production build (standalone)
npm run db:push      # Apply schema changes (needs TTY)
npm run db:studio    # Drizzle Studio (DB UI)
npm run db:seed      # Seed items + 13 locations
```

**Docker:** `docker compose -f docker-compose.prod.yml up -d` (port 3001). Env: `DATABASE_URL=/app/sqlite-data/sqlite.db`.

## Page Structure

```
app/
├── page.tsx                    # Consume mode (main inventory)
├── restock/page.tsx            # Supplier deliveries
├── history/page.tsx            # Order history + statistics
├── orders/page.tsx             # Fulfillment dashboard
├── add-item/page.tsx           # Create items
├── item/[id]/page.tsx          # Edit/delete items + location limits
├── runner/page.tsx              # Runner dashboard (claim/complete)
├── request/[slug]/page.tsx     # Volunteer request form (public)
├── request/[slug]/history/     # Location order history
├── actions.ts                  # Item CRUD
└── actions/
    ├── order.ts                # submitOrder (batch stock updates)
    ├── history.ts              # Order history queries
    ├── webhook.ts              # Low stock alerts (n8n/Slack)
    ├── volunteer-orders.ts     # Volunteer order management
    ├── runners.ts              # Runner CRUD + assignment
    └── limits.ts               # Location order limits (CRUD + usage)
```

## Database Schema (`db/schema.ts`)

| Table | Key Columns | Notes |
|-------|------------|-------|
| `items` | id, name, sku (unique), stock, category, quantityPerUnit, unitName, coldStorage, restrictedToLocationSlug | Core inventory |
| `logs` | id, itemId (FK→items, SET NULL), changeAmount, reason (consumed/restocked/adjustment/cleared) | Audit trail |
| `locations` | id, name, slug (unique), type (inventory/text), accessPin | Volunteer stations |
| `orders` | id, locationId (FK→locations), runnerId (FK→runners, SET NULL), status (new/in_progress/done/cancelled), customRequest, storageType | Volunteer requests |
| `order_items` | id, orderId (FK→orders, CASCADE), itemId (FK→items, CASCADE), quantity | Order line items |
| `runners` | id, name (unique) | Delivery staff |
| `location_item_limits` | id, locationId (FK→locations, CASCADE), itemId (FK→items, CASCADE), maxLimit | Per-location order caps. Unique on (locationId, itemId). No record = unlimited. |

## Key Workflows

**Volunteer ordering:** Scan QR → `/request/[slug]` → select items → submit → order status `new` → coordinator assigns runner at `/orders` (or runner self-assigns at `/runner`) → "Prepare Order" loads cart → submit deducts stock, marks `done`.

**Runner:** Opens `/runner` → soft login via name (3-day cookie) → sees "My Orders" + can claim unassigned → delivers → taps "Mark Done". Auto-refreshes every 15s.

**Location limits:** Coordinators set max order quantities per item per location from the item edit page (`/item/[id]`). Enforced server-side in `submitVolunteerRequest` transaction. Volunteer form shows "Limit Reached" and disables buttons when cap is hit. Cancelled orders don't count toward usage.

## Server Actions Reference

| File | Key Actions |
|------|------------|
| `actions.ts` | `updateStock`, `createItem`, `updateItem`, `deleteItem` |
| `actions/order.ts` | `submitOrder` (batch update) |
| `actions/history.ts` | `getOrderHistory`, `getOrderStatistics`, `editOrderLog`, `deleteOrderLog` |
| `actions/webhook.ts` | `notifyLowStock` |
| `actions/volunteer-orders.ts` | `getLocations`, `getLocationBySlug`, `getAvailableItems`, `submitVolunteerRequest`, `getOrders`, `getOrdersByLocation`, `updateOrderStatus`, `getOrderForCart`, `cancelOrder`, `deleteOrder` |
| `actions/runners.ts` | `getRunners`, `createRunner`, `setRunnerCookie`, `clearRunnerCookie`, `assignOrder`, `claimOrder`, `getUnassignedOrders`, `getRunnerOrders` |
| `actions/limits.ts` | `setLimits`, `getLimitsForItem`, `getLimitsForLocation`, `getLocationItemUsage` |

## Client Components

| Component | Purpose |
|-----------|---------|
| `CartProvider.tsx` | Cart state context (itemId → quantity delta, linkedOrderId) |
| `CartSummary.tsx` | Floating review panel + submit (handles order fulfillment) |
| `CartInitializer.tsx` | URL params → pre-populate cart from volunteer orders |
| `InventoryCard.tsx` / `InventoryList.tsx` | Item cards with ordering buttons, grid with search/filter |
| `EditItemForm.tsx` | Item edit form + delete + location limits section |
| `VolunteerRequestForm.tsx` | Mobile volunteer form (`app/request/[slug]/`) |
| `FulfillmentDashboard.tsx` | Kanban/list order view (`app/orders/`) |
| `RunnerApp.tsx` | Runner soft-login + dashboard (`app/runner/`) |

## Key Patterns

- All DB-dependent pages: `export const dynamic = 'force-dynamic'`
- All mutations via `"use server"` functions
- `cookies()` must be awaited (Next 15+ App Router)
- better-sqlite3 transactions are synchronous (no async/await inside `db.transaction`)
- Every stock change creates a log entry (audit trail)
- Color palette: `bg-night`, `bg-grape`, `border-esbee`, `bg-cerise`, `bg-jayouh`

## Webhook

Low stock alerts → `https://n8n.startglobal.org/webhook/4576bef6-c2b0-4560-852e-93e9cf7d72ae`. See `WEBHOOK_INTEGRATION.md`.

## Limitations

- No user authentication (volunteer requests are public by design)
- No role-based access control
- `userName` in logs is free text

## Docs

`README.md` (quick start), `ADDING_ITEMS.md` (item guide), `HETZNER_DEPLOY.md` (deployment), `WEBHOOK_INTEGRATION.md` (Slack alerts).
