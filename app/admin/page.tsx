import { getRunners } from '@/app/actions/runners';
import { AdminDashboard } from './AdminDashboard';

export const dynamic = 'force-dynamic';

export default async function AdminPage() {
    const runnersResult = await getRunners();
    const runners = runnersResult.success ? runnersResult.data || [] : [];

    return <AdminDashboard initialRunners={runners} />;
}
