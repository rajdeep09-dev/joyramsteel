"use client";

import { Bell, WifiOff, Cloud, Loader2, Clock, RefreshCcw, ChevronDown, DatabaseBackup, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { db } from "@/lib/db";
import { toast } from "sonner";

export function Header() {
  const [isOnline, setIsOnline] = useState(true);
  const [lastSync, setLastSync] = useState<string | null>(null);
  const [syncState, setSyncState] = useState<'idle' | 'syncing' | 'error'>('idle');
  const [currentTime, setCurrentTime] = useState(new Date());
  const pathname = usePathname();
  
  useEffect(() => {
    // 1. Live Clock
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);

    // 2. Sync Listeners
    const handleSyncTime = (e: any) => setLastSync(e.detail);
    const handleSyncStatus = (e: any) => setSyncState(e.detail);
    
    window.addEventListener('database-synced', handleSyncTime);
    window.addEventListener('sync-status', handleSyncStatus);

    // 3. Online/Offline
    setIsOnline(navigator.onLine);
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // 4. Initial Sync Load
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
    if (confirm("DANGER: Clear local cache? This will wipe all unsynced data and force a fresh download from the cloud.")) {
        try {
            localStorage.removeItem('last_db_sync');
            await db.delete();
            toast.success("Cache cleared. Re-syncing...");
            setTimeout(() => window.location.reload(), 1000);
        } catch {
            toast.error("Failed to clear cache");
        }
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

  return (
    <header className="sticky top-0 z-40 flex h-24 items-center justify-between border-b border-zinc-100 bg-white/80 px-6 md:px-10 backdrop-blur-3xl shadow-sm text-left">
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
        <DropdownMenu>
            <DropdownMenuTrigger>
                <div className="flex flex-col items-end gap-1.5 mr-2 cursor-pointer group">
                    {isOnline && (
                      <div className={`flex items-center gap-2 px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border shadow-sm transition-all
                        ${syncState === 'syncing' ? 'bg-blue-50 text-blue-600 border-blue-100' : 
                          syncState === 'error' ? 'bg-red-50 text-red-600 border-red-100' : 
                          'bg-emerald-50 text-emerald-600 border-emerald-100/50 group-hover:bg-emerald-100'}`}>
                        
                        {syncState === 'syncing' ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : syncState === 'error' ? (
                          <AlertCircle className="h-3 w-3" />
                        ) : (
                          <Cloud className="h-3 w-3" />
                        )}
                        
                        {syncState === 'syncing' ? 'Syncing' : syncState === 'error' ? 'Error' : 'Synced'}
                        <ChevronDown className="h-2 w-2 ml-1 opacity-40 group-hover:opacity-100" />
                      </div>
                    )}
                    
                    {lastSync ? (
                        <span className="text-[8px] font-black text-zinc-400 uppercase tracking-tighter">
                            Last: {new Date(lastSync).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                    ) : (
                        <span className="text-[8px] font-black text-zinc-300 uppercase tracking-tighter">Never Synced</span>
                    )}
                </div>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="rounded-2xl p-2 shadow-2xl border-zinc-100 bg-white/95 backdrop-blur-3xl w-48 z-[2000]">
                <DropdownMenuItem onClick={handleManualSync} className="rounded-xl h-11 flex gap-3 font-black text-[10px] uppercase tracking-widest cursor-pointer hover:bg-zinc-50">
                    <DatabaseBackup className="h-4 w-4 text-blue-600" /> Force Sync
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleClearCache} className="rounded-xl h-11 flex gap-3 font-black text-[10px] uppercase tracking-widest text-red-500 cursor-pointer hover:bg-red-50">
                    <RefreshCcw className="h-4 w-4" /> Clear Cache
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>

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
