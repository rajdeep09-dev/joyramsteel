import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Header } from "@/components/layout/Header";
import { BottomNav } from "@/components/layout/BottomNav";
import { Toaster } from "@/components/ui/sonner";
import { AIChatBot } from "@/components/AIChatBot";
import { GlobalLoader } from "@/components/GlobalLoader";
import { SyncEngine } from "@/components/SyncEngine";
import { TerminalMonitor } from "@/components/TerminalMonitor";
import { ThemeProvider } from "next-themes";

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
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "JRS POS",
  },
  icons: {
    icon: "/joyramlogo.png",
    apple: "/joyramlogo.png",
  },
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
    <html lang="en" suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased bg-[#f4f4f5] dark:bg-zinc-950 min-h-[100dvh] overscroll-none text-zinc-900 dark:text-zinc-100 transition-colors duration-300`}>
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
          <GlobalLoader />
          <SyncEngine />
          <TerminalMonitor />
          <div className="flex flex-col h-[100dvh] overflow-hidden bg-gradient-to-br from-[#fafafa] to-[#f4f4f5] dark:from-zinc-900 dark:to-zinc-950 selection:bg-zinc-200">
            <Header />
            <main className="flex-1 overflow-y-auto overflow-x-hidden p-4 md:p-6 pb-28 md:pb-28 scroll-smooth relative">
              <div className="fixed top-0 left-0 w-full h-full bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(120,119,198,0.1),rgba(255,255,255,0))] pointer-events-none -z-10" />
              {children}
            </main>
            <BottomNav />
          </div>
          <Toaster />
          <script
            dangerouslySetInnerHTML={{
              __html: `
                if ('serviceWorker' in navigator) {
                  window.addEventListener('load', function() {
                    navigator.serviceWorker.register('/sw.js');
                  });
                }
              `,
            }}
          />
        </ThemeProvider>
      </body>
    </html>
  );
}
