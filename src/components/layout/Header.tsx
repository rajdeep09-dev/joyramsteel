"use client";

import { Bell, WifiOff, Cloud, Loader2, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

export function Header() {
  const [isOnline, setIsOnline] = useState(true);
  const [lastSync, setLastSync] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const pathname = usePathname();
  
  useEffect(() => {
    // 1. Live Clock
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);

    // 2. Sync Listener
    const handleSync = (e: any) => setLastSync(e.detail);
    window.addEventListener('database-synced', handleSync);

    // 3. Online/Offline
    setIsOnline(navigator.onLine);
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      clearInterval(timer);
      window.removeEventListener('database-synced', handleSync);
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  let title = "Command Center";
  if (pathname === "/pos") title = "POS Checkout";
  else if (pathname === "/inventory") title = "Master Catalog";
  else if (pathname === "/khata") title = "Digital Khata";
  else if (pathname === "/vault") title = "GST Vault";
  else if (pathname === "/history") title = "Sales Archives";

  return (
    <header className="sticky top-0 z-40 flex h-24 items-center justify-between border-b border-zinc-100 bg-white/80 px-6 md:px-10 backdrop-blur-3xl shadow-sm">
      <div className="flex items-center gap-6">
        <div className="flex flex-col">
            <span className="text-2xl md:text-3xl font-black text-zinc-900 tracking-tighter uppercase italic leading-none">
            {title}
            </span>
            <div className="mt-1 flex items-center gap-2 text-[10px] font-black text-zinc-400 uppercase tracking-widest">
                <Clock className="h-3 w-3" />
                {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </div>
        </div>
      </div>
      
      <div className="flex items-center gap-4">
        <div className="flex flex-col items-end gap-1.5 mr-2">
            {isOnline && (
            <div className="flex items-center gap-2 px-3 py-1 bg-emerald-50 text-emerald-600 rounded-lg text-[9px] font-black uppercase tracking-widest border border-emerald-100/50 shadow-sm">
                <Cloud className="h-3 w-3" /> Synced
            </div>
            )}
            {lastSync && (
                <span className="text-[8px] font-black text-zinc-400 uppercase tracking-tighter">
                    Last: {new Date(lastSync).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
            )}
        </div>

        {!isOnline && (
          <div className="flex items-center gap-2 px-4 py-1.5 bg-red-50 text-red-600 rounded-xl text-[10px] font-black uppercase tracking-widest animate-pulse border border-red-100">
            <WifiOff className="h-4 w-4" />
            <span className="hidden sm:inline">Offline</span>
          </div>
        )}
        
        <Button variant="ghost" size="icon" className="relative bg-zinc-50 hover:bg-zinc-100 backdrop-blur-xl rounded-2xl border border-zinc-100 transition-all h-12 w-12 shadow-inner hidden sm:flex">
          <Bell className="h-5 w-5 text-zinc-400" />
          <span className="absolute top-3 right-3 h-2 w-2 rounded-full bg-red-500 border-2 border-white shadow-sm" />
        </Button>

        <div className="h-12 w-12 rounded-full overflow-hidden border-2 border-white ring-4 ring-zinc-50 shadow-2xl shadow-zinc-900/40 shrink-0">
          <img src="/joyramlogo.png" alt="Logo" className="h-full w-full object-cover" />
        </div>
      </div>
    </header>
  );
}
