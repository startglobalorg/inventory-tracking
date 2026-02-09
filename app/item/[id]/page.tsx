import { db } from '@/db/db';
import { items } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { notFound } from 'next/navigation';
import { EditItemForm } from '@/components/EditItemForm';

// Force dynamic rendering since this page requires database access
export const dynamic = 'force-dynamic';

export default async function ItemPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;

    const item = await db.select().from(items).where(eq(items.id, id)).limit(1);

    if (item.length === 0) {
        notFound();
    }

    return (
        <div className="min-h-screen bg-slate-950">
            <div className="container mx-auto px-4 py-6 sm:py-8 max-w-3xl">
                <EditItemForm item={item[0]} />
            </div>
        </div>
    );
}
