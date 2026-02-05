# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Next.js 16 full-stack inventory management system for a coffee point (cafe/break room). It tracks stock levels with dual operating modes: **consumption tracking** (when items are taken) and **restocking** (when supplier deliveries arrive). All inventory changes are logged with full audit trails.

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

**Docker deployment**: Multi-stage build with Alpine base, runs on port 3000 (recently changed to 3001 in some contexts - check Dockerfile and docker-compose.prod.yml).

## Architecture Overview

### Dual-Mode Operation

The system has two distinct workflows:

1. **Consume Mode** ([/app/page.tsx](app/page.tsx)): Main inventory view where users track items taken from stock
   - Browse items, add to basket with custom quantities
   - Submit consumption order (decrements stock)

2. **Restock Mode** ([/app/restock/page.tsx](app/restock/page.tsx)): Supplier restocking interface
   - Add quantities to restock order
   - Submit restock order (increments stock)

Both modes use the same cart system ([components/CartProvider.tsx](components/CartProvider.tsx)) but with different semantics (negative deltas for consumption, positive for restocking).

### Data Layer

**Database Schema** ([db/schema.ts](db/schema.ts)):

- **items table**: Core inventory with `stock`, `minThreshold`, `category`, `quantityPerUnit`, `unitName` (for batch tracking)
- **logs table**: Complete audit trail with `itemId`, `changeAmount`, `reason` (enum: consumed/restocked/adjustment), `userName`, timestamp

**Server Actions** ([app/actions.ts](app/actions.ts), [app/actions/order.ts](app/actions/order.ts)):
- `updateStock()`: Single item updates
- `submitOrder()`: Batch operations that atomically update multiple items and create log entries

### State Management Pattern

**Cart System**: Client-side React Context that accumulates changes before submission
- [components/CartProvider.tsx](components/CartProvider.tsx): Context provider with `cart` (Map of itemId → delta)
- [components/CartSummary.tsx](components/CartSummary.tsx): Floating review panel with submit action
- Optimistic UI updates before server confirmation
- Toast notifications for feedback

**Search/Filtering**: Client-side filtering in [components/InventoryList.tsx](components/InventoryList.tsx)
- Real-time search across name, SKU, category
- Stats dashboard: total items, low stock alerts, category count

### Component Organization

- **Server Components**: Data fetching pages ([app/page.tsx](app/page.tsx), [app/restock/page.tsx](app/restock/page.tsx))
- **Client Components**: Interactive UI with `"use client"` directive
  - [components/InventoryCard.tsx](components/InventoryCard.tsx): Item cards with increment/decrement
  - [components/SearchBar.tsx](components/SearchBar.tsx): Search input
  - Cart-related components (CartProvider, CartSummary)

### Key Patterns

**Server Actions** must be async functions marked with `"use server"` and can only return serializable data. They handle:
- Database mutations via Drizzle ORM
- Transaction management for multi-item updates
- Creating audit log entries

**Item Management**: See [ADDING_ITEMS.md](ADDING_ITEMS.md) for:
- Seeding database with items via [db/seed.ts](db/seed.ts)
- SKU naming conventions (CATEGORY-BRAND-SIZE)
- Recommended categories (Energy Drinks, Soft Drinks, Snacks, etc.)
- Using Drizzle Studio web UI for manual item management

## Database Notes

- SQLite database file: `sqlite.db` (excluded from git)
- Drizzle migrations: Push schema changes with `npm run db:push`
- Schema changes require updating [db/schema.ts](db/schema.ts) then running `db:push`
- Access database directly via `npm run db:studio` for inspection/manual edits

## Recent Architecture Changes

Recent commits show:
- Removed authentication features (deleted `app/actions/auth.ts`, `app/login/page.tsx`, `middleware.ts`)
- Simplified to single-user/team-accessible system without login requirements
- Port configuration iterations for deployment (3000 → 3001 in some contexts)
