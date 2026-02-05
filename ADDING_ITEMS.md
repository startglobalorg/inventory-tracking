# Adding Coffee Point Inventory Items

This guide shows you how to add your coffee point inventory items (drinks from sponsors and snacks) to the database.

## Option 1: Via Seed Script (Recommended for Initial Setup)

Edit the `db/seed.ts` file and add your items. Here's an example template for coffee point items:

```typescript
async function seed() {
  console.log('🌱 Seeding database...');

  // Clear existing data
  await db.delete(logs);
  await db.delete(items);

  // Your coffee point items
  const seedItems = [
    {
      name: 'Red Bull Energy Drink',
      sku: 'ENERGYD-REDBULL-250',
      stock: 48,
      minThreshold: 12,
      category: 'Energy Drinks',
      quantityPerUnit: 24,
      unitName: 'case',
    },
    {
      name: 'Coca-Cola',
      sku: 'SOFTDRI-COCACOLA-330',
      stock: 60,
      minThreshold: 20,
      category: 'Soft Drinks',
      quantityPerUnit: 24,
      unitName: 'case',
    },
    {
      name: 'Granola Bars - Mixed',
      sku: 'SNACKS-NATURE-100',
      stock: 35,
      minThreshold: 10,
      category: 'Snacks',
      quantityPerUnit: 12,
      unitName: 'box',
    },
    // Add more items here...
  ];

  const insertedItems = await db.insert(items).values(seedItems).returning();
  console.log(`✅ Inserted ${insertedItems.length} items`);

  console.log('🎉 Seeding completed!');
  process.exit(0);
}
```

Then run:
```bash
npm run db:seed
```

## Option 2: Via Web UI (Recommended for Adding Single Items)

The application includes a built-in "Add Item" page accessible from the main inventory page. This provides a user-friendly form with:
- Auto-generated SKU from category-brand-size
- Searchable brand dropdown with common brands
- Input validation
- Category dropdown for consistency

Access it at: http://localhost:3000/add-item

## Option 3: Manual Database Insert (For Advanced Users)

You can also manually insert items using Drizzle Studio:

```bash
npm run db:studio
```

This opens a web UI where you can:
- View all tables
- Add new items manually
- Edit existing items
- View and manage logs

## Common Categories for Coffee Points

Here are some suggested categories for organizing your inventory:

- **Energy Drinks**: Red Bull, Monster, etc.
- **Soft Drinks**: Coke, Sprite, Fanta, etc.
- **Juices**: Orange juice, Apple juice, etc.
- **Water**: Still, Sparkling
- **Coffee & Tea**: Coffee beans, Tea bags, etc.
- **Snacks - Salty**: Chips, Pretzels, etc.
- **Snacks - Sweet**: Chocolate bars, Cookies, etc.
- **Snacks - Healthy**: Granola bars, Nuts, Fruit, etc.

## Item Schema Reference

Each item has the following fields:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | text | ✅ | Display name of the item |
| `sku` | text | ✅ | Unique identifier (auto-generated in web UI) |
| `stock` | integer | ✅ | Current stock quantity |
| `minThreshold` | integer | ✅ | Minimum stock before warning |
| `category` | text | ✅ | Category for organization |
| `quantityPerUnit` | integer | ✅ | Items per batch (e.g., 24 for a case) |
| `unitName` | text | ✅ | Unit name (e.g., 'case', 'box') |

## SKU Naming Convention

The web UI auto-generates SKUs using this format:

```
CATEGORY-BRAND-SIZE
```

Examples:
- `ENERGYD-REDBULL-250` (Red Bull 250ml)
- `SOFTDRI-COCACOLA-330` (Coca-Cola 330ml)
- `SNACKS-LAYS-100` (Lays Chips 100g)
- `WATER-EVIAN-500` (Evian Water 500ml)

Note: Category and brand are truncated and sanitized automatically.

## Next Steps

Once you know which drinks and snacks you'll offer:
1. Create a list of all items with their details
2. Update the `db/seed.ts` file with your items
3. Run `npm run db:seed` to populate the database
4. Visit http://localhost:3000 to see your inventory!
