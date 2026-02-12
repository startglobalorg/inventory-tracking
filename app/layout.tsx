import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ToastProvider } from "@/components/ToastProvider";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "START Inventory",
  description: "Inventory tracking system for coffee point",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ToastProvider>
          <header className="bg-slate-900 border-b border-slate-700 shadow-lg">
            <div className="container mx-auto px-4 py-4 flex items-center justify-center">
              <h1 className="text-2xl font-bold text-white">
                START Inventory Management
              </h1>
            </div>
          </header>
          {children}
        </ToastProvider>
      </body>
    </html>
  );
}
