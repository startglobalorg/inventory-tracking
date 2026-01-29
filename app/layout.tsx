import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Image from "next/image";
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
        <header className="bg-slate-900 border-b border-slate-700 shadow-lg">
          <div className="container mx-auto px-4 py-4 flex items-center justify-center">
            <Image
              src="/logo.png"
              alt="START Inventory Logo"
              width={200}
              height={60}
              priority
              className="h-auto"
            />
          </div>
        </header>
        {children}
      </body>
    </html>
  );
}
