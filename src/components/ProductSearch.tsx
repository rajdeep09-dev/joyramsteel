"use client";

import React, { useState, useEffect, useRef } from "react";
import { Search, Package, Command, X, ArrowRight, Zap, History, TrendingUp } from "lucide-react";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

interface ProductSearchProps {
  onSelect: (item: any) => void;
  onQueryChange?: (query: string) => void;
  className?: string;
  placeholder?: string;
}

export function ProductSearch({ onSelect, onQueryChange, className, placeholder = "Scan Barcode or Search..." }: ProductSearchProps) {
  const [search, setSearch] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Sync with parent query
  const handleSearchChange = (val: string) => {
    setSearch(val);
    onQueryChange?.(val);
  };

  // Keyboard shortcut Cmd/Ctrl + K to focus
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        inputRef.current?.focus();
      }
      if (e.key === "Escape") {
        setIsOpen(false);
        inputRef.current?.blur();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const catalog = useLiveQuery(async () => {
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

  const filtered = (catalog || []).filter(item => {
    const searchLower = search.toLowerCase();
    return (
      item.productName.toLowerCase().includes(searchLower) ||
      item.category.toLowerCase().includes(searchLower) ||
      item.size.toLowerCase().includes(searchLower) ||
      item.barcode?.includes(search)
    );
  }).slice(0, 8);

  // Handle Keyboard Navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex(prev => (prev + 1) % (filtered.length || 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex(prev => (prev - 1 + (filtered.length || 1)) % (filtered.length || 1));
    } else if (e.key === "Enter" && filtered[selectedIndex]) {
      e.preventDefault();
      onSelect(filtered[selectedIndex]);
      handleSearchChange("");
      setIsOpen(false);
    }
  };

  useEffect(() => {
    setSelectedIndex(0);
  }, [search]);

  return (
    <div className={cn("relative w-full", className)}>
      <div className="relative group">
        <div className="absolute left-6 top-1/2 -translate-y-1/2 flex items-center gap-3 z-10 pointer-events-none">
          <Search className={cn(
            "h-6 w-6 transition-colors duration-300",
            isOpen ? "text-zinc-900" : "text-zinc-400 group-focus-within:text-zinc-900"
          )} />
        </div>
        
        <Input
          ref={inputRef}
          placeholder={placeholder}
          className={cn(
            "pl-16 pr-24 h-20 rounded-[2.5rem] bg-white border-2 border-zinc-100 transition-all duration-500",
            "text-xl font-black italic tracking-tight placeholder:text-zinc-300 placeholder:italic",
            "focus-visible:ring-0 focus-visible:ring-offset-0 focus:border-zinc-900 focus:shadow-[0_20px_50px_rgba(0,0,0,0.1)]",
            isOpen && "rounded-b-none border-b-transparent shadow-none"
          )}
          value={search}
          onChange={(e) => {
            handleSearchChange(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
        />

        <div className="absolute right-8 top-1/2 -translate-y-1/2 flex items-center gap-3">
          {search ? (
            <button 
              onClick={() => { handleSearchChange(""); setIsOpen(false); }}
              className="p-2 hover:bg-zinc-100 rounded-full transition-colors"
            >
              <X className="h-5 w-5 text-zinc-400" />
            </button>
          ) : (
            <kbd className="hidden md:flex h-8 select-none items-center gap-1 rounded border border-zinc-200 bg-zinc-50 px-2 font-mono text-[10px] font-black text-zinc-400 uppercase tracking-widest">
              <span className="text-xs">⌘</span> K
            </kbd>
          )}
        </div>
      </div>

      <AnimatePresence>
        {isOpen && (
          <>
            {/* Mobile/Desktop Backdrop */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[900] md:hidden"
            />

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className={cn(
                "z-[1000] flex flex-col overflow-hidden",
                // Mobile Styles: Full screen drawer
                "fixed inset-x-0 bottom-0 top-auto h-[85vh] bg-white rounded-t-[3.5rem] shadow-[0_-20px_80px_rgba(0,0,0,0.3)] md:h-auto",
                // Desktop Styles: Dropdown attached to input
                "md:absolute md:top-full md:inset-x-0 md:bottom-auto md:bg-white md:border-2 md:border-zinc-900 md:border-t-0 md:rounded-b-[2.5rem] md:rounded-t-none md:shadow-2xl"
              )}
            >
              {/* Mobile Handle */}
              <div className="md:hidden w-16 h-1.5 bg-zinc-200 rounded-full mx-auto my-6 shrink-0" />
              
              <div className="px-8 pb-4 flex items-center justify-between md:hidden">
                <h3 className="font-black text-2xl italic tracking-tighter text-zinc-900">BROWSE CATALOG</h3>
                <button onClick={() => setIsOpen(false)} className="p-3 bg-zinc-100 rounded-2xl"><X className="h-6 w-6" /></button>
              </div>

              <div className="flex-1 min-h-0 flex flex-col">
                {/* Section Headers */}
                <div className="px-8 py-3 bg-zinc-50/50 flex items-center gap-3">
                   {search ? (
                     <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">
                       <Zap className="h-3 w-3 text-amber-500 fill-amber-500" /> SEARCH RESULTS
                     </div>
                   ) : (
                     <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">
                       <History className="h-3 w-3" /> SUGGESTED PRODUCTS
                     </div>
                   )}
                </div>

                <ScrollArea className="flex-1">
                  <div className="p-4 md:p-3">
                    {filtered.length === 0 ? (
                      <div className="p-16 text-center flex flex-col items-center gap-4">
                        <div className="p-6 bg-zinc-50 rounded-full">
                          <Package className="h-10 w-10 text-zinc-200" />
                        </div>
                        <p className="text-zinc-400 font-black italic text-lg tracking-tight">NO MATCHES FOUND</p>
                        <button 
                          onClick={() => setSearch("")}
                          className="text-[10px] font-black uppercase tracking-widest text-blue-600 hover:underline"
                        >
                          View all inventory
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {(search ? filtered : (catalog?.slice(0, 5) || [])).map((item, idx) => (
                          <motion.div
                            key={item.id}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: idx * 0.05 }}
                            onClick={() => {
                              onSelect(item);
                              handleSearchChange("");
                              setIsOpen(false);
                            }}
                            onMouseEnter={() => setSelectedIndex(idx)}
                            className={cn(
                              "group p-5 md:p-4 rounded-[1.75rem] cursor-pointer flex items-center justify-between transition-all duration-300",
                              selectedIndex === idx ? "bg-zinc-900 text-white translate-x-2" : "hover:bg-zinc-50"
                            )}
                          >
                            <div className="flex items-center gap-5">
                              <div className={cn(
                                "h-16 w-16 md:h-14 md:w-14 rounded-2xl bg-zinc-100 flex items-center justify-center shrink-0 shadow-inner overflow-hidden transition-transform duration-500 group-hover:scale-110",
                                selectedIndex === idx && "bg-white/10"
                              )}>
                                {item.image ? (
                                  <img src={item.image} className="w-full h-full object-cover mix-blend-multiply" />
                                ) : (
                                  <Package className={cn("h-7 w-7", selectedIndex === idx ? "text-white/20" : "text-zinc-300")} />
                                )}
                              </div>
                              <div className="text-left">
                                <div className="font-black text-xl md:text-lg italic tracking-tight uppercase leading-none mb-1">
                                  {item.productName}
                                </div>
                                <div className="flex flex-wrap items-center gap-3">
                                  <span className={cn(
                                    "text-[10px] font-black uppercase tracking-widest",
                                    selectedIndex === idx ? "text-white/40" : "text-zinc-400"
                                  )}>
                                    {item.size} &bull; {item.category}
                                  </span>
                                  {item.pricing_type === 'bundle' && (
                                    <Badge className={cn(
                                      "px-1.5 py-0 text-[8px] font-black border-none uppercase h-4 tracking-[0.1em]",
                                      selectedIndex === idx ? "bg-white/20 text-white" : "bg-blue-500/10 text-blue-600"
                                    )}>
                                      Bundle Available
                                    </Badge>
                                  )}
                                  <Badge className={cn(
                                    "px-2 py-0 text-[9px] font-black border-none",
                                    item.stock < 5 ? "bg-red-500 text-white" : "bg-emerald-500/10 text-emerald-500",
                                    selectedIndex === idx && "bg-white/20 text-white"
                                  )}>
                                    {item.stock} {item.unit?.toUpperCase() || 'PCS'}
                                  </Badge>
                                </div>
                              </div>
                            </div>
                            <div className="flex flex-col items-end gap-1">
                              <div className="font-black text-2xl md:text-xl tracking-tighter italic">₹{item.base_price.toLocaleString()}</div>
                              <ArrowRight className={cn(
                                "h-5 w-5 transition-all duration-300",
                                selectedIndex === idx ? "translate-x-0 opacity-100" : "-translate-x-4 opacity-0"
                              )} />
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    )}
                  </div>
                </ScrollArea>
                
                {/* Desktop Footer */}
                <div className="hidden md:flex items-center justify-between px-8 py-4 border-t border-zinc-100 bg-zinc-50/50">
                   <div className="flex items-center gap-4 text-[9px] font-black text-zinc-400 uppercase tracking-widest">
                     <span className="flex items-center gap-1.5"><TrendingUp className="h-3 w-3" /> Select</span>
                     <span className="flex items-center gap-1.5"><Command className="h-3 w-3" /> To Add</span>
                   </div>
                   <div className="text-[9px] font-black text-blue-600 uppercase tracking-widest flex items-center gap-2">
                     <Zap className="h-3 w-3 fill-blue-600" /> SCAN BARCODE NOW
                   </div>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
