import { getLocationBySlug, getOrdersByLocation } from '@/app/actions/volunteer-orders';
import { LocationOrderHistory } from './LocationOrderHistory';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function LocationHistoryPage({
    params,
}: {
    params: Promise<{ slug: string }>;
}) {
    const { slug } = await params;

    const locationResult = await getLocationBySlug(slug);

    if (!locationResult.success || !locationResult.data) {
        return (
            <main className="min-h-screen bg-slate-900 p-4">
                <div className="mx-auto max-w-lg">
                    <div className="rounded-xl bg-slate-800 border border-slate-700 p-8 text-center">
                        <div className="mb-4 text-6xl">
                            &#x26A0;
                        </div>
                        <h1 className="text-2xl font-bold text-white mb-2">
                            Location Not Found
                        </h1>
                        <p className="text-slate-400 mb-6">
                            This location does not exist.
                        </p>
                        <Link
                            href="/"
                            className="inline-block rounded-lg bg-blue-600 px-6 py-3 font-bold text-white hover:bg-blue-700"
                        >
                            Go Home
                        </Link>
                    </div>
                </div>
            </main>
        );
    }

    const ordersResult = await getOrdersByLocation(locationResult.data.id);
    const orders = ordersResult.success ? ordersResult.data || [] : [];

    return (
        <main className="min-h-screen bg-slate-900">
            <LocationOrderHistory
                location={locationResult.data}
                initialOrders={orders}
            />
        </main>
    );
}
