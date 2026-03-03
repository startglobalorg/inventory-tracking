import { getRunners, getRunnerOrderCounts } from '@/app/actions/runners';
import { AdminDashboard } from './AdminDashboard';

export const dynamic = 'force-dynamic';

export default async function AdminPage() {
    const [runnersResult, orderCounts] = await Promise.all([
        getRunners(),
        getRunnerOrderCounts(),
    ]);
    const runners = runnersResult.success ? runnersResult.data || [] : [];

    return <AdminDashboard initialRunners={runners} orderCounts={orderCounts} />;
}
