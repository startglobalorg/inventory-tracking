import { getOrders } from '@/app/actions/volunteer-orders';
import { FulfillmentDashboard } from './FulfillmentDashboard';

export const dynamic = 'force-dynamic';

export default async function FulfillmentPage() {
    const ordersResult = await getOrders('all');

    const orders = ordersResult.success ? ordersResult.data || [] : [];

    return (
        <main className="min-h-screen bg-slate-900">
            <FulfillmentDashboard initialOrders={orders} />
        </main>
    );
}
