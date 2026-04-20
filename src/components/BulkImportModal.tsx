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
  Layers,
  Settings2
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { db } from "@/lib/db";
import { v4 as uuidv4 } from "uuid";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

interface BulkImportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function BulkImportModal({ isOpen, onClose }: BulkImportModalProps) {
  const [step, setStep] = useState(1);
  const [rawText, setRawText] = useState("");
  const [processedProducts, setProcessedProducts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Step 1: Parse Raw Text
  const handleParseData = () => {
    if (!rawText.trim()) return toast.error("Paste some data first!");
    
    // Improved parsing: Name, Category, Qty, MRP, MSP, Unit (comma separated)
    const lines = rawText.split('\n').filter(l => l.trim().length > 0);
    const parsed = lines.map(line => {
      // Handle both comma and tab separation
      const parts = line.includes('\t') ? line.split('\t').map(p => p.trim()) : line.split(',').map(p => p.trim());
      
      const qty = parseFloat(parts[2]) || 0;
      const mrp = parseFloat(parts[3]) || 0;
      const msp = parseFloat(parts[4]) || Math.round(mrp * 0.8);
      const unit = (parts[5]?.toLowerCase() === 'kg' ? 'kg' : 'pcs') as 'pcs' | 'kg';

      return {
        id: uuidv4(),
        name: parts[0] || "New Product",
        category: parts[1] || "Kitchen Ware",
        qty,
        mrp,
        msp,
        unit,
        image: null
      };
    });

    setProcessedProducts(parsed);
    setStep(2);
    toast.success(`Identified ${parsed.length} items`);
  };

  const updateItemField = (id: string, field: string, value: any) => {
    setProcessedProducts(prev => prev.map(p => p.id === id ? { ...p, [field]: value } : p));
  };

  const handleFinalAdd = async () => {
    setIsLoading(true);
    try {
      const now = new Date().toISOString();
      await db.transaction('rw', db.products, db.variants, async () => {
        for (const p of processedProducts) {
          const productId = uuidv4();
          await db.products.add({
            id: productId,
            name: p.name.toUpperCase(),
            category: p.category.toUpperCase(),
            image_url: p.image,
            created_at: now,
            updated_at: now,
            is_deleted: 0,
            sync_status: 'pending'
          });

          await db.variants.add({
            id: uuidv4(),
            product_id: productId,
            size: "Standard",
            unit: p.unit,
            stock: p.qty,
            dented_stock: 0,
            cost_price: p.msp,
            msp: p.msp,
            base_price: p.mrp,
            created_at: now,
            updated_at: now,
            is_deleted: 0,
            sync_status: 'pending'
          });
        }
      });
      toast.success(`${processedProducts.length} items added to sync queue`);
      onClose();
      reset();
    } catch (err) {
      console.error(err);
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
      <DialogContent className="sm:max-w-[800px] h-[85dvh] rounded-[2.5rem] border-none shadow-2xl bg-zinc-50/95 backdrop-blur-3xl p-0 overflow-hidden flex flex-col text-left">
        <DialogHeader className="p-8 bg-zinc-900 text-white shrink-0">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500 rounded-xl shadow-lg shadow-blue-500/30">
                <Layers className="h-6 w-6" />
              </div>
              <div>
                <DialogTitle className="text-2xl font-black uppercase tracking-tight text-white">Bulk Importer</DialogTitle>
                <p className="text-zinc-400 text-xs font-bold uppercase tracking-widest mt-1">Step {step} of 3</p>
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full text-zinc-500 hover:text-white"><X /></Button>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-8 bg-zinc-50/50 scrollbar-hide">
          <AnimatePresence mode="wait">
            {step === 1 && (
              <motion.div key="step1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6 h-full flex flex-col">
                <div className="bg-blue-50 p-4 rounded-2xl border border-blue-100 flex gap-4">
                  <AlertCircle className="h-6 w-6 text-blue-600 shrink-0" />
                  <div className="text-sm text-left">
                    <p className="font-black text-blue-900 uppercase tracking-tighter">Instructions:</p>
                    <p className="text-blue-700 font-medium leading-tight">Name, Category, Qty, MRP, MSP, Unit (one per line).<br/>Example: <span className="font-mono text-zinc-900 bg-white/50 px-1">Plate, Steel, 100, 45, 35, pcs</span></p>
                  </div>
                </div>
                <Textarea 
                  placeholder="Paste from Excel or type manually..."
                  className="flex-1 min-h-[300px] rounded-3xl border-zinc-200 bg-white p-6 font-mono text-sm shadow-inner focus-visible:ring-zinc-900"
                  value={rawText}
                  onChange={e => setRawText(e.target.value)}
                />
                <Button onClick={handleParseData} className="w-full h-16 rounded-2xl bg-zinc-900 text-white font-black uppercase tracking-widest shadow-2xl active:scale-95 transition-all">
                  Process {rawText.split('\n').filter(l=>l.trim()).length} Items <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {processedProducts.map((p) => (
                    <div key={p.id} className="bg-white border border-zinc-100 p-5 rounded-3xl shadow-xl flex flex-col gap-4 relative overflow-hidden group hover:border-blue-200 transition-all">
                      <div className="flex gap-4">
                        <div className="w-16 h-16 bg-zinc-50 rounded-2xl overflow-hidden relative shrink-0 border-2 border-dashed border-zinc-200">
                          {p.image ? (
                            <img src={p.image} className="w-full h-full object-cover" alt="preview" />
                          ) : (
                            <div className="h-full flex items-center justify-center text-zinc-300">
                              <Camera className="h-5 w-5" />
                            </div>
                          )}
                          <input type="file" accept="image/*" className="absolute inset-0 opacity-0 cursor-pointer" onChange={(e) => {
                            const file = e.target.files?.[0];
                            if(file) updateItemField(p.id, 'image', URL.createObjectURL(file));
                          }} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <Input value={p.name} onChange={e=>updateItemField(p.id, 'name', e.target.value)} className="h-8 font-black text-zinc-900 uppercase italic tracking-tight border-none bg-transparent p-0 focus-visible:ring-0 shadow-none text-sm" />
                          <div className="flex gap-2 mt-1">
                             <Input value={p.category} onChange={e=>updateItemField(p.id, 'category', e.target.value)} className="h-5 w-20 bg-zinc-100 text-zinc-500 rounded-md text-[8px] font-black uppercase tracking-widest border-none px-1 focus-visible:ring-0 shadow-none" />
                             <Badge className="bg-emerald-50 text-emerald-700 rounded-md text-[8px] font-black uppercase tracking-widest px-1.5 h-5">{p.qty} {p.unit?.toUpperCase()}</Badge>
                          </div>
                        </div>
                        <button onClick={()=>setProcessedProducts(prev=>prev.filter(x=>x.id!==p.id))} className="text-zinc-200 hover:text-red-500 transition-colors shrink-0">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>

                      <div className="grid grid-cols-3 gap-2 pt-3 border-t border-zinc-50">
                        <div className="space-y-1"><span className="text-[7px] font-black text-zinc-400 block uppercase pl-1">Qty</span><Input type="number" value={p.qty} onChange={e=>updateItemField(p.id, 'qty', parseFloat(e.target.value))} className="h-8 bg-zinc-50 border-zinc-100 rounded-lg font-bold text-xs" /></div>
                        <div className="space-y-1">
                          <span className="text-[7px] font-black text-zinc-400 block uppercase pl-1">Unit</span>
                          <div className="grid grid-cols-2 gap-1 p-1 bg-zinc-100 rounded-lg h-8">
                             <Button variant="ghost" className={cn("rounded-md h-full font-black text-[8px] p-0", p.unit === 'pcs' ? "bg-white shadow-sm text-zinc-900" : "text-zinc-400")} onClick={()=>updateItemField(p.id, 'unit', 'pcs')}>PCS</Button>
                             <Button variant="ghost" className={cn("rounded-md h-full font-black text-[8px] p-0", p.unit === 'kg' ? "bg-white shadow-sm text-zinc-900" : "text-zinc-400")} onClick={()=>updateItemField(p.id, 'unit', 'kg')}>KG</Button>
                          </div>
                        </div>
                        <div className="space-y-1"><span className="text-[7px] font-black text-zinc-400 block uppercase pl-1">MRP (₹)</span><Input type="number" value={p.mrp} onChange={e=>updateItemField(p.id, 'mrp', parseFloat(e.target.value))} className="h-8 bg-zinc-50 border-zinc-100 rounded-lg font-black text-blue-600 text-xs" /></div>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="flex gap-4 pt-6 pb-12">
                  <Button variant="outline" onClick={() => setStep(1)} className="flex-1 h-16 rounded-2xl font-black uppercase tracking-widest border-2">Back</Button>
                  <Button onClick={() => setStep(3)} className="flex-[2] h-16 rounded-2xl bg-zinc-900 text-white font-black uppercase tracking-widest shadow-2xl">
                    Proceed to Review ({processedProducts.length}) <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </div>
              </motion.div>
            )}

            {step === 3 && (
              <motion.div key="step3" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="space-y-8 flex flex-col items-center justify-center py-10 text-center">
                <div className="p-6 bg-emerald-50 rounded-full border-4 border-emerald-100 shadow-2xl shadow-emerald-500/20">
                  <CheckCircle2 className="h-16 w-16 text-emerald-600" />
                </div>
                <div>
                  <h3 className="text-3xl font-black text-zinc-900 uppercase italic tracking-tighter">Ready to Import?</h3>
                  <p className="text-zinc-500 font-medium mt-2">All {processedProducts.length} items will be added to your cloud catalog.</p>
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
                  <Button variant="outline" disabled={isLoading} onClick={() => setStep(2)} className="flex-1 h-20 rounded-3xl font-black uppercase tracking-widest border-2">Edit More</Button>
                  <Button onClick={handleFinalAdd} disabled={isLoading} className="flex-[2] h-20 rounded-3xl bg-zinc-900 text-white font-black uppercase tracking-[0.2em] shadow-2xl shadow-zinc-900/40 active:scale-95 transition-all">
                    {isLoading ? <Loader2 className="h-6 w-6 animate-spin" /> : "IMPORT TO CLOUD"}
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
