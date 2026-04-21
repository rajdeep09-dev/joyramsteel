"use client";

import { Bell, WifiOff, Cloud, Loader2, Clock, RefreshCcw, ChevronDown, DatabaseBackup, AlertCircle, Zap, ShieldCheck, Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { useTheme } from "next-themes";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { db } from "@/lib/db";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export function Header() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [lastSync, setLastSync] = useState<string | null>(null);
  const [syncState, setSyncState] = useState<'idle' | 'syncing' | 'error'>('idle');
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isManualOpen, setIsManualOpen] = useState(false);
  const pathname = usePathname();
  
  useEffect(() => {
    setMounted(true);
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    const handleSyncTime = (e: any) => setLastSync(e.detail);
    const handleSyncStatus = (e: any) => setSyncState(e.detail);
    window.addEventListener('database-synced', handleSyncTime);
    window.addEventListener('sync-status', handleSyncStatus);
    setIsOnline(navigator.onLine);
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    const saved = localStorage.getItem('last_db_sync');
    if (saved) setLastSync(saved);
    return () => {
      clearInterval(timer);
      window.removeEventListener('database-synced', handleSyncTime);
      window.removeEventListener('sync-status', handleSyncStatus);
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  const handleClearCache = async () => {
    if (confirm("DANGER: Clear local cache?")) {
        try {
            localStorage.removeItem('last_db_sync');
            await db.delete();
            toast.success("Cache cleared. Re-syncing...");
            setTimeout(() => window.location.reload(), 1000);
        } catch { toast.error("Failed to clear cache"); }
    }
  };

  const handleManualSync = () => {
    toast.info("Triggering Cloud Sync...");
    window.dispatchEvent(new Event('request-sync'));
  };

  let title = "Command Center";
  if (pathname === "/pos") title = "POS Checkout";
  else if (pathname === "/inventory") title = "Master Catalog";
  else if (pathname === "/khata") title = "Digital Khata";
  else if (pathname === "/vault") title = "GST Vault";
  else if (pathname === "/history") title = "Sales Archives";

  const manualContent = [
    {
      title: "🚀 POS (Billing)",
      desc: "Scan barcodes or search items. Use the 'Bargain Slider' for discounts. Press Alt+P to pay. The system handles Kg and Combo items automatically.",
      color: "bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400"
    },
    {
      title: "📦 Inventory",
      desc: "Add brands as 'Master Products' first. Then add 'Variants' (sizes like 5L, 10L) underneath them. Use our Pricing Templates for 1-click setup.",
      color: "bg-zinc-50 dark:bg-zinc-900/40 text-zinc-700 dark:text-zinc-400"
    },
    {
      title: "📘 Digital Khata",
      desc: "Track Market Credit (Udhar). Record payments from customers and send them 'Gentle Reminders' on WhatsApp with one click.",
      color: "bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400"
    },
    {
      title: "🛡️ GST Vault",
      desc: "No more paper mess! Snap photos of supplier bills. All GST invoices you generate are also stored here automatically.",
      color: "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400"
    },
    {
      title: "🔄 Offline-First",
      desc: "If the internet is down, don't stop! The app saves everything locally. Watch the sync icon in the header turn green when you're back online.",
      color: "bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-400"
    }
  ];

  return (
    <header className="sticky top-0 z-40 flex h-24 items-center justify-between border-b border-zinc-100 dark:border-zinc-800 bg-white/80 dark:bg-zinc-950/80 px-4 md:px-10 backdrop-blur-3xl shadow-sm text-left transition-colors">
      <Dialog open={isManualOpen} onOpenChange={setIsManualOpen}>
        <DialogContent className="sm:max-w-[600px] rounded-[2.5rem] bg-white dark:bg-zinc-900 border-none shadow-2xl p-10 max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-3xl font-black italic tracking-tighter uppercase mb-4 flex items-center gap-3 dark:text-white">
               <ShieldCheck className="h-8 w-8 text-blue-600" /> Admin Manual
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-6">
            <p className="text-[10px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-[0.2em] leading-relaxed border-b border-zinc-100 dark:border-zinc-800 pb-6">Master the Joy Ram Steel business suite with these quick tips.</p>
            {manualContent.map((step, i) => (
              <div key={i} className={cn("p-6 rounded-3xl border border-zinc-100 dark:border-zinc-800 transition-all hover:shadow-xl", step.color)}>
                 <h4 className="font-black text-lg mb-2 uppercase italic tracking-tight">{step.title}</h4>
                 <p className="text-[11px] font-bold leading-relaxed opacity-80">{step.desc}</p>
              </div>
            ))}
            <Button onClick={()=>setIsManualOpen(false)} className="w-full h-16 rounded-2xl bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 font-black uppercase tracking-widest mt-6 shadow-2xl">Got it, Let's work</Button>
          </div>
        </DialogContent>
      </Dialog>

      <div className="flex items-center gap-4 md:gap-6">
        <div className="flex flex-col">
            <span className="text-xl md:text-3xl font-black text-zinc-900 dark:text-white tracking-tighter uppercase italic leading-none truncate max-w-[120px] md:max-w-none">{title}</span>
            <div className="mt-1 flex items-center gap-2 text-[10px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-widest">
                <Clock className="h-3 w-3 shrink-0" />
                <span className="tabular-nums">{currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
            </div>
        </div>
      </div>
      
      <div className="flex items-center gap-2 md:gap-4">
        {mounted && (
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className="rounded-2xl h-10 w-10 md:h-12 md:w-12 bg-zinc-50 dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 transition-all shadow-inner"
          >
            {theme === 'dark' ? <Sun className="h-5 w-5 text-amber-400" /> : <Moon className="h-5 w-5 text-zinc-900" />}
          </Button>
        )}

        <DropdownMenu>
            <DropdownMenuTrigger>
                <div className="flex flex-col items-end gap-1.5 mr-1 md:mr-2 cursor-pointer group">
                    {isOnline && (
                      <div className={`flex items-center gap-2 px-2 md:px-3 py-1 rounded-lg text-[8px] md:text-[9px] font-black uppercase tracking-widest border shadow-sm transition-all
                        ${syncState === 'syncing' ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border-blue-100 dark:border-blue-900/40' : 
                          syncState === 'error' ? 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border-red-100 dark:border-red-900/40' : 
                          'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 border-emerald-100/50 dark:border-emerald-900/40 group-hover:bg-emerald-100'}`}>
                        {syncState === 'syncing' ? <Loader2 className="h-3 w-3 animate-spin" /> : syncState === 'error' ? <AlertCircle className="h-3 w-3" /> : <Cloud className="h-3 w-3" />}
                        <span className="hidden sm:inline">{syncState === 'syncing' ? 'Syncing' : syncState === 'error' ? 'Error' : 'Synced'}</span>
                        <ChevronDown className="h-2 w-2 ml-1 opacity-40" />
                      </div>
                    )}
                    {lastSync && <span className="text-[7px] md:text-[8px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-tighter hidden md:block">Last: {new Date(lastSync).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>}
                </div>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="rounded-2xl p-2 shadow-2xl border-zinc-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 w-48 z-[2000]">
                <DropdownMenuItem onClick={handleManualSync} className="rounded-xl h-11 flex gap-3 font-black text-[10px] uppercase tracking-widest cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-900 dark:text-white"><DatabaseBackup className="h-4 w-4 text-blue-600" /> Force Sync</DropdownMenuItem>
                <DropdownMenuItem onClick={handleClearCache} className="rounded-xl h-11 flex gap-3 font-black text-[10px] uppercase tracking-widest text-red-500 cursor-pointer hover:bg-red-50 dark:hover:bg-red-900/20"><RefreshCcw className="h-4 w-4" /> Clear Cache</DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>

        <Button onClick={()=>setIsManualOpen(true)} variant="ghost" size="icon" className="relative bg-zinc-50 dark:bg-zinc-900 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-2xl border border-zinc-100 dark:border-zinc-800 h-10 w-10 md:h-12 md:w-12 shadow-inner shrink-0">
          <Bell className="h-5 w-5 text-zinc-900 dark:text-white" />
          <span className="absolute top-3 right-3 h-1.5 w-1.5 md:h-2 md:w-2 rounded-full bg-red-500 border-2 border-white dark:border-zinc-950" />
        </Button>

        <div className="h-10 w-10 md:h-12 md:w-12 rounded-full overflow-hidden border-2 border-white dark:border-zinc-800 ring-4 ring-zinc-50 dark:ring-zinc-900 shadow-2xl shrink-0">
          <img src="/joyramlogo.png" alt="Logo" className="h-full w-full object-cover" />
        </div>
      </div>
    </header>
  );
}
