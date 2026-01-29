export default function ScanPage() {
    return (
        <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
            <div className="text-center">
                <div className="mb-6 text-6xl">📷</div>
                <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-50">
                    QR Scanner
                </h1>
                <p className="mt-2 text-slate-600 dark:text-slate-400">
                    QR code scanning functionality will be implemented in Phase 2
                </p>
                <a
                    href="/"
                    className="mt-6 inline-block rounded-lg bg-blue-600 px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-blue-700"
                >
                    Back to Inventory
                </a>
            </div>
        </div>
    );
}
