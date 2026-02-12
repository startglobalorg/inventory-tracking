import { getOrderHistory, getOrderStatistics } from '../actions/history';
import { OrderHistoryClient } from '@/components/OrderHistoryClient';
import { StatsDashboard } from '@/components/StatsDashboard';
import Link from 'next/link';

// Force dynamic rendering since this page requires database access
export const dynamic = 'force-dynamic';

export default async function OrderHistoryPage() {
    const [historyResult, statsResult] = await Promise.all([
        getOrderHistory(),
        getOrderStatistics(),
    ]);

    if (!historyResult.success || !historyResult.data) {
        return (
            <div className="min-h-screen bg-slate-950 p-8">
                <div className="container mx-auto">
                    <div className="rounded-lg bg-red-900/20 border border-red-500 p-4 text-red-200">
                        Error loading order history: {historyResult.error || 'No data available'}
                    </div>
                </div>
            </div>
        );
    }

    if (!statsResult.success || !statsResult.data) {
        return (
            <div className="min-h-screen bg-slate-950 p-8">
                <div className="container mx-auto">
                    <div className="rounded-lg bg-red-900/20 border border-red-500 p-4 text-red-200">
                        Error loading statistics: {statsResult.error || 'No data available'}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-950">
            <div className="container mx-auto px-4 py-6 sm:py-8">
                {/* Header */}
                <div className="mb-6">
                    <Link
                        href="/"
                        className="inline-flex items-center text-sm text-slate-400 hover:text-white transition-colors mb-4"
                    >
                        <svg className="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                        Back to Inventory
                    </Link>
                    <h1 className="text-2xl sm:text-3xl font-black text-white">Order History</h1>
                    <p className="mt-2 text-slate-400">View and manage past orders</p>
                </div>

                {/* Statistics Dashboard */}
                <StatsDashboard stats={statsResult.data} />

                {/* Order History Table */}
                <div className="mt-8">
                    <OrderHistoryClient logs={historyResult.data} />
                </div>
            </div>
        </div>
    );
}
