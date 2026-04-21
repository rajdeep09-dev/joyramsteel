"use client";

import { useEffect, useState } from "react";
import { Wifi, WifiOff, CloudSync, CloudOff, Smartphone, Zap, ShieldCheck } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

/**
 * Module 6: The Intelligent State Observer (ISO)
 * Monitors PWA, Sync, and Network status globally.
 */
export function TerminalMonitor() {
  const [isOnline, setIsOnline] = useState(true);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'error'>('idle');
  const [isPWA, setIsPWA] = useState(false);

  useEffect(() => {
    // 1. Network Monitoring
    const updateOnline = () => setIsOnline(navigator.onLine);
    window.addEventListener('online', updateOnline);
    window.addEventListener('offline', updateOnline);

    // 2. Sync Heartbeat Listener
    const handleSync = (e: any) => setSyncStatus(e.detail);
    window.addEventListener('sync-status', handleSync);

    // 3. PWA Detection
    if (window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone) {
      setIsPWA(true);
    }

    return () => {
      window.removeEventListener('online', updateOnline);
      window.removeEventListener('offline', updateOnline);
      window.removeEventListener('sync-status', handleSync);
    };
  }, []);

  return (
    <div className="fixed bottom-6 right-6 z-[100] flex flex-col gap-3 items-end pointer-events-none">
      <AnimatePresence>
        {/* Network Status Badge */}
        {!isOnline && (
          <motion.div 
            initial={{ x: 50, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 50, opacity: 0 }}
            className="bg-red-600 text-white px-4 py-2 rounded-2xl shadow-2xl flex items-center gap-3 border border-red-500 font-black text-[9px] uppercase tracking-widest"
          >
            <WifiOff className="h-4 w-4" /> LOCAL MODE ONLY
          </motion.div>
        )}

        {/* Sync Status Badge */}
        <motion.div 
          layout
          className={cn(
            "px-4 py-2 rounded-2xl shadow-2xl flex items-center gap-3 border font-black text-[9px] uppercase tracking-widest transition-all",
            syncStatus === 'syncing' ? "bg-zinc-900 border-zinc-800 text-blue-400" : "bg-white/80 backdrop-blur-xl border-zinc-100 text-zinc-400"
          )}
        >
          {syncStatus === 'syncing' ? (
            <CloudSync className="h-4 w-4 animate-spin" />
          ) : (
            <Zap className={cn("h-4 w-4", isOnline ? "text-amber-500" : "text-zinc-300")} />
          )}
          {syncStatus === 'syncing' ? "Encrypting Delta..." : "Cloud Verified"}
        </motion.div>

        {/* PWA Shield Badge */}
        {isPWA && (
          <motion.div 
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-zinc-900 text-white px-4 py-2 rounded-2xl shadow-2xl flex items-center gap-3 border border-zinc-800 font-black text-[9px] uppercase tracking-widest"
          >
            <ShieldCheck className="h-4 w-4 text-emerald-500" /> Enterprise Secured
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
