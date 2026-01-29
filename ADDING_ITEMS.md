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
      sku: 'DRINK-RB-250',
      stock: 48,
      minThreshold: 12,
      category: 'Energy Drinks',
      imageUrl: 'URL_TO_IMAGE', // Optional
    },
    {
      name: 'Coca-Cola',
      sku: 'DRINK-COKE-330',
      stock: 60,
      minThreshold: 20,
      category: 'Soft Drinks',
      imageUrl: 'URL_TO_IMAGE',
    },
    {
      name: 'Granola Bars - Mixed',
      sku: 'SNACK-GB-MIX',
      stock: 35,
      minThreshold: 10,
      category: 'Snacks',
      imageUrl: 'URL_TO_IMAGE',
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

## Option 2: Manual Database Insert (For Testing)

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
| `sku` | text | ✅ | Unique identifier/barcode |
| `stock` | integer | ✅ | Current stock quantity |
| `minThreshold` | integer | ✅ | Minimum stock before warning |
| `category` | text | ✅ | Category for organization |
| `imageUrl` | text | ❌ | Optional product image URL |

## SKU Naming Convention

Consider using a consistent SKU format for easy management:

```
CATEGORY-BRAND-SIZE
```

Examples:
- `DRINK-RB-250` (Red Bull 250ml)
- `DRINK-COKE-330` (Coca-Cola 330ml)
- `SNACK-CHIPS-100` (Chips 100g)
- `WATER-STILL-500` (Still Water 500ml)

## Next Steps

Once you know which drinks and snacks you'll offer:
1. Create a list of all items with their details
2. Update the `db/seed.ts` file with your items
3. Run `npm run db:seed` to populate the database
4. Visit http://localhost:3000 to see your inventory!
