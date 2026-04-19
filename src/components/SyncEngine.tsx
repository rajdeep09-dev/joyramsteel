"use client";

import { useEffect, useRef } from "react";
import { db } from "@/lib/db";
import { supabase } from "@/lib/supabase";

export function SyncEngine() {
  const isSyncing = useRef(false);

  useEffect(() => {
    // 1. Initial Pull & Periodic Sync
    const syncInterval = setInterval(async () => {
      if (isSyncing.current) return;
      isSyncing.current = true;
      
      try {
        // --- PULL FROM CLOUD ---
        const { data: cloudProducts } = await supabase.from('products').select('*');
        if (cloudProducts && cloudProducts.length > 0) {
          await db.products.bulkPut(cloudProducts);
        }

        const { data: cloudVariants } = await supabase.from('variants').select('*');
        if (cloudVariants && cloudVariants.length > 0) {
          await db.variants.bulkPut(cloudVariants);
        }

        const { data: cloudCustomers } = await supabase.from('customers').select('*');
        if (cloudCustomers && cloudCustomers.length > 0) {
          await db.customers.bulkPut(cloudCustomers);
        }

        const { data: cloudKhataTransactions } = await supabase.from('khata_transactions').select('*');
        if (cloudKhataTransactions && cloudKhataTransactions.length > 0) {
          await db.khata_transactions.bulkPut(cloudKhataTransactions);
        }

        // --- PUSH TO CLOUD ---
        // Push any local items that might be missing in the cloud.
        // For a robust app, use timestamp diffing. This is a lightweight approach.
        const localProducts = await db.products.toArray();
        if (localProducts.length > 0) {
          await supabase.from('products').upsert(localProducts, { onConflict: 'id' }).select();
        }

        const localVariants = await db.variants.toArray();
        if (localVariants.length > 0) {
          await supabase.from('variants').upsert(localVariants, { onConflict: 'id' }).select();
        }
        
        const localCustomers = await db.customers.toArray();
        if (localCustomers.length > 0) {
          await supabase.from('customers').upsert(localCustomers, { onConflict: 'id' }).select();
        }
        
        // Push pending sales
        const pendingSales = await db.sales.where('sync_status').equals('pending').toArray();
        if (pendingSales.length > 0) {
          const { error } = await supabase.from('sales').upsert(
            pendingSales.map(s => ({ ...s, sync_status: 'synced' })), 
            { onConflict: 'id' }
          );
          if (!error) {
            // Mark as synced locally
            await db.sales.bulkPut(pendingSales.map(s => ({ ...s, sync_status: 'synced' })));
          }
        }

        // Push pending khata transactions
        const pendingKhataTransactions = await db.khata_transactions.where('sync_status').equals('pending').toArray();
        if (pendingKhataTransactions.length > 0) {
          const { error } = await supabase.from('khata_transactions').upsert(
            pendingKhataTransactions.map(tx => ({ ...tx, sync_status: 'synced' })),
            { onConflict: 'id' }
          );
          if (!error) {
            await db.khata_transactions.bulkPut(pendingKhataTransactions.map(tx => ({ ...tx, sync_status: 'synced' })));
          }
        }

      } catch (err) {
        console.error("Background sync error:", err);
      } finally {
        isSyncing.current = false;
      }
    }, 3000); // Sync every 3 seconds for that "instant" feel

    return () => clearInterval(syncInterval);
  }, []);

  return null;
}
