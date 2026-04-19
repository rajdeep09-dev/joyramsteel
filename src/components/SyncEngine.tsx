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
      
      // Don't attempt sync if we only have placeholder credentials
      if (process.env.NEXT_PUBLIC_SUPABASE_URL?.includes('placeholder') || 
          !process.env.NEXT_PUBLIC_SUPABASE_URL) {
        return;
      }

      isSyncing.current = true;
      
      try {
        // --- PULL FROM CLOUD ---
        const { data: cloudProducts } = await supabase.from('products').select('*');
        if (cloudProducts && cloudProducts.length > 0) await db.products.bulkPut(cloudProducts);

        const { data: cloudVariants } = await supabase.from('variants').select('*');
        if (cloudVariants && cloudVariants.length > 0) await db.variants.bulkPut(cloudVariants);

        const { data: cloudCustomers } = await supabase.from('customers').select('*');
        if (cloudCustomers && cloudCustomers.length > 0) await db.customers.bulkPut(cloudCustomers);

        const { data: cloudKhataTransactions } = await supabase.from('khata_transactions').select('*');
        if (cloudKhataTransactions && cloudKhataTransactions.length > 0) await db.khata_transactions.bulkPut(cloudKhataTransactions);

        const { data: cloudSales } = await supabase.from('sales').select('*');
        if (cloudSales && cloudSales.length > 0) await db.sales.bulkPut(cloudSales);

        const { data: cloudSaleItems } = await supabase.from('sale_items').select('*');
        if (cloudSaleItems && cloudSaleItems.length > 0) await db.sale_items.bulkPut(cloudSaleItems);

        const { data: cloudBills } = await supabase.from('bills').select('*');
        if (cloudBills && cloudBills.length > 0) await db.bills.bulkPut(cloudBills);

        // --- PUSH TO CLOUD ---
        const localProducts = await db.products.toArray();
        if (localProducts.length > 0) await supabase.from('products').upsert(localProducts);

        const localVariants = await db.variants.toArray();
        if (localVariants.length > 0) await supabase.from('variants').upsert(localVariants);
        
        const localCustomers = await db.customers.toArray();
        if (localCustomers.length > 0) await supabase.from('customers').upsert(localCustomers);

        const localBills = await db.bills.toArray();
        if (localBills.length > 0) await supabase.from('bills').upsert(localBills);
        
        // Push pending sales & items
        const pendingSales = await db.sales.where('sync_status').equals('pending').toArray();
        if (pendingSales.length > 0) {
          const { error } = await supabase.from('sales').upsert(pendingSales.map(s => ({ ...s, sync_status: 'synced' })));
          if (!error) {
            // Also push related sale items
            const saleIds = pendingSales.map(s => s.id);
            const items = await db.sale_items.where('sale_id').anyOf(saleIds).toArray();
            if (items.length > 0) await supabase.from('sale_items').upsert(items);
            
            await db.sales.bulkPut(pendingSales.map(s => ({ ...s, sync_status: 'synced' })));
          }
        }

        // Push pending khata transactions
        const pendingKhataTransactions = await db.khata_transactions.where('sync_status').equals('pending').toArray();
        if (pendingKhataTransactions.length > 0) {
          const { error } = await supabase.from('khata_transactions').upsert(pendingKhataTransactions.map(tx => ({ ...tx, sync_status: 'synced' })));
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
