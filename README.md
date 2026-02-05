# Inventory Tracking System

A Next.js 16 full-stack inventory management system for coffee points. Track consumption, manage restocking, and monitor stock levels with full audit trails.

## Features

- **Dual-Mode Operation**: Consumption tracking and restocking workflows
- **Batch Operations**: Quick batch quantity buttons (6, 12, 24, etc.)
- **Low Stock Alerts**: Automatic Slack notifications via webhook
- **Order History**: Complete audit trail with edit capability
- **Statistics Dashboard**: Track consumption, restocking, and trends
- **Mobile-Optimized**: Responsive design for on-the-go access

## Getting Started

Install dependencies and run the development server:

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to access the inventory system.

## Project Documentation

- **[CLAUDE.md](CLAUDE.md)** - Complete project architecture and development guide
- **[ADDING_ITEMS.md](ADDING_ITEMS.md)** - How to add inventory items
- **[HETZNER_DEPLOY.md](HETZNER_DEPLOY.md)** - Production deployment instructions
- **[WEBHOOK_INTEGRATION.md](WEBHOOK_INTEGRATION.md)** - Low stock notification setup

## Tech Stack

- Next.js 16 with App Router
- TypeScript 5
- Drizzle ORM with SQLite
- Tailwind CSS 4
- React 19 with Context API

## Quick Commands

```bash
npm run dev              # Start development server
npm run build            # Create production build
npm run db:push          # Apply schema changes
npm run db:studio        # Open database UI
npm run db:seed          # Seed initial data
```
