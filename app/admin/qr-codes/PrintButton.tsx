'use client';

export function PrintButton() {
    return (
        <button
            onClick={() => window.print()}
            className="rounded-lg bg-cerise px-4 py-2 text-sm font-bold text-white hover:bg-jayouh active:scale-95 transition-all"
        >
            Print / Save PDF
        </button>
    );
}
