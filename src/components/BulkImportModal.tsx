"use client";

import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { UploadCloud, CheckCircle2, AlertTriangle, Loader2 } from "lucide-react";
import { db } from "@/lib/db";
import { v4 as uuidv4 } from "uuid";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { generateBarcode } from "@/lib/barcode";

interface BulkImportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function BulkImportModal({ isOpen, onClose }: BulkImportModalProps) {
  const [isProcessing, setIsUploading] = useState(false);
  const [previewData, setPreviewData] = useState<any[]>([]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const csv = event.target?.result as string;
        const lines = csv.split('\n');
        const result = [];
        const headers = lines[0].split(',');

        for (let i = 1; i < lines.length; i++) {
          if (!lines[i].trim()) continue;
          const obj: any = {};
          const currentline = lines[i].split(',');
          headers.forEach((header, s) => {
            obj[header.trim().toLowerCase()] = currentline[s]?.trim();
          });
          result.push(obj);
        }
        setPreviewData(result);
        toast.success(`Parsed ${result.length} items`);
      } catch {
        toast.error("Failed to parse CSV");
      }
    };
    reader.readAsText(file);
  };

  const handleImport = async () => {
    if (previewData.length === 0) return;
    setIsUploading(true);

    try {
      const now = new Date().toISOString();
      await db.transaction('rw', db.products, db.variants, async () => {
        for (const p of previewData) {
          const productId = uuidv4();
          // 1. Create Master Product
          await db.products.add({
            id: productId,
            name: (p.name || "UNNAMED").toUpperCase(),
            category: (p.category || "GENERAL").toUpperCase(),
            image_url: p.image || "",
            created_at: now,
            updated_at: now,
            is_deleted: 0,
            sync_status: 'pending',
            version_clock: Date.now()
          });

          // 2. Create Variant with Auto-Barcode
          await db.variants.add({
            id: uuidv4(),
            product_id: productId,
            size: p.size || "Standard",
            unit: (p.unit || "pcs") as any,
            stock: parseInt(p.qty || "0"),
            dented_stock: 0,
            cost_price: parseFloat(p.msp || p.mrp || "0"),
            msp: parseFloat(p.msp || p.mrp || "0"),
            base_price: parseFloat(p.mrp || "0"),
            barcode: p.barcode || generateBarcode(),
            pricing_type: 'standard',
            created_at: now,
            updated_at: now,
            is_deleted: 0,
            sync_status: 'pending',
            version_clock: Date.now()
          });
        }
      });
      toast.success("Bulk Deployment Successful");
      setPreviewData([]);
      onClose();
    } catch (e) {
      console.error(e);
      toast.error("Import Failed");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[700px] rounded-[2.5rem] bg-white dark:bg-zinc-900 border-none shadow-2xl overflow-hidden p-0">
        <div className="p-8 border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50">
          <DialogHeader>
            <DialogTitle className="text-3xl font-black italic uppercase tracking-tighter flex items-center gap-3">
               <UploadCloud className="h-8 w-8 text-blue-600" /> Bulk Import Pro
            </DialogTitle>
          </DialogHeader>
        </div>

        <div className="p-8 space-y-6">
          {previewData.length === 0 ? (
            <div className="border-4 border-dashed border-zinc-100 dark:border-zinc-800 rounded-[2rem] py-20 flex flex-col items-center justify-center gap-6 relative group transition-all hover:border-blue-200 dark:hover:border-blue-900">
               <input type="file" accept=".csv" className="absolute inset-0 opacity-0 cursor-pointer z-10" onChange={handleFileUpload} />
               <div className="p-6 bg-zinc-50 dark:bg-zinc-800 rounded-full shadow-inner"><UploadCloud className="h-12 w-12 text-zinc-300 group-hover:text-blue-500 transition-colors" /></div>
               <div className="text-center">
                  <p className="font-black uppercase text-[10px] tracking-widest text-zinc-400 mb-1">Drop CSV Catalog Here</p>
                  <p className="text-[8px] font-bold text-zinc-300 uppercase tracking-widest leading-relaxed">Columns needed: Name, Category, Size, Unit, Qty, MRP, MSP</p>
               </div>
            </div>
          ) : (
            <div className="space-y-6">
               <ScrollArea className="h-64 rounded-2xl border border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 p-4">
                  <div className="space-y-2">
                     {previewData.map((item, i) => (
                       <div key={i} className="flex justify-between items-center p-3 bg-white dark:bg-zinc-900 rounded-xl shadow-sm border border-zinc-50 dark:border-zinc-800">
                          <span className="font-black text-[10px] uppercase italic truncate w-40">{item.name}</span>
                          <Badge variant="outline" className="text-[8px] font-black">{item.size}</Badge>
                          <span className="font-bold text-[10px] text-emerald-600">₹{item.mrp}</span>
                       </div>
                     ))}
                  </div>
               </ScrollArea>
               <div className="flex gap-4">
                  <Button variant="outline" onClick={() => setPreviewData([])} className="flex-1 h-14 rounded-2xl font-black uppercase text-[10px] tracking-widest">Reset</Button>
                  <Button onClick={handleImport} disabled={isProcessing} className="flex-[2] h-14 rounded-2xl bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 font-black uppercase text-[10px] tracking-widest shadow-2xl">
                    {isProcessing ? <Loader2 className="animate-spin h-5 w-5" /> : `DEPLOY ${previewData.length} ITEMS`}
                  </Button>
               </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
