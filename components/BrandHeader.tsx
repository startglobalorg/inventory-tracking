

interface BrandHeaderProps {
    title: string;
    subtitle?: string;
}

export function BrandHeader({ title, subtitle }: BrandHeaderProps) {
    return (
        <div
            style={{
                background: 'linear-gradient(135deg, hsl(278.2, 50%, 8.6%) 0%, hsl(281, 52%, 19%) 100%)',
            }}
            className="w-full px-5 py-3 flex items-center justify-between"
        >
            <div>
                <h1 className="text-lg font-bold text-white leading-tight">{title}</h1>
                {subtitle && (
                    <p className="text-sm text-purple-300 mt-0.5">{subtitle}</p>
                )}
            </div>
            <div className="shrink-0 ml-4">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                    src="/images/start_global_logo_white.svg"
                    alt="START Global"
                    className="h-8 w-auto object-contain"
                />
            </div>
        </div>
    );
}
