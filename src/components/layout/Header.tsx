"use client";

import { Bell, WifiOff, Cloud, Loader2, Clock, RefreshCcw, ChevronDown, DatabaseBackup, AlertCircle, Zap, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
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
  const [isOnline, setIsOnline] = useState(true);
  const [lastSync, setLastSync] = useState<string | null>(null);
  const [syncState, setSyncState] = useState<'idle' | 'syncing' | 'error'>('idle');
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isManualOpen, setIsManualOpen] = useState(false);
  const pathname = usePathname();
  
  useEffect(() => {
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
      color: "bg-blue-50 text-blue-700"
    },
    {
      title: "📦 Inventory",
      desc: "Add brands as 'Master Products' first. Then add 'Variants' (sizes like 5L, 10L) underneath them. Use our Pricing Templates for 1-click setup.",
      color: "bg-zinc-50 text-zinc-700"
    },
    {
      title: "📘 Digital Khata",
      desc: "Track Market Credit (Udhar). Record payments from customers and send them 'Gentle Reminders' on WhatsApp with one click.",
      color: "bg-amber-50 text-amber-700"
    },
    {
      title: "🛡️ GST Vault",
      desc: "No more paper mess! Snap photos of supplier bills. All GST invoices you generate are also stored here automatically.",
      color: "bg-emerald-50 text-emerald-700"
    },
    {
      title: "🔄 Offline-First",
      desc: "If the internet is down, don't stop! The app saves everything locally. Watch the sync icon in the header turn green when you're back online.",
      color: "bg-purple-50 text-purple-700"
    }
  ];

  return (
    <header className="sticky top-0 z-40 flex h-24 items-center justify-between border-b border-zinc-100 bg-white/80 px-6 md:px-10 backdrop-blur-3xl shadow-sm text-left">
      <Dialog open={isManualOpen} onOpenChange={setIsManualOpen}>
        <DialogContent className="sm:max-w-[600px] rounded-[2.5rem] bg-white border-none shadow-2xl p-10 max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-3xl font-black italic tracking-tighter uppercase mb-4 flex items-center gap-3">
               <ShieldCheck className="h-8 w-8 text-blue-600" /> Admin Manual
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-6">
            <p className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em] leading-relaxed border-b border-zinc-100 pb-6">Master the Joy Ram Steel business suite with these quick tips.</p>
            {manualContent.map((step, i) => (
              <div key={i} className={cn("p-6 rounded-3xl border border-zinc-100 transition-all hover:shadow-xl", step.color)}>
                 <h4 className="font-black text-lg mb-2 uppercase italic tracking-tight">{step.title}</h4>
                 <p className="text-[11px] font-bold leading-relaxed opacity-80">{step.desc}</p>
              </div>
            ))}
            <Button onClick={()=>setIsManualOpen(false)} className="w-full h-16 rounded-2xl bg-zinc-900 text-white font-black uppercase tracking-widest mt-6">Got it, Let's work</Button>
          </div>
        </DialogContent>
      </Dialog>

      <div className="flex items-center gap-6">
        <div className="flex flex-col">
            <span className="text-2xl md:text-3xl font-black text-zinc-900 tracking-tighter uppercase italic leading-none">{title}</span>
            <div className="mt-1 flex items-center gap-2 text-[10px] font-black text-zinc-400 uppercase tracking-widest">
                <Clock className="h-3 w-3" />
                {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </div>
        </div>
      </div>
      
      <div className="flex items-center gap-4">
        <DropdownMenu>
            <DropdownMenuTrigger>
                <div className="flex flex-col items-end gap-1.5 mr-2 cursor-pointer group">
                    {isOnline && (
                      <div className={`flex items-center gap-2 px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border shadow-sm transition-all
                        ${syncState === 'syncing' ? 'bg-blue-50 text-blue-600 border-blue-100' : 
                          syncState === 'error' ? 'bg-red-50 text-red-600 border-red-100' : 
                          'bg-emerald-50 text-emerald-600 border-emerald-100/50 group-hover:bg-emerald-100'}`}>
                        {syncState === 'syncing' ? <Loader2 className="h-3 w-3 animate-spin" /> : syncState === 'error' ? <AlertCircle className="h-3 w-3" /> : <Cloud className="h-3 w-3" />}
                        {syncState === 'syncing' ? 'Syncing' : syncState === 'error' ? 'Error' : 'Synced'}
                        <ChevronDown className="h-2 w-2 ml-1 opacity-40" />
                      </div>
                    )}
                    {lastSync && <span className="text-[8px] font-black text-zinc-400 uppercase tracking-tighter">Last: {new Date(lastSync).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>}
                </div>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="rounded-2xl p-2 shadow-2xl border-zinc-100 bg-white w-48 z-[2000]">
                <DropdownMenuItem onClick={handleManualSync} className="rounded-xl h-11 flex gap-3 font-black text-[10px] uppercase tracking-widest"><DatabaseBackup className="h-4 w-4 text-blue-600" /> Force Sync</DropdownMenuItem>
                <DropdownMenuItem onClick={handleClearCache} className="rounded-xl h-11 flex gap-3 font-black text-[10px] uppercase tracking-widest text-red-500"><RefreshCcw className="h-4 w-4" /> Clear Cache</DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>

        {!isOnline && (
          <div className="flex items-center gap-2 px-4 py-1.5 bg-red-50 text-red-600 rounded-xl text-[10px] font-black uppercase tracking-widest animate-pulse border border-red-100">
            <WifiOff className="h-4 w-4" /> <span className="hidden sm:inline">Offline</span>
          </div>
        )}
        
        <Button onClick={()=>setIsManualOpen(true)} variant="ghost" size="icon" className="relative bg-zinc-50 hover:bg-zinc-100 rounded-2xl border border-zinc-100 h-12 w-12 shadow-inner">
          <Bell className="h-5 w-5 text-zinc-900 animate-swing" />
          <span className="absolute top-3 right-3 h-2 w-2 rounded-full bg-red-500 border-2 border-white" />
        </Button>

        <div className="h-12 w-12 rounded-full overflow-hidden border-2 border-white ring-4 ring-zinc-50 shadow-2xl shrink-0">
          <img src="/joyramlogo.png" alt="Logo" className="h-full w-full object-cover" />
        </div>
      </div>
    </header>
  );
}
