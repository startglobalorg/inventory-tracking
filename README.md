# START Inventory Management System

A Next.js 16 full-stack inventory management system for the START Summit x Hack 2026 conference. Designed for untrained volunteers to request items from multiple locations (coffee points, accreditation, etc.) with a central fulfillment team managing inventory.

## System Overview

This system has **two main user interfaces**:

### 1. Volunteer Request Interface (Public, Mobile-Optimized)
- **URL Pattern**: `/request/[location-slug]`
- No authentication required
- Simple mobile form to request items by individual units or cases
- Displays only available items (no stock quantities shown)
- Example: `/request/coffee-point-1`, `/request/accreditation`

### 2. Inventory Management Dashboard (Central Team)
- **Main Inventory**: `/` - Track and consume items
- **Order Fulfillment**: `/orders` - View and fulfill volunteer requests
- **History**: `/history` - View consumption logs and statistics
- **Restock**: `/restock` - Record supplier deliveries
- **Add Items**: `/add-item` - Create new inventory items

## Key Features

- **Volunteer Ordering System**: QR code-based requests from multiple locations
- **Order Fulfillment Workflow**: New → In Progress → Done status tracking
- **Prepare Order Feature**: Load volunteer requests into cart for adjustment
- **Dual-Mode Operation**: Consumption tracking and restocking workflows
- **Batch Operations**: Order by cases/boxes or individual items
- **Low Stock Alerts**: Automatic Slack notifications via webhook
- **Full Audit Trail**: Complete history with edit capability
- **Mobile-Optimized**: Touch-friendly interface for volunteers

## Getting Started

### Initial Setup

1. Install dependencies:
```bash
npm install
```

2. Initialize the database and seed locations:
```bash
npm run db:push     # Create database schema
npm run db:seed     # Seed items and 13 locations (12 Coffee Points + Accreditation)
```

3. Start the development server:
```bash
npm run dev
```

4. Access the system:
   - **Inventory Dashboard**: [http://localhost:3000](http://localhost:3000)
   - **Order Fulfillment**: [http://localhost:3000/orders](http://localhost:3000/orders)
   - **Volunteer Request (example)**: [http://localhost:3000/request/coffee-point-1](http://localhost:3000/request/coffee-point-1)

## Managing Coffee Points (Locations)

### Adding a New Location

Locations are stored in the database. To add a new coffee point:

1. Open Drizzle Studio (database UI):
```bash
npm run db:studio
```

2. Navigate to the `locations` table

3. Add a new record:
   - **name**: Display name (e.g., "Coffee Point 13", "VIP Lounge")
   - **slug**: URL-friendly identifier (e.g., "coffee-point-13", "vip-lounge")
   - The slug becomes part of the URL: `/request/[slug]`

### Removing a Location

1. Open Drizzle Studio: `npm run db:studio`
2. Navigate to the `locations` table
3. Delete the location record (all associated orders will be automatically deleted due to cascading foreign keys)

### Viewing All Locations

List all locations with their URLs:

```bash
# View in database
npm run db:studio  # Navigate to 'locations' table
```

Or check the seed file: [`db/seed.ts`](db/seed.ts)

### Creating QR Codes for Locations

Generate QR codes for volunteer request URLs using any QR code generator:

**Recommended Tool**: [QR Code Generator](https://www.qr-code-generator.com/)

**URL Format**: `https://your-domain.com/request/[location-slug]`

**Examples**:
- Coffee Point 1: `https://your-domain.com/request/coffee-point-1`
- Coffee Point 2: `https://your-domain.com/request/coffee-point-2`
- Accreditation: `https://your-domain.com/request/accreditation`

**Production URLs** (replace with your actual domain):
- Local: `http://localhost:3000/request/coffee-point-1`
- Production: `https://inventory.startglobal.org/request/coffee-point-1`

**Tips**:
- Print QR codes on labels/signs at each location
- Test each QR code before deployment
- Include location name on the printed material for clarity

## Project Documentation

- **[CLAUDE.md](CLAUDE.md)** - Complete project architecture and development guide
- **[ADDING_ITEMS.md](ADDING_ITEMS.md)** - How to add inventory items
- **[HETZNER_DEPLOY.md](HETZNER_DEPLOY.md)** - Production deployment instructions
- **[WEBHOOK_INTEGRATION.md](WEBHOOK_INTEGRATION.md)** - Low stock notification setup

## Usage Workflow

### For Volunteers (At Coffee Points)

1. **Scan QR code** at your location
2. **Select items** you need using +1 case or +1 item buttons
3. **Submit request** - inventory team is automatically notified
4. **Wait** - the team will bring your items

### For Inventory Team

1. **Monitor orders** at `/orders` (fulfillment dashboard)
2. **View new requests** organized by status (New, In Progress, Done)
3. **Prepare order**:
   - Click "Prepare Order" button
   - Order items are loaded into cart on main page
   - Adjust quantities if needed (e.g., if running low on stock)
4. **Submit** to deduct from inventory and mark order as done
5. **Deliver items** to the requesting location

### For Stock Management

- **Track consumption**: Main page (`/`) shows current stock
- **Restock items**: Use `/restock` when deliveries arrive
- **View history**: See all logs and statistics at `/history`
- **Manage items**: Add/edit items via `/ add-item` and item detail pages

## Tech Stack

- Next.js 16 with App Router
- TypeScript 5
- Drizzle ORM with SQLite
- Tailwind CSS 4
- React 19 with Context API

## Quick Commands

```bash
# Development
npm run dev              # Start development server (http://localhost:3000)
npm run build            # Create production build
npm run lint             # Run ESLint

# Database
npm run db:push          # Apply schema changes to database
npm run db:studio        # Open Drizzle Studio (web UI for database)
npm run db:seed          # Seed database with items + 13 locations
```

## Default Seeded Locations

After running `npm run db:seed`, the following locations are available:

| Location | Slug | Request URL |
|----------|------|-------------|
| Coffee Point 1 | `coffee-point-1` | `/request/coffee-point-1` |
| Coffee Point 2 | `coffee-point-2` | `/request/coffee-point-2` |
| Coffee Point 3 | `coffee-point-3` | `/request/coffee-point-3` |
| Coffee Point 4 | `coffee-point-4` | `/request/coffee-point-4` |
| Coffee Point 5 | `coffee-point-5` | `/request/coffee-point-5` |
| Coffee Point 6 | `coffee-point-6` | `/request/coffee-point-6` |
| Coffee Point 7 | `coffee-point-7` | `/request/coffee-point-7` |
| Coffee Point 8 | `coffee-point-8` | `/request/coffee-point-8` |
| Coffee Point 9 | `coffee-point-9` | `/request/coffee-point-9` |
| Coffee Point 10 | `coffee-point-10` | `/request/coffee-point-10` |
| Coffee Point 11 | `coffee-point-11` | `/request/coffee-point-11` |
| Coffee Point 12 | `coffee-point-12` | `/request/coffee-point-12` |
| Accreditation | `accreditation` | `/request/accreditation` |

## License

MIT
