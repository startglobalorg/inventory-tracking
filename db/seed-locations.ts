import { db } from './db';
import { locations } from './schema';
import { eq } from 'drizzle-orm';

async function seedLocations() {
    console.log('Seeding locations (safe mode - preserves existing data)...');

    const seedLocations = [
        ...Array.from({ length: 12 }, (_, i) => ({
            name: `Coffee Point ${i + 1}`,
            slug: `coffee-point-${i + 1}`,
        })),
        { name: 'Accreditation', slug: 'accreditation' },
    ];

    for (const loc of seedLocations) {
        // Check if location already exists
        const existing = await db
            .select()
            .from(locations)
            .where(eq(locations.slug, loc.slug))
            .limit(1);

        if (existing.length > 0) {
            console.log(`✓ Location "${loc.name}" already exists (${loc.slug})`);
        } else {
            await db.insert(locations).values(loc);
            console.log(`+ Added location "${loc.name}" (${loc.slug})`);
        }
    }

    console.log('Locations seeded successfully!');
    process.exit(0);
}

seedLocations().catch((error) => {
    console.error('Error seeding locations:', error);
    process.exit(1);
});
