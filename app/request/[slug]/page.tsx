import { getLocationBySlug, getAvailableItems } from '@/app/actions/volunteer-orders';
import { VolunteerRequestForm } from './VolunteerRequestForm';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function VolunteerRequestPage({
    params,
}: {
    params: Promise<{ slug: string }>;
}) {
    const { slug } = await params;

    const [locationResult, itemsResult] = await Promise.all([
        getLocationBySlug(slug),
        getAvailableItems(),
    ]);

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
                            This location does not exist. Please scan a valid QR code.
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

    const items = itemsResult.success ? itemsResult.data || [] : [];

    return (
        <main className="min-h-screen bg-slate-900">
            <VolunteerRequestForm
                location={locationResult.data}
                availableItems={items}
            />
        </main>
    );
}
