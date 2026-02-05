import { db } from '@/db/db';
import { items } from '@/db/schema';
import { InventoryList } from '@/components/InventoryList';
import { CartProvider } from '@/components/CartProvider';
import { CartSummary } from '@/components/CartSummary';

export default async function Home() {
  // Fetch all items server-side
  const allItems = await db.select().from(items).orderBy(items.name);

  return (
    <CartProvider>
      <InventoryList initialItems={allItems} />
      <CartSummary allItems={allItems} />
    </CartProvider>
  );
}
