"use client";

import { useEffect, useRef, useState } from "react";
import { db } from "@/lib/db";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

export function SyncEngine() {
  const isSyncing = useRef(false);
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);

  useEffect(() => {
    // 1. Periodic Sync (Every 5 seconds)
    const syncInterval = setInterval(async () => {
      if (isSyncing.current) return;
      
      // Skip if placeholder credentials
      if (process.env.NEXT_PUBLIC_SUPABASE_URL?.includes('placeholder') || 
          !process.env.NEXT_PUBLIC_SUPABASE_URL) {
        return;
      }

      isSyncing.current = true;
      
      try {
        const tables = [
          { name: 'products', db: db.products },
          { name: 'variants', db: db.variants },
          { name: 'customers', db: db.customers },
          { name: 'khata_transactions', db: db.khata_transactions },
          { name: 'sales', db: db.sales },
          { name: 'sale_items', db: db.sale_items },
          { name: 'bills', db: db.bills }
        ];

        for (const table of tables) {
          // --- A. PULL CHANGES FROM CLOUD ---
          let pullQuery = supabase.from(table.name).select('*');
          if (lastSyncTime) {
            pullQuery = pullQuery.gt('updated_at', lastSyncTime);
          }
          
          const { data: cloudChanges, error: pullError } = await pullQuery;
          
          if (!pullError && cloudChanges && cloudChanges.length > 0) {
            for (const cloudItem of cloudChanges) {
              const localItem = await (table.db as any).get(cloudItem.id);
              // Smart Merge: Only update if cloud version is newer
              if (!localItem || new Date(cloudItem.updated_at) > new Date(localItem.updated_at)) {
                await (table.db as any).put(cloudItem);
              }
            }
          }

          // --- B. PUSH LOCAL CHANGES TO CLOUD ---
          // Push items that are pending OR updated locally after our last sync
          const localItems = await (table.db as any).toArray();
          const toPush = localItems.filter((item: any) => {
             if (item.sync_status === 'pending') return true;
             if (!lastSyncTime) return true;
             return new Date(item.updated_at) > new Date(lastSyncTime);
          });

          if (toPush.length > 0) {
            // Remove local-only 'sync_status' before pushing to Supabase
            const cleanedPush = toPush.map((item: any) => {
              const { sync_status, ...rest } = item;
              return rest;
            });

            const { error: pushError } = await supabase.from(table.name).upsert(cleanedPush);
            
            if (!pushError) {
              // Mark as synced locally
              const syncedItems = toPush.map((item: any) => ({ ...item, sync_status: 'synced' }));
              await (table.db as any).bulkPut(syncedItems);
            }
          }
        }

        setLastSyncTime(new Date().toISOString());

      } catch (err) {
        console.error("Critical Sync Error:", err);
      } finally {
        isSyncing.current = false;
      }
    }, 5000);

    return () => clearInterval(syncInterval);
  }, [lastSyncTime]);

  return null;
}
