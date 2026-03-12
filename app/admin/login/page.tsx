import { LoginForm } from './LoginForm';

export const dynamic = 'force-dynamic';

export default function AdminLoginPage() {
    return (
        <div className="min-h-screen bg-night flex items-center justify-center p-4">
            <div className="w-full max-w-sm">
                <div className="text-center mb-8">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                        src="/images/start_global_logo_white.svg"
                        alt="START Global"
                        className="h-10 w-auto mx-auto mb-4"
                    />
                    <h1 className="text-2xl font-bold text-white">Admin Login</h1>
                    <p className="text-sm text-slate-400 mt-1">Enter the admin password to continue</p>
                </div>
                <LoginForm />
            </div>
        </div>
    );
}
