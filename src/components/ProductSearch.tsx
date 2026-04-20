"use client";

import React, { useState } from "react";
import { Search, Package } from "lucide-react";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

interface ProductSearchProps {
  onSelect: (item: any) => void;
  className?: string;
  placeholder?: string;
}

export function ProductSearch({ onSelect, className, placeholder = "Search products..." }: ProductSearchProps) {
  const [search, setSearch] = useState("");
  const [isOpen, setIsOpen] = useState(false);

  const catalog = useLiveQuery(async () => {
    // Production logic: Filter out deleted products and variants
    const products = await db.products.where('is_deleted').equals(0).toArray();
    const variants = await db.variants.where('is_deleted').equals(0).toArray();
    
    return variants.map(v => {
      const p = products.find(prod => prod.id === v.product_id);
      return {
        ...v,
        productName: p?.name || "Unknown Product",
        category: p?.category || "General",
        image: v.image_url || p?.image_url
      };
    });
  }, []);

  const filtered = (catalog || []).filter(item => 
    item.productName.toLowerCase().includes(search.toLowerCase()) ||
    item.barcode?.includes(search)
  ).slice(0, 10);

  return (
    <div className={cn("relative", className)}>
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-zinc-400 z-10" />
        <Input
          placeholder={placeholder}
          className="pl-12 h-14 rounded-2xl bg-zinc-50/50 border-zinc-100 focus:bg-white focus:ring-4 focus:ring-zinc-900/5 transition-all text-base font-bold shadow-inner"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          onBlur={() => setTimeout(() => setIsOpen(false), 200)}
        />
      </div>

      <AnimatePresence>
        {isOpen && search.trim().length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            className="fixed inset-x-0 bottom-0 top-[100px] z-[1000] md:absolute md:top-full md:inset-x-auto md:w-full md:bottom-auto md:mt-3 bg-white/95 md:bg-white backdrop-blur-3xl md:backdrop-blur-none border-t md:border border-zinc-200 shadow-[0_-20px_50px_rgba(0,0,0,0.1)] md:shadow-2xl rounded-t-[2.5rem] md:rounded-3xl overflow-hidden flex flex-col"
          >
            <div className="md:hidden w-12 h-1.5 bg-zinc-200 rounded-full mx-auto my-4 shrink-0" />
            <div className="px-6 py-2 md:hidden">
              <h3 className="font-black text-zinc-900 uppercase tracking-widest text-[10px]">Select Product</h3>
            </div>
            <ScrollArea className="flex-1">
              <div className="p-2 md:p-1.5">
                {filtered.length === 0 ? (
                  <div className="p-12 text-center flex flex-col items-center gap-3">
                    <div className="p-4 bg-zinc-50 rounded-full">
                      <Package className="h-8 w-8 text-zinc-300" />
                    </div>
                    <p className="text-zinc-400 font-bold uppercase tracking-widest text-xs">No matches found</p>
                  </div>
                ) : (
                  filtered.map(item => (
                    <div
                      key={item.id}
                      onClick={() => {
                        onSelect(item);
                        setSearch("");
                        setIsOpen(false);
                      }}
                      className="p-4 md:p-3 hover:bg-zinc-900 hover:text-white rounded-[1.25rem] cursor-pointer flex items-center justify-between group transition-all mb-1 last:mb-0"
                    >
                      <div className="flex items-center gap-4">
                        <div className="h-12 w-12 md:h-10 md:w-10 rounded-xl bg-zinc-100 group-hover:bg-white/10 flex items-center justify-center shrink-0 shadow-inner overflow-hidden">
                          {item.image ? (
                            <img src={item.image} className="w-full h-full object-cover" />
                          ) : (
                            <Package className="h-5 w-5 text-zinc-400 group-hover:text-white/40" />
                          )}
                        </div>
                        <div className="text-left">
                          <div className="font-black text-base md:text-sm tracking-tight">{item.productName}</div>
                          <div className="text-[10px] font-bold text-zinc-400 group-hover:text-white/40 uppercase tracking-widest">{item.size} &bull; {item.stock} {item.unit?.toUpperCase() || 'PCS'} LEFT</div>
                        </div>
                      </div>
                      <div className="font-black text-lg md:text-sm tracking-tighter">₹{item.base_price}</div>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
