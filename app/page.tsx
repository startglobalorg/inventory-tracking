import { Suspense } from 'react';
import { db } from '@/db/db';
import { items } from '@/db/schema';
import { InventoryList } from '@/components/InventoryList';
import { CartProvider } from '@/components/CartProvider';
import { CartSummary } from '@/components/CartSummary';
import { CartInitializer } from '@/components/CartInitializer';

// Force dynamic rendering since this page requires database access
export const dynamic = 'force-dynamic';

export default async function Home() {
  // Fetch all items server-side
  const allItems = await db.select().from(items).orderBy(items.name);

  return (
    <CartProvider>
      <Suspense fallback={null}>
        <CartInitializer />
      </Suspense>
      <InventoryList initialItems={allItems} />
      <CartSummary allItems={allItems} />
    </CartProvider>
  );
}
