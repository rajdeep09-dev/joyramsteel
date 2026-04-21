"use client";

import { useEffect, useRef, useState } from "react";
import { db } from "@/lib/db";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

/**
 * Enterprise Sync Engine (Version 3.0)
 * Optimized for Deletion Integrity & CRDT
 */
export function SyncEngine() {
  const isSyncing = useRef(false);
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem('last_db_sync');
    if (saved) setLastSyncTime(saved);

    const syncInterval = setInterval(async () => {
      await performSync();
    }, 10000); 

    const handleManualSync = () => performSync(true);
    window.addEventListener('request-sync', handleManualSync);
    performSync();

    return () => {
      clearInterval(syncInterval);
      window.removeEventListener('request-sync', handleManualSync);
    };
  }, []);

  const performSync = async (isForce = false) => {
    if (isSyncing.current) return;
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL.includes('placeholder')) return;

    isSyncing.current = true;
    window.dispatchEvent(new CustomEvent('sync-status', { detail: 'syncing' }));
    
    try {
      const tables = [
        { name: 'products', db: db.products },
        { name: 'variants', db: db.variants },
        { name: 'customers', db: db.customers },
        { name: 'khata_transactions', db: db.khata_transactions },
        { name: 'sales', db: db.sales },
        { name: 'sale_items', db: db.sale_items },
        { name: 'bills', db: db.bills },
        { name: 'digital_bills', db: db.digital_bills }
      ];

      for (const table of tables) {
        // 1. PULL & PURGE (Sync Shield V4.0)
        let pullQuery = supabase.from(table.name).select('*');
        
        // Always pull everything if force sync, otherwise pull changes
        if (!isForce && lastSyncTime) {
          pullQuery = pullQuery.gt('updated_at', lastSyncTime);
        }
        
        const { data: cloudChanges, error: pullError } = await pullQuery;
        
        if (!pullError && cloudChanges && cloudChanges.length > 0) {
          for (const cloudItem of cloudChanges) {
            // CRITICAL FIX: If cloud says it's deleted, KILL it locally immediately
            if (cloudItem.is_deleted === 1) {
              await (table.db as any).delete(cloudItem.id);
              continue; 
            }

            const localItem = await (table.db as any).get(cloudItem.id);
            const cloudClock = cloudItem.version_clock || 0;
            const localClock = localItem?.version_clock || 0;
            
            // If local item is already marked for deletion, don't let cloud resurrect it
            if (localItem?.is_deleted === 1) continue;

            if (!localItem || cloudClock > localClock || (cloudClock === localClock && new Date(cloudItem.updated_at) > new Date(localItem.updated_at))) {
              await (table.db as any).put({ ...cloudItem, sync_status: 'synced' });
            }
          }
        }

        // 2. PUSH (Including Deletions)
        const toPush = await (table.db as any).where('sync_status').equals('pending').toArray();

        if (toPush.length > 0) {
          const cleanedPush = toPush.map((item: any) => {
            const { sync_status, ...rest } = item;
            return rest;
          });

          const { error: pushError } = await supabase.from(table.name).upsert(cleanedPush);
          if (!pushError) {
            const syncedItems = toPush.map((item: any) => ({ ...item, sync_status: 'synced' }));
            await (table.db as any).bulkPut(syncedItems);
          }
        }
      }

      const now = new Date().toISOString();
      setLastSyncTime(now);
      localStorage.setItem('last_db_sync', now);
      window.dispatchEvent(new CustomEvent('database-synced', { detail: now }));
      window.dispatchEvent(new CustomEvent('sync-status', { detail: 'idle' }));

    } catch (err) {
      console.error("Sync Error:", err);
      window.dispatchEvent(new CustomEvent('sync-status', { detail: 'error' }));
    } finally {
      isSyncing.current = false;
    }
  };

  return null;
}
