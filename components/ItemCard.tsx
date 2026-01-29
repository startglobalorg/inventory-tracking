import Link from 'next/link';
import type { Item } from '@/db/schema';

export function ItemCard({ item }: { item: Item }) {
    const isLowStock = item.stock <= item.minThreshold;
    const stockPercentage = (item.stock / (item.minThreshold * 2)) * 100;

    return (
        <Link
            href={`/item/${item.id}`}
            className="group relative overflow-hidden rounded-lg bg-white shadow-sm transition-all hover:shadow-md dark:bg-slate-900"
        >
            {/* Content */}
            <div className="p-4">
                {isLowStock && (
                    <div className="mb-2">
                        <span className="rounded-full bg-orange-500 px-3 py-1 text-xs font-semibold text-white">
                            Low Stock
                        </span>
                    </div>
                )}
                <h3 className="font-semibold text-slate-900 line-clamp-1 dark:text-slate-50">
                    {item.name}
                </h3>
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                    SKU: {item.sku}
                </p>

                {/* Category Badge */}
                <span className="mt-2 inline-block rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
                    {item.category}
                </span>

                {/* Stock Info */}
                <div className="mt-3">
                    <div className="flex items-center justify-between text-sm">
                        <span className="text-slate-600 dark:text-slate-400">Stock</span>
                        <span
                            className={`font-bold ${isLowStock
                                    ? 'text-orange-600 dark:text-orange-400'
                                    : 'text-green-600 dark:text-green-400'
                                }`}
                        >
                            {item.stock} units
                        </span>
                    </div>
                    {/* Progress Bar */}
                    <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
                        <div
                            className={`h-full transition-all ${isLowStock ? 'bg-orange-500' : 'bg-green-500'
                                }`}
                            style={{ width: `${Math.min(stockPercentage, 100)}%` }}
                        />
                    </div>
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                        Min threshold: {item.minThreshold}
                    </p>
                </div>
            </div>
        </Link>
    );
}
