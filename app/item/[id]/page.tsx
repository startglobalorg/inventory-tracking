import { db } from '@/db/db';
import { items } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { notFound } from 'next/navigation';
import { EditItemForm } from '@/components/EditItemForm';
import { getLimitsForItem } from '@/app/actions/limits';

// Force dynamic rendering since this page requires database access
export const dynamic = 'force-dynamic';

export default async function ItemPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;

    const item = await db.select().from(items).where(eq(items.id, id)).limit(1);

    if (item.length === 0) {
        notFound();
    }

    const limitsResult = await getLimitsForItem(id);
    const existingLimits = limitsResult.success ? limitsResult.data || [] : [];

    // Convert to map: locationId -> maxLimit
    const limitsMap: Record<string, number> = {};
    for (const l of existingLimits) {
        limitsMap[l.locationId] = l.maxLimit;
    }

    return (
        <div className="min-h-screen bg-night">
            <div className="container mx-auto px-4 py-6 sm:py-8 max-w-3xl">
                <EditItemForm item={item[0]} existingLimits={limitsMap} />
            </div>
        </div>
    );
}
