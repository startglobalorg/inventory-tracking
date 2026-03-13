import { getLocations } from '@/app/actions/volunteer-orders';
import { validateAdminSession } from '@/app/actions/admin';
import { redirect } from 'next/navigation';
import QRCode from 'qrcode';
import Link from 'next/link';
import { PrintButton } from './PrintButton';

export const dynamic = 'force-dynamic';

async function generateQrSvg(url: string): Promise<string> {
    return QRCode.toString(url, {
        type: 'svg',
        margin: 1,
        width: 200,
        color: { dark: '#000000', light: '#ffffff' },
    });
}

export default async function QrCodesPage() {
    const isValid = await validateAdminSession();
    if (!isValid) redirect('/admin/login');

    const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
    const pangolinToken = process.env.PANGOLIN_TOKEN || null;
    const volunteerPin = process.env.VOLUNTEER_PIN || null;

    const locationsResult = await getLocations();
    const allLocations = locationsResult.success ? locationsResult.data || [] : [];

    // Build QR code data for all locations + volunteer
    const qrItems: { label: string; subtitle: string; pin: string; url: string; svg: string }[] = [];

    // Volunteer QR
    const tokenParam = pangolinToken ? `&p_token=${encodeURIComponent(pangolinToken)}` : '';

    if (volunteerPin) {
        const url = `${baseUrl}/api/auth/pin?pin=${volunteerPin}${tokenParam}`;
        const svg = await generateQrSvg(url);
        qrItems.push({ label: 'Volunteer Dashboard', subtitle: '/volunteer', pin: volunteerPin, url, svg });
    }

    // Location QRs
    for (const loc of allLocations) {
        if (!loc.accessPin) continue;
        const url = `${baseUrl}/api/auth/pin?pin=${loc.accessPin}${tokenParam}`;
        const svg = await generateQrSvg(url);
        qrItems.push({ label: loc.name, subtitle: `/request/${loc.slug}`, pin: loc.accessPin, url, svg });
    }

    return (
        <>
            {/* Print-only styles */}
            <style>{`
                @media print {
                    .no-print { display: none !important; }
                    body { background: white !important; }
                    .qr-grid { break-inside: avoid; }
                    .qr-card { break-inside: avoid; border: 1px solid #ddd !important; background: white !important; }
                    .qr-card * { color: black !important; }
                }
            `}</style>

            <div className="min-h-screen bg-night">
                {/* Header (hidden in print) */}
                <div className="no-print sticky top-0 z-10 border-b border-esbee bg-grape px-4 py-3">
                    <div className="container mx-auto flex items-center justify-between gap-3 max-w-4xl">
                        <div className="flex items-center gap-3">
                            <Link
                                href="/admin"
                                className="text-sm text-slate-400 hover:text-white transition-colors"
                            >
                                ← Admin
                            </Link>
                            <h1 className="text-lg font-bold text-white">QR Codes</h1>
                        </div>
                        <PrintButton />
                    </div>
                </div>

                {qrItems.length === 0 ? (
                    <div className="container mx-auto p-8 max-w-4xl text-center">
                        <p className="text-slate-400">No PINs generated yet. Go to Admin → PINs tab and click &quot;Generate PINs&quot;.</p>
                    </div>
                ) : (
                    <div className="container mx-auto p-4 sm:p-8 max-w-4xl">
                        <div className="qr-grid grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                            {qrItems.map((item) => (
                                <div
                                    key={item.pin}
                                    className="qr-card rounded-xl border border-esbee bg-grape p-5 flex flex-col items-center text-center"
                                >
                                    <div
                                        className="mb-3 rounded-lg bg-white p-2"
                                        dangerouslySetInnerHTML={{ __html: item.svg }}
                                    />
                                    <h3 className="text-base font-bold text-white">{item.label}</h3>
                                    <p className="text-xs text-slate-400 mt-0.5">{item.subtitle}</p>
                                    <p className="mt-2 text-sm font-mono font-bold text-jayouh tracking-widest">
                                        PIN: {item.pin}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </>
    );
}
