import { db } from './db';
import { items, logs, locations, orders, orderItems } from './schema';

async function seed() {
    console.log('Clearing database...');

    // Clear existing data (order matters due to foreign keys)
    await db.delete(orderItems);
    await db.delete(orders);
    await db.delete(logs);
    await db.delete(items);
    await db.delete(locations);

    // Your coffee point items
    const seedItems = [
        {
            name: 'Red Bull (250ml)',
            sku: 'DRINK-RB-250',
            stock: 40, // 10 packs of 4
            minThreshold: 8,
            category: 'Energy Drinks',
            imageUrl: 'https://images.unsplash.com/photo-1598614187854-26a60e982dc4?w=400',
            quantityPerUnit: 4,
            unitName: 'pack',
        },
        {
            name: 'Coca-Cola (500ml)',
            sku: 'DRINK-COKE-500',
            stock: 48, // 2 cases of 24
            minThreshold: 24,
            category: 'Soft Drinks',
            imageUrl: 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=400',
            quantityPerUnit: 24,
            unitName: 'case',
        },
        {
            name: 'Perfect Meal Vegan',
            sku: 'MEAL-PM-VEGAN',
            stock: 20, // 5 packs of 4
            minThreshold: 4,
            category: 'Meals',
            imageUrl: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=400',
            quantityPerUnit: 4,
            unitName: 'pack',
        },
        {
            name: 'Isey Skyr',
            sku: 'DAIRY-SKYR',
            stock: 15,
            minThreshold: 5,
            category: 'Dairy',
            imageUrl: 'https://images.unsplash.com/photo-1563636619-e9143da7973b?w=400',
            quantityPerUnit: 1,
            unitName: 'unit',
        },
    ];

    const insertedItems = await db.insert(items).values(seedItems).returning();
    console.log(`Inserted ${insertedItems.length} items`);

    // Seed locations: 12 Coffee Points + 1 Accreditation
    const seedLocations = [
        ...Array.from({ length: 12 }, (_, i) => ({
            name: `Coffee Point ${i + 1}`,
            slug: `coffee-point-${i + 1}`,
        })),
        {
            name: 'Accreditation',
            slug: 'accreditation',
        },
    ];

    const insertedLocations = await db.insert(locations).values(seedLocations).returning();
    console.log(`Inserted ${insertedLocations.length} locations`);

    console.log('Seeding completed!');

    process.exit(0);
}

seed().catch((error) => {
    console.error('Seeding failed:', error);
    process.exit(1);
});
