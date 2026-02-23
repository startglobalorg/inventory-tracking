import { getOrders } from '@/app/actions/volunteer-orders';
import { getRunners } from '@/app/actions/runners';
import { FulfillmentDashboard } from './FulfillmentDashboard';

export const dynamic = 'force-dynamic';

export default async function FulfillmentPage() {
    const [ordersResult, runnersResult] = await Promise.all([
        getOrders('all'),
        getRunners(),
    ]);

    const orders = ordersResult.success ? ordersResult.data || [] : [];
    const runners = runnersResult.success ? runnersResult.data ?? [] : [];

    return (
        <main className="min-h-screen bg-night">
            <FulfillmentDashboard initialOrders={orders} runners={runners} />
        </main>
    );
}
