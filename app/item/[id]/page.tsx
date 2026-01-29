import Link from 'next/link';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import { db } from '@/db/db';
import { items, logs } from '@/db/schema';
import { eq, desc } from 'drizzle-orm';

export default async function ItemDetailPage({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    const { id } = await params;

    // Fetch item details
    const item = await db.select().from(items).where(eq(items.id, id)).limit(1);

    if (item.length === 0) {
        notFound();
    }

    const currentItem = item[0];
    const isLowStock = currentItem.stock <= currentItem.minThreshold;

    // Fetch recent logs for this item
    const recentLogs = await db
        .select()
        .from(logs)
        .where(eq(logs.itemId, id))
        .orderBy(desc(logs.createdAt))
        .limit(10);

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
            {/* Header */}
            <header className="border-b border-slate-200 bg-white/80 backdrop-blur-sm dark:border-slate-800 dark:bg-slate-950/80">
                <div className="container mx-auto px-4 py-6">
                    <Link
                        href="/"
                        className="inline-flex items-center text-sm text-slate-600 transition-colors hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-50"
                    >
                        <svg
                            className="mr-2 h-4 w-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M15 19l-7-7 7-7"
                            />
                        </svg>
                        Back to Inventory
                    </Link>
                </div>
            </header>

            {/* Main Content */}
            <main className="container mx-auto px-4 py-8">
                <div className="grid gap-8 lg:grid-cols-3">
                    {/* Item Details */}
                    <div className="lg:col-span-2">
                        <div className="overflow-hidden rounded-lg bg-white shadow-sm dark:bg-slate-900">
                            {/* Image Section */}
                            <div className="relative h-64 w-full bg-slate-100 dark:bg-slate-800 sm:h-80">
                                {currentItem.imageUrl ? (
                                    <Image
                                        src={currentItem.imageUrl}
                                        alt={currentItem.name}
                                        fill
                                        className="object-cover"
                                    />
                                ) : (
                                    <div className="flex h-full items-center justify-center text-8xl">
                                        📦
                                    </div>
                                )}
                            </div>

                            {/* Details Section */}
                            <div className="p-6">
                                <div className="flex items-start justify-between">
                                    <div>
                                        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-50 sm:text-3xl">
                                            {currentItem.name}
                                        </h1>
                                        <p className="mt-2 text-slate-600 dark:text-slate-400">
                                            SKU: <span className="font-mono">{currentItem.sku}</span>
                                        </p>
                                    </div>
                                    {isLowStock && (
                                        <span className="rounded-full bg-orange-500 px-4 py-1.5 text-sm font-semibold text-white">
                                            Low Stock
                                        </span>
                                    )}
                                </div>

                                <div className="mt-6 grid gap-4 sm:grid-cols-2">
                                    <div className="rounded-lg bg-slate-50 p-4 dark:bg-slate-800">
                                        <p className="text-sm text-slate-600 dark:text-slate-400">
                                            Category
                                        </p>
                                        <p className="mt-1 text-lg font-semibold text-slate-900 dark:text-slate-50">
                                            {currentItem.category}
                                        </p>
                                    </div>
                                    <div className="rounded-lg bg-slate-50 p-4 dark:bg-slate-800">
                                        <p className="text-sm text-slate-600 dark:text-slate-400">
                                            Current Stock
                                        </p>
                                        <p
                                            className={`mt-1 text-lg font-semibold ${isLowStock
                                                    ? 'text-orange-600 dark:text-orange-400'
                                                    : 'text-green-600 dark:text-green-400'
                                                }`}
                                        >
                                            {currentItem.stock} units
                                        </p>
                                    </div>
                                    <div className="rounded-lg bg-slate-50 p-4 dark:bg-slate-800">
                                        <p className="text-sm text-slate-600 dark:text-slate-400">
                                            Minimum Threshold
                                        </p>
                                        <p className="mt-1 text-lg font-semibold text-slate-900 dark:text-slate-50">
                                            {currentItem.minThreshold} units
                                        </p>
                                    </div>
                                    <div className="rounded-lg bg-slate-50 p-4 dark:bg-slate-800">
                                        <p className="text-sm text-slate-600 dark:text-slate-400">
                                            Added On
                                        </p>
                                        <p className="mt-1 text-lg font-semibold text-slate-900 dark:text-slate-50">
                                            {new Date(currentItem.createdAt).toLocaleDateString()}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Activity Log */}
                    <div className="lg:col-span-1">
                        <div className="rounded-lg bg-white p-6 shadow-sm dark:bg-slate-900">
                            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-50">
                                Recent Activity
                            </h2>

                            {recentLogs.length === 0 ? (
                                <p className="mt-4 text-sm text-slate-600 dark:text-slate-400">
                                    No activity recorded yet.
                                </p>
                            ) : (
                                <div className="mt-4 space-y-3">
                                    {recentLogs.map((log) => (
                                        <div
                                            key={log.id}
                                            className="flex items-start gap-3 rounded-lg border border-slate-200 p-3 dark:border-slate-700"
                                        >
                                            <div
                                                className={`mt-0.5 rounded-full p-1.5 ${log.reason === 'consumed'
                                                        ? 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400'
                                                        : log.reason === 'restocked'
                                                            ? 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400'
                                                            : 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400'
                                                    }`}
                                            >
                                                {log.reason === 'consumed' ? '📉' : log.reason === 'restocked' ? '📈' : '⚙️'}
                                            </div>
                                            <div className="flex-1">
                                                <p className="text-sm font-medium text-slate-900 dark:text-slate-50">
                                                    {log.reason.charAt(0).toUpperCase() + log.reason.slice(1)}
                                                </p>
                                                <p
                                                    className={`text-sm ${log.changeAmount > 0
                                                            ? 'text-green-600 dark:text-green-400'
                                                            : 'text-red-600 dark:text-red-400'
                                                        }`}
                                                >
                                                    {log.changeAmount > 0 ? '+' : ''}
                                                    {log.changeAmount} units
                                                </p>
                                                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                                                    {new Date(log.createdAt).toLocaleString()}
                                                </p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
