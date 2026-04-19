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
import { 
  Package, 
  ArrowRight, 
  CheckCircle2, 
  Camera, 
  Trash2,
  AlertCircle,
  Plus,
  Loader2,
  X,
  Layers
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { db } from "@/lib/db";
import { v4 as uuidv4 } from "uuid";
import { motion, AnimatePresence } from "framer-motion";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface BulkImportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function BulkImportModal({ isOpen, onClose }: BulkImportModalProps) {
  const [step, setStep] = useState(1);
  const [rawText, setRawText] = useState("");
  const [processedProducts, setProcessedProducts] = useState<any[]>([]);
  const [isProcessing, setIsLoading] = useState(false);

  // Step 1: Parse Raw Text
  const handleParseData = () => {
    if (!rawText.trim()) return toast.error("Paste some data first!");
    
    // Simple parsing logic: Item Name, Category, Qty, MRP
    const lines = rawText.split('\n').filter(l => l.trim().length > 0);
    const parsed = lines.map(line => {
      const parts = line.split(',').map(p => p.trim());
      return {
        id: uuidv4(),
        name: parts[0] || "New Product",
        category: parts[1] || "Kitchen Ware",
        qty: parseInt(parts[2]) || 0,
        mrp: parseInt(parts[3]) || 0,
        msp: parseInt(parts[4]) || Math.round((parseInt(parts[3]) || 0) * 0.8),
        image: null,
        variants: [{ id: uuidv4(), size: "Standard", stock: parseInt(parts[2]) || 0, mrp: parseInt(parts[3]) || 0 }]
      };
    });

    setProcessedProducts(parsed);
    setStep(2);
    toast.success(`Identified ${parsed.length} items`);
  };

  const updateProductImage = (id: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setProcessedProducts(prev => prev.map(p => p.id === id ? { ...p, image: url } : p));
    }
  };

  const handleFinalAdd = async () => {
    setIsLoading(true);
    try {
      const now = new Date().toISOString();
      await db.transaction('rw', db.products, db.variants, async () => {
        for (const p of processedProducts) {
          await db.products.add({
            id: p.id,
            name: p.name,
            category: p.category,
            image_url: p.image,
            created_at: now,
            updated_at: now,
            is_deleted: 0
          });

          await db.variants.add({
            id: uuidv4(),
            product_id: p.id,
            size: "Standard",
            stock: p.qty,
            dented_stock: 0,
            cost_price: p.msp,
            msp: p.msp,
            base_price: p.mrp,
            created_at: now,
            updated_at: now,
            is_deleted: 0
          });
        }
      });
      toast.success("All products added to inventory!");
      onClose();
      reset();
    } catch (err) {
      toast.error("Database error");
    } finally {
      setIsLoading(false);
    }
  };

  const reset = () => {
    setStep(1);
    setRawText("");
    setProcessedProducts([]);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[800px] h-[85dvh] rounded-[2.5rem] border-none shadow-2xl bg-zinc-50/95 backdrop-blur-3xl p-0 overflow-hidden flex flex-col">
        <DialogHeader className="p-8 bg-zinc-900 text-white shrink-0">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500 rounded-xl shadow-lg shadow-blue-500/30">
                <Layers className="h-6 w-6" />
              </div>
              <div>
                <DialogTitle className="text-2xl font-black uppercase tracking-tight">Bulk Import</DialogTitle>
                <p className="text-zinc-400 text-xs font-bold uppercase tracking-widest mt-1">Step {step} of 3</p>
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full text-zinc-500 hover:text-white"><X /></Button>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-8 bg-zinc-50/50">
          <AnimatePresence mode="wait">
            
            {/* STEP 1: RAW INPUT */}
            {step === 1 && (
              <motion.div key="step1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6 h-full flex flex-col">
                <div className="bg-blue-50 p-4 rounded-2xl border border-blue-100 flex gap-4">
                  <AlertCircle className="h-6 w-6 text-blue-600 shrink-0" />
                  <div className="text-sm">
                    <p className="font-black text-blue-900 uppercase tracking-tighter">Instructions:</p>
                    <p className="text-blue-700 font-medium">Enter items as: <span className="font-black text-blue-900">Name, Category, Quantity, MRP, MSP</span> (one per line).</p>
                  </div>
                </div>
                <Textarea 
                  placeholder="Example:&#10;Diamond Bucket, Buckets, 50, 250, 180&#10;Steel Plate, Plates, 100, 80, 65"
                  className="flex-1 min-h-[300px] rounded-3xl border-zinc-200 bg-white p-6 font-mono text-sm shadow-inner focus-visible:ring-zinc-900"
                  value={rawText}
                  onChange={e => setRawText(e.target.value)}
                />
                <Button onClick={handleParseData} className="w-full h-16 rounded-2xl bg-zinc-900 text-white font-black uppercase tracking-widest shadow-2xl">
                  Identify Products <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </motion.div>
            )}

            {/* STEP 2: SETUP CARDS */}
            {step === 2 && (
              <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {processedProducts.map((p) => (
                    <div key={p.id} className="bg-white border border-zinc-100 p-5 rounded-3xl shadow-xl flex gap-5 relative overflow-hidden group">
                      <div className="w-24 h-24 bg-zinc-50 rounded-2xl overflow-hidden relative shrink-0 border-2 border-dashed border-zinc-200">
                        {p.image ? (
                          <img src={p.image} className="w-full h-full object-cover" alt="preview" />
                        ) : (
                          <div className="h-full flex items-center justify-center text-zinc-300">
                            <Camera className="h-8 w-8" />
                          </div>
                        )}
                        <input type="file" accept="image/*" className="absolute inset-0 opacity-0 cursor-pointer" onChange={(e) => updateProductImage(p.id, e)} />
                      </div>
                      <div className="flex-1 space-y-2">
                        <div className="font-black text-zinc-900 uppercase italic tracking-tight truncate">{p.name}</div>
                        <div className="flex gap-2">
                          <Badge className="bg-zinc-100 text-zinc-500 rounded-lg text-[9px] font-black uppercase tracking-widest">{p.category}</Badge>
                          <Badge className="bg-emerald-50 text-emerald-700 rounded-lg text-[9px] font-black uppercase tracking-widest">{p.qty} PCS</Badge>
                        </div>
                        <div className="pt-2 flex justify-between items-end border-t border-zinc-50 mt-2">
                          <div>
                            <span className="text-[8px] font-black text-zinc-400 block uppercase">MRP</span>
                            <span className="font-black text-zinc-900 text-sm">₹{p.mrp}</span>
                          </div>
                          <div className="text-right">
                            <span className="text-[8px] font-black text-zinc-400 block uppercase">MSP</span>
                            <span className="font-black text-red-600 text-sm">₹{p.msp}</span>
                          </div>
                        </div>
                      </div>
                      <button className="absolute top-2 right-2 p-2 text-zinc-200 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
                <div className="flex gap-4 pt-6">
                  <Button variant="outline" onClick={() => setStep(1)} className="flex-1 h-16 rounded-2xl font-black uppercase tracking-widest border-2">Back</Button>
                  <Button onClick={() => setStep(3)} className="flex-2 w-[60%] h-16 rounded-2xl bg-zinc-900 text-white font-black uppercase tracking-widest shadow-2xl">
                    Final Review <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </div>
              </motion.div>
            )}

            {/* STEP 3: FINAL REVIEW */}
            {step === 3 && (
              <motion.div key="step3" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="space-y-8 flex flex-col items-center justify-center py-10 text-center">
                <div className="p-6 bg-emerald-50 rounded-full border-4 border-emerald-100 shadow-2xl shadow-emerald-500/20">
                  <CheckCircle2 className="h-16 w-16 text-emerald-600" />
                </div>
                <div>
                  <h3 className="text-3xl font-black text-zinc-900 uppercase italic tracking-tighter">Ready to Import?</h3>
                  <p className="text-zinc-500 font-medium mt-2">You are about to add {processedProducts.length} new items to Joy Ram Steel inventory.</p>
                </div>
                
                <div className="bg-white border border-zinc-100 p-8 rounded-[2.5rem] shadow-2xl w-full grid grid-cols-3 gap-6">
                   <div className="text-center">
                      <div className="text-2xl font-black text-zinc-900">{processedProducts.length}</div>
                      <div className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mt-1">Products</div>
                   </div>
                   <div className="text-center border-x border-zinc-100">
                      <div className="text-2xl font-black text-zinc-900">{processedProducts.reduce((acc,curr)=>acc+curr.qty, 0)}</div>
                      <div className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mt-1">Total Stock</div>
                   </div>
                   <div className="text-center">
                      <div className="text-2xl font-black text-zinc-900">₹{processedProducts.reduce((acc,curr)=>acc+(curr.qty*curr.mrp), 0).toLocaleString()}</div>
                      <div className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mt-1">Total Value</div>
                   </div>
                </div>

                <div className="flex gap-4 w-full pt-6">
                  <Button variant="outline" disabled={isProcessing} onClick={() => setStep(2)} className="flex-1 h-20 rounded-3xl font-black uppercase tracking-widest border-2">Cancel</Button>
                  <Button onClick={handleFinalAdd} disabled={isProcessing} className="flex-2 w-[70%] h-20 rounded-3xl bg-zinc-900 text-white font-black uppercase tracking-[0.2em] shadow-2xl shadow-zinc-900/40 active:scale-95 transition-all">
                    {isProcessing ? <Loader2 className="h-6 w-6 animate-spin" /> : "ADD TO INVENTORY"}
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </DialogContent>
    </Dialog>
  );
}
