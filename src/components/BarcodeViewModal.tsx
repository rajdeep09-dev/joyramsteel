"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ShieldCheck, Printer, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import Barcode from "react-barcode";

interface BarcodeViewModalProps {
  variant: any;
  isOpen: boolean;
  onClose: () => void;
}

/**
 * Enterprise Barcode Rendering Engine
 * Generates real Code128 scannable bars.
 */
export function BarcodeViewModal({ variant, isOpen, onClose }: BarcodeViewModalProps) {
  if (!variant) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[450px] rounded-[2.5rem] bg-white dark:bg-zinc-900 border-none shadow-2xl p-0 overflow-hidden">
        <div className="p-8 border-b border-zinc-100 dark:border-zinc-800 flex justify-between items-center bg-zinc-50/50 dark:bg-zinc-950/50">
          <DialogTitle className="text-2xl font-black italic uppercase tracking-tighter dark:text-white flex items-center gap-3">
             <ShieldCheck className="h-6 w-6 text-blue-600" /> Identity Portal
          </DialogTitle>
          <button onClick={onClose} className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full transition-colors">
            <X className="h-5 w-5 text-zinc-400" />
          </button>
        </div>
        
        <div className="p-10 flex flex-col items-center gap-8">
           <div className="text-center space-y-2">
              <h4 className="font-black text-2xl uppercase italic text-zinc-900 dark:text-white leading-tight">{variant.productName}</h4>
              <p className="text-xs font-bold text-zinc-400 uppercase tracking-[0.2em]">{variant.size} &bull; {variant.category}</p>
           </div>

           {/* REAL BARCODE GENERATOR */}
           <div className="w-full bg-white p-8 rounded-[2rem] shadow-2xl border border-zinc-100 flex flex-col items-center justify-center group hover:scale-[1.02] transition-transform duration-500">
              <div className="bg-zinc-50 p-6 rounded-xl border border-zinc-100 flex items-center justify-center w-full">
                <Barcode 
                  value={variant.barcode || "000000000000"} 
                  width={1.5}
                  height={80}
                  fontSize={14}
                  font="monospace"
                  background="transparent"
                  lineColor="#09090b"
                />
              </div>
              <p className="mt-6 text-[8px] font-black text-zinc-400 uppercase tracking-[0.4em] animate-pulse">Ready for Optical Scanning</p>
           </div>

           <div className="grid grid-cols-2 gap-4 w-full">
              <div className="flex flex-col gap-1">
                 <span className="text-[8px] font-black text-zinc-400 uppercase tracking-widest ml-1">STOCK STATUS</span>
                 <Badge variant="outline" className="h-12 justify-center rounded-xl font-black text-[10px] uppercase tracking-widest dark:text-white border-zinc-200 dark:border-zinc-700">
                    {variant.stock} {variant.unit?.toUpperCase() || 'PCS'} LEFT
                 </Badge>
              </div>
              <div className="flex flex-col gap-1">
                 <span className="text-[8px] font-black text-zinc-400 uppercase tracking-widest ml-1">PRICE VALUE</span>
                 <Badge className="h-12 justify-center rounded-xl font-black text-base italic border-none bg-zinc-900 text-white dark:bg-white dark:text-zinc-900">
                    ₹{variant.base_price.toLocaleString()}
                 </Badge>
              </div>
           </div>

           <Button 
             onClick={() => window.print()} 
             className="w-full h-16 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-black uppercase tracking-[0.2em] text-xs shadow-xl shadow-blue-600/20 active:scale-95 transition-all"
           >
              <Printer className="h-5 w-5 mr-3" /> PRINT ADHESIVE LABEL
           </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
