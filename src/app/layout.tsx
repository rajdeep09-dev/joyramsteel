import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Header } from "@/components/layout/Header";
import { BottomNav } from "@/components/layout/BottomNav";
import { Toaster } from "@/components/ui/sonner";
import { AIChatBot } from "@/components/AIChatBot";
import { GlobalLoader } from "@/components/GlobalLoader";
import { SyncEngine } from "@/components/SyncEngine";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Joy Ram Steel POS",
  description: "Mobile-first POS and Inventory management system for Joy Ram Steel.",
};

export const viewport: Viewport = {
  themeColor: "#f8fafc",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased bg-[#f4f4f5] min-h-[100dvh] overscroll-none text-zinc-900`}>
        <GlobalLoader />
        <SyncEngine />
        <div className="flex flex-col h-[100dvh] overflow-hidden bg-gradient-to-br from-[#fafafa] to-[#f4f4f5] selection:bg-zinc-200">
          <Header />
          <main className="flex-1 overflow-y-auto overflow-x-hidden p-4 md:p-6 pb-28 md:pb-28 scroll-smooth relative">
            {/* Background glowing effects for premium minimal feel */}
            <div className="fixed top-0 left-0 w-full h-full bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(120,119,198,0.15),rgba(255,255,255,0))] pointer-events-none -z-10" />
            <div className="fixed -top-24 -right-24 w-96 h-96 bg-zinc-400/5 rounded-full blur-3xl pointer-events-none -z-10" />
            <div className="fixed top-48 -left-24 w-72 h-72 bg-zinc-300/10 rounded-full blur-3xl pointer-events-none -z-10" />
            
            {children}
          </main>
          <BottomNav />
        </div>
        <Toaster />
      </body>
    </html>
  );
}
