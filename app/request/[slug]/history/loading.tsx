export default function HistoryLoading() {
    return (
        <main className="min-h-screen bg-slate-900 flex items-center justify-center">
            <div className="text-center">
                <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                <p className="text-slate-400 text-sm">Loading history...</p>
            </div>
        </main>
    );
}
