// MODIFIED: Added PremiumButtonProvider for global button micro-interactions
import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ToastProvider } from "@/components/ToastProvider";
import PremiumButtonProvider from "@/components/PremiumButtonProvider";
import { PangolinAuthProvider } from "@/components/PangolinAuthProvider";
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

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5, // allow user zoom up to 5× (accessibility — do NOT use 1)
  viewportFit: 'cover', // enables env(safe-area-inset-*) for iPhone notch/home bar
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
        <PremiumButtonProvider />
        <PangolinAuthProvider />
        <ToastProvider>
          {children}
        </ToastProvider>
      </body>
    </html>
  );
}
