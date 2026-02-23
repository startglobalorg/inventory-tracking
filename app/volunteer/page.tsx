import { cookies } from 'next/headers';
import { getRunnerById, getRunners, getUnassignedOrders, getRunnerOrders } from '@/app/actions/runners';
import { VolunteerApp } from './VolunteerApp';

export const dynamic = 'force-dynamic';

export default async function VolunteerPage() {
    const cookieStore = await cookies();
    const volunteerId = cookieStore.get('volunteerId')?.value;

    const runnersResult = await getRunners();
    const allRunners = runnersResult.data ?? [];

    if (!volunteerId) {
        return <VolunteerApp runners={allRunners} currentRunner={null} unassigned={[]} myOrders={[]} />;
    }

    // Validate volunteer still exists
    const runnerResult = await getRunnerById(volunteerId);
    if (!runnerResult.success || !runnerResult.data) {
        // Stale cookie — show login
        return <VolunteerApp runners={allRunners} currentRunner={null} unassigned={[]} myOrders={[]} />;
    }

    const [unassignedResult, myOrdersResult] = await Promise.all([
        getUnassignedOrders(),
        getRunnerOrders(volunteerId),
    ]);

    return (
        <VolunteerApp
            runners={allRunners}
            currentRunner={runnerResult.data}
            unassigned={unassignedResult.data ?? []}
            myOrders={myOrdersResult.data ?? []}
        />
    );
}
