import { getRunners, getRunnerOrderCounts } from '@/app/actions/runners';
import { getLocations, getLocationOrderCounts } from '@/app/actions/volunteer-orders';
import { validateAdminSession } from '@/app/actions/admin';
import { redirect } from 'next/navigation';
import { AdminDashboard } from './AdminDashboard';

export const dynamic = 'force-dynamic';

export default async function AdminPage() {
    const isValid = await validateAdminSession();
    if (!isValid) {
        redirect('/admin/login');
    }

    const [runnersResult, orderCounts, locationsResult, locationOrderCounts] = await Promise.all([
        getRunners(),
        getRunnerOrderCounts(),
        getLocations(),
        getLocationOrderCounts(),
    ]);

    const runners = runnersResult.success ? runnersResult.data || [] : [];
    const locationsList = locationsResult.success ? locationsResult.data || [] : [];

    return (
        <AdminDashboard
            initialRunners={runners}
            orderCounts={orderCounts}
            initialLocations={locationsList}
            locationOrderCounts={locationOrderCounts}
        />
    );
}
