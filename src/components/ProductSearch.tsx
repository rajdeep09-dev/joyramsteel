"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import { Search, Package, Command, X, ArrowRight, Zap, History, TrendingUp, Barcode, Camera, Loader2, UploadCloud } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { fuzzyMatch } from "@/lib/fuzzy";
import { Html5Qrcode } from "html5-qrcode";
import { toast } from "sonner";

interface ProductSearchProps {
  onSelect: (item: any) => void;
  onQueryChange?: (query: string) => void;
  className?: string;
  placeholder?: string;
}

export function ProductSearch({ onSelect, onQueryChange, className, placeholder = "Scan or Search..." }: ProductSearchProps) {
  const [search, setSearch] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [isProcessingImage, setIsProcessingImage] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);

  const handleSearchChange = (val: string) => {
    setSearch(val);
    onQueryChange?.(val);
  };

  const catalog = useLiveQuery(async () => {
    const products = await db.products.where('is_deleted').equals(0).toArray();
    const variants = await db.variants.where('is_deleted').equals(0).toArray();
    return variants.map(v => {
      const p = products.find(prod => prod.id === v.product_id);
      return { ...v, productName: p?.name || "Unknown", category: p?.category || "General", image: v.image_url || p?.image_url };
    });
  }, []);

  // Barcode Autodetect Engine
  useEffect(() => {
    if (!search || !catalog) return;
    const exactMatch = catalog.find(item => item.barcode === search);
    if (exactMatch) {
      onSelect(exactMatch);
      handleSearchChange("");
      setIsOpen(false);
      toast.success(`Barcode Detected: ${exactMatch.productName}`);
      if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(50);
    }
  }, [search, catalog]);

  const filtered = useMemo(() => {
    if (!search || !catalog) return [];
    const q = search.toLowerCase();
    return catalog
      .map(item => {
        const name = item.productName.toLowerCase();
        const barcode = item.barcode?.toLowerCase() || "";
        let score = 0;
        if (name === q || barcode === q) score = 100;
        else if (name.startsWith(q)) score = 80;
        else if (name.includes(q)) score = 60;
        else if (fuzzyMatch(q, item.productName, 1)) score = 40;
        return { ...item, searchScore: score };
      })
      .filter(item => item.searchScore > 0)
      .sort((a, b) => b.searchScore - a.searchScore)
      .slice(0, 8);
  }, [search, catalog]);

  const startScanner = async () => {
    setIsScannerOpen(true);
    setIsOpen(false);
    setTimeout(() => {
      const html5QrCode = new Html5Qrcode("reader");
      scannerRef.current = html5QrCode;
      html5QrCode.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        (decodedText) => {
          handleSearchChange(decodedText);
          stopScanner();
          setIsOpen(true);
        },
        () => {}
      ).catch(err => {
        console.error(err);
        toast.error("Camera access denied");
        setIsScannerOpen(false);
      });
    }, 100);
  };

  const stopScanner = () => {
    if (scannerRef.current) {
      scannerRef.current.stop().then(() => {
        scannerRef.current = null;
        setIsScannerOpen(false);
      });
    } else {
      setIsScannerOpen(false);
    }
  };

  const handleImageScan = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsProcessingImage(true);
    const id = toast.loading("Analysing Barcode Image...");
    try {
      const html5QrCode = new Html5Qrcode("reader-hidden");
      const result = await html5QrCode.scanFile(file, true);
      handleSearchChange(result);
      toast.success("Barcode Recognized!", { id });
    } catch (err) {
      toast.error("No barcode found in image", { id });
    } finally {
      setIsProcessingImage(false);
    }
  };

  return (
    <div className={cn("relative w-full", className)}>
      <div id="reader-hidden" className="hidden" />
      <div className="relative group">
        <div className="absolute left-6 top-1/2 -translate-y-1/2 flex items-center gap-4 z-10">
          <Search className={cn("h-6 w-6 transition-colors", isOpen ? "text-blue-600" : "text-zinc-400")} />
        </div>
        
        <Input
          ref={inputRef}
          placeholder={placeholder}
          className={cn(
            "pl-16 pr-44 h-20 rounded-[2rem] bg-white dark:bg-zinc-900 border-2 border-zinc-100 dark:border-zinc-800 transition-all duration-500",
            "text-xl font-black italic tracking-tight placeholder:text-zinc-300 dark:text-white",
            "focus-visible:ring-0 focus:border-blue-600 focus:shadow-[0_20px_80px_rgba(37,99,235,0.15)]",
            isOpen && "rounded-b-none border-b-zinc-50 dark:border-b-zinc-800 shadow-none"
          )}
          value={search}
          onChange={(e) => { handleSearchChange(e.target.value); setIsOpen(true); }}
          onFocus={() => setIsOpen(true)}
        />

        <div className="absolute right-6 top-1/2 -translate-y-1/2 flex items-center gap-2">
          <label className="p-3 bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 rounded-2xl cursor-pointer hover:bg-zinc-200 transition-all">
            <input type="file" accept="image/*" className="hidden" onChange={handleImageScan} disabled={isProcessingImage} />
            <UploadCloud className="h-6 w-6" />
          </label>
          <button onClick={startScanner} className="p-3 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-2xl shadow-xl active:scale-90 transition-all">
            <Camera className="h-6 w-6" />
          </button>
        </div>
      </div>

      <AnimatePresence>
        {isScannerOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/90 z-[2000] flex flex-col items-center justify-center p-6">
             <div className="w-full max-w-md aspect-square bg-zinc-800 rounded-[3rem] overflow-hidden relative border-4 border-white/20 shadow-2xl">
                <div id="reader" className="w-full h-full" />
                <div className="absolute inset-0 border-[40px] border-black/40 pointer-events-none" />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-[2px] bg-red-500 shadow-[0_0_15px_rgba(239,68,68,1)] animate-pulse" />
             </div>
             <p className="mt-10 font-black text-white uppercase tracking-[0.3em] text-xs">Align Barcode within Frame</p>
             <Button onClick={stopScanner} variant="outline" className="mt-10 rounded-2xl h-16 px-10 border-white/20 text-white hover:bg-white/10 font-black uppercase tracking-widest">Cancel Scan</Button>
          </motion.div>
        )}

        {isOpen && !isScannerOpen && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsOpen(false)} className="fixed inset-0 bg-black/20 backdrop-blur-[2px] z-[900] md:hidden" />
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} className={cn("z-[1000] flex flex-col overflow-hidden fixed inset-x-0 bottom-0 top-auto h-[80vh] bg-white dark:bg-zinc-900 rounded-t-[3.5rem] shadow-2xl md:h-auto md:absolute md:top-full md:inset-x-0 md:bg-white dark:md:bg-zinc-900 md:border-2 md:border-blue-600 md:border-t-0 md:rounded-b-[2.5rem] md:rounded-t-none")}>
              <div className="md:hidden w-16 h-1.5 bg-zinc-100 dark:bg-zinc-800 rounded-full mx-auto my-6 shrink-0" />
              <ScrollArea className="flex-1">
                <div className="p-4 md:p-5">
                  {filtered.length === 0 ? (
                    <div className="py-20 text-center opacity-40 font-black uppercase text-xs tracking-widest dark:text-white">Waiting for input...</div>
                  ) : (
                    <div className="space-y-2 pb-6">
                      {filtered.map((item, idx) => (
                        <motion.div key={item.id} onClick={() => { onSelect(item); handleSearchChange(""); setIsOpen(false); }} className="p-5 rounded-[2rem] cursor-pointer flex items-center justify-between transition-all border-2 border-transparent hover:bg-zinc-900 dark:hover:bg-white hover:text-white dark:hover:text-zinc-900">
                          <div className="flex items-center gap-6">
                            <div className="h-16 w-16 rounded-2xl bg-zinc-100 flex items-center justify-center shrink-0 overflow-hidden">
                              {item.image ? <img src={item.image} className="w-full h-full object-cover mix-blend-multiply" alt="" /> : <Package className="h-7 w-7 text-zinc-300" />}
                            </div>
                            <div className="text-left">
                              <div className="font-black text-xl uppercase italic leading-none mb-1.5">{item.productName}</div>
                              <div className="flex items-center gap-3 text-[9px] font-bold uppercase tracking-widest opacity-60">{item.size} &bull; {item.category}</div>
                            </div>
                          </div>
                          <div className="font-black text-2xl italic tracking-tighter">₹{item.base_price.toLocaleString()}</div>
                        </motion.div>
                      ))}
                    </div>
                  )}
                </div>
              </ScrollArea>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
