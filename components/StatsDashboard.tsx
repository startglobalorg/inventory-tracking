export function StatsDashboard({ stats }: {
    stats: {
        totalConsumed: number;
        totalRestocked: number;
        topItems: Array<{ itemName: string | null; itemCategory: string | null; totalConsumed: number }>;
        categoryStats: Array<{ category: string | null; totalConsumed: number }>;
    }
}) {
    return (
        <div className="space-y-6">
            {/* Overview Cards */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <div className="rounded-xl bg-slate-900 border border-slate-700 p-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-slate-400">Total Consumed</p>
                            <p className="mt-2 text-3xl font-black text-red-400">{stats.totalConsumed}</p>
                        </div>
                        <div className="rounded-full bg-red-900/30 p-3">
                            <svg className="h-6 w-6 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                            </svg>
                        </div>
                    </div>
                    <p className="mt-2 text-xs text-slate-500">Items taken from inventory</p>
                </div>

                <div className="rounded-xl bg-slate-900 border border-slate-700 p-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-slate-400">Total Restocked</p>
                            <p className="mt-2 text-3xl font-black text-green-400">{stats.totalRestocked}</p>
                        </div>
                        <div className="rounded-full bg-green-900/30 p-3">
                            <svg className="h-6 w-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
                            </svg>
                        </div>
                    </div>
                    <p className="mt-2 text-xs text-slate-500">Items added to inventory</p>
                </div>

                <div className="rounded-xl bg-slate-900 border border-slate-700 p-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-slate-400">Net Change</p>
                            <p className={`mt-2 text-3xl font-black ${stats.totalRestocked - stats.totalConsumed >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                {stats.totalRestocked - stats.totalConsumed > 0 ? '+' : ''}{stats.totalRestocked - stats.totalConsumed}
                            </p>
                        </div>
                        <div className="rounded-full bg-blue-900/30 p-3">
                            <svg className="h-6 w-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                            </svg>
                        </div>
                    </div>
                    <p className="mt-2 text-xs text-slate-500">Overall inventory change</p>
                </div>
            </div>

            {/* Top Items and Category Breakdown */}
            <div className="grid gap-6 lg:grid-cols-2">
                {/* Top Consumed Items */}
                <div className="rounded-xl bg-slate-900 border border-slate-700 p-6">
                    <h3 className="text-lg font-bold text-white mb-4">Top Consumed Items</h3>
                    <div className="space-y-3">
                        {stats.topItems.length === 0 ? (
                            <p className="text-sm text-slate-500">No consumption data yet</p>
                        ) : (
                            stats.topItems.map((item, index) => (
                                <div key={index} className="flex items-center justify-between">
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-white truncate">{item.itemName || 'Unknown Item'}</p>
                                        <p className="text-xs text-slate-500">{item.itemCategory || 'Uncategorized'}</p>
                                    </div>
                                    <div className="ml-4 flex items-center gap-2">
                                        <div className="text-right">
                                            <p className="text-lg font-bold text-red-400">{item.totalConsumed}</p>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* Category Breakdown */}
                <div className="rounded-xl bg-slate-900 border border-slate-700 p-6">
                    <h3 className="text-lg font-bold text-white mb-4">Consumption by Category</h3>
                    <div className="space-y-3">
                        {stats.categoryStats.length === 0 ? (
                            <p className="text-sm text-slate-500">No category data yet</p>
                        ) : (
                            stats.categoryStats.map((cat, index) => (
                                <div key={index} className="flex items-center justify-between">
                                    <p className="text-sm font-medium text-white">{cat.category || 'Uncategorized'}</p>
                                    <div className="flex items-center gap-3">
                                        <div className="h-2 w-24 bg-slate-700 rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-blue-500"
                                                style={{
                                                    width: `${(cat.totalConsumed / stats.totalConsumed) * 100}%`
                                                }}
                                            />
                                        </div>
                                        <p className="text-sm font-bold text-blue-400 w-12 text-right">{cat.totalConsumed}</p>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
