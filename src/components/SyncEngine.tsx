"use client";

import { useEffect, useRef, useState } from "react";
import { db } from "@/lib/db";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

export function SyncEngine() {
  const isSyncing = useRef(false);
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);

  useEffect(() => {
    const syncInterval = setInterval(async () => {
      if (isSyncing.current) return;
      
      if (!process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL.includes('placeholder')) {
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
          { name: 'bills', db: db.bills },
          { name: 'digital_bills', db: db.digital_bills }
        ];

        for (const table of tables) {
          // 1. PULL: Fetch updates from cloud
          let pullQuery = supabase.from(table.name).select('*');
          if (lastSyncTime) {
            pullQuery = pullQuery.gt('updated_at', lastSyncTime);
          }
          
          const { data: cloudChanges, error: pullError } = await pullQuery;
          
          if (!pullError && cloudChanges && cloudChanges.length > 0) {
            for (const cloudItem of cloudChanges) {
              const localItem = await (table.db as any).get(cloudItem.id);
              if (!localItem || new Date(cloudItem.updated_at) > new Date(localItem.updated_at)) {
                await (table.db as any).put({ ...cloudItem, sync_status: 'synced' });
              }
            }
          }

          // 2. PUSH: Send local changes to cloud
          const toPush = await (table.db as any)
            .where('sync_status').equals('pending')
            .or('updated_at').above(lastSyncTime || '1970-01-01')
            .toArray();

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
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('database-synced', { detail: now }));
        }

      } catch (err) {
        console.error("Sync Failure:", err);
      } finally {
        isSyncing.current = false;
      }
    }, 5000);

    return () => clearInterval(syncInterval);
  }, [lastSyncTime]);

  return null;
}
