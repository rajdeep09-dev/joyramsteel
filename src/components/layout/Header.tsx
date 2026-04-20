"use client";

import { Bell, WifiOff, Cloud, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

export function Header() {
  const [isOnline, setIsOnline] = useState(true);
  const [syncStatus, setSyncStatus] = useState<"synced" | "syncing">("synced");
  const pathname = usePathname();
  
  let title = "Command Center";
  if (pathname === "/pos") title = "POS Checkout";
  else if (pathname === "/inventory") title = "Master Catalog";
  else if (pathname === "/khata") title = "Digital Khata";
  else if (pathname === "/vault") title = "GST Vault";

  useEffect(() => {
    setIsOnline(navigator.onLine);
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  return (
    <header className="sticky top-0 z-40 flex h-20 items-center justify-between border-b border-zinc-100 bg-white/70 px-6 md:px-10 backdrop-blur-3xl shadow-sm">
      <div className="flex items-center">
        <span className="text-3xl font-black text-zinc-900 tracking-tighter drop-shadow-sm uppercase italic">
          {title}
        </span>
      </div>
      
      <div className="flex items-center gap-4">
        {isOnline && (
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-zinc-50/50 text-zinc-600 rounded-xl text-[10px] font-black uppercase tracking-widest border border-zinc-100">
            {syncStatus === 'syncing' ? (
              <><Loader2 className="h-3 w-3 animate-spin" /> Syncing</>
            ) : (
              <><Cloud className="h-3 w-3" /> Synced</>
            )}
          </div>
        )}
        {!isOnline && (
          <div className="flex items-center gap-2 px-4 py-1.5 bg-red-50 text-red-600 rounded-xl text-[10px] font-black uppercase tracking-widest animate-pulse border border-red-100">
            <WifiOff className="h-4 w-4" />
            <span className="hidden sm:inline">Offline</span>
          </div>
        )}
        <Button variant="ghost" size="icon" className="relative bg-zinc-50 hover:bg-zinc-100 backdrop-blur-xl rounded-2xl border border-zinc-100 transition-all h-12 w-12 shadow-inner">
          <Bell className="h-5 w-5 text-zinc-400" />
          <span className="absolute top-3 right-3 h-2 w-2 rounded-full bg-red-500 border-2 border-white shadow-sm" />
        </Button>
        <div className="h-12 w-12 rounded-full overflow-hidden border-2 border-white ring-4 ring-zinc-50 shadow-2xl shadow-zinc-900/40">
          <img src="/joyramlogo.png" alt="Logo" className="h-full w-full object-cover" />
        </div>
      </div>
    </header>
  );
}
