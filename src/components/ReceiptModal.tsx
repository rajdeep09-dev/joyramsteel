"use client";

import React, { useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { 
  Printer, 
  Download, 
  Image as ImageIcon, 
  FileText, 
  CheckCircle2,
  Phone,
  Mail,
  MapPin,
  MessageSquare,
  FileBadge
} from "lucide-react";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toPng } from "html-to-image";
import jsPDF from "jspdf";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { v4 as uuidv4 } from "uuid";

interface ReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  saleData: {
    id: string;
    total: number;
    discount: number;
    paymentMethod: string;
    date: string;
  };
  items: any[];
  onGenerateGst?: (items: any[]) => void;
}

export function ReceiptModal({ isOpen, onClose, saleData, items, onGenerateGst }: ReceiptModalProps) {
  const receiptRef = useRef<HTMLDivElement>(null);

  if (!isOpen || !saleData?.id) return null;

  const handleSendToWhatsApp = async () => {
    const phone = prompt("Enter Customer WhatsApp Number (with country code, e.g. 919876543210):");
    if (!phone) return;

    if (!receiptRef.current) return;
    toast.info("Preparing bill for sharing...");

    try {
      // 1. Generate Image
      const dataUrl = await toPng(receiptRef.current, { cacheBust: true, backgroundColor: '#ffffff' });
      
      // 2. Upload to Supabase temporary bucket
      const blob = await (await fetch(dataUrl)).blob();
      const fileName = `temp-receipts/${uuidv4()}.png`;
      const { data, error } = await supabase.storage.from('product-images').upload(fileName, blob);

      if (error) throw error;

      const { data: { publicUrl } } = supabase.storage.from('product-images').getPublicUrl(fileName);

      // 3. Open WhatsApp
      const text = encodeURIComponent(`Hello! Here is your bill from Joy Ram Steel for ₹${saleData.total}.\n\nView Bill: ${publicUrl}\n\nThank you!`);
      window.open(`https://wa.me/${phone.replace(/\+/g, '')}?text=${text}`, '_blank');
      toast.success("WhatsApp opened with bill link!");

    } catch (err) {
      console.error(err);
      toast.error("Failed to share via WhatsApp");
    }
  };

  const downloadAsImage = async () => {
    if (!receiptRef.current) return;
    try {
      const dataUrl = await toPng(receiptRef.current, { cacheBust: true, backgroundColor: '#ffffff' });
      const link = document.createElement('a');
      link.download = `JoyRamSteel-Bill-${saleData.id.slice(0, 8)}.png`;
      link.href = dataUrl;
      link.click();
      toast.success("Bill downloaded as Image");
    } catch (err) {
      toast.error("Failed to generate image");
    }
  };

  const downloadAsPDF = async () => {
    if (!receiptRef.current) return;
    try {
      const dataUrl = await toPng(receiptRef.current, { cacheBust: true, backgroundColor: '#ffffff' });
      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgProps = pdf.getImageProperties(dataUrl);
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
      pdf.addImage(dataUrl, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`JoyRamSteel-Bill-${saleData.id.slice(0, 8)}.pdf`);
      toast.success("Bill downloaded as PDF");
    } catch (err) {
      toast.error("Failed to generate PDF");
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const subtotal = items.reduce((acc, item) => acc + (item.base_price * item.qty), 0);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[500px] rounded-[2rem] border-none shadow-2xl bg-zinc-50/90 backdrop-blur-2xl p-0 overflow-hidden max-h-[90dvh] flex flex-col">
        <style dangerouslySetInnerHTML={{ __html: `
          @media print {
            body * { visibility: hidden; }
            #printable-receipt, #printable-receipt * { visibility: visible; }
            #printable-receipt { position: absolute; left: 0; top: 0; width: 100%; }
          }
        `}} />
        
        <DialogHeader className="p-6 bg-zinc-900 text-white">
          <div className="flex items-center gap-3">
            <div className="bg-emerald-500 p-2 rounded-xl">
              <CheckCircle2 className="h-5 w-5 text-white" />
            </div>
            <div>
              <DialogTitle className="text-xl font-black uppercase tracking-tight">Sale Successful</DialogTitle>
              <p className="text-zinc-400 text-xs font-bold uppercase tracking-widest mt-0.5">Bill Generated</p>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-6 flex flex-col items-center gap-6">
          {/* THE RECEIPT */}
          <div 
            ref={receiptRef} 
            id="printable-receipt"
            className="w-full bg-white border border-zinc-200 rounded-2xl shadow-xl p-8 text-zinc-900 font-medium"
          >
            {/* Header Branding */}
            <div className="text-center space-y-1 mb-8 border-b border-zinc-100 pb-6">
              <div className="mx-auto w-16 h-16 rounded-full overflow-hidden mb-3 border-2 border-zinc-50 shadow-md">
                <img src="/joyramlogo.png" alt="Logo" className="w-full h-full object-cover" />
              </div>
              <h2 className="text-3xl font-black tracking-tighter uppercase italic">Joy Ram Steel</h2>
              <p className="text-zinc-500 text-[10px] font-black uppercase tracking-[0.2em]">All types of Kitchen Ware</p>
              <div className="pt-3 space-y-0.5">
                <p className="text-[10px] font-bold text-zinc-400 flex items-center justify-center gap-1.5"><MapPin className="h-3 w-3" /> Dhajanagar, Udaipur, Tripura</p>
                <p className="text-[10px] font-bold text-zinc-400 flex items-center justify-center gap-1.5"><Phone className="h-3 w-3" /> 8837241225 / 9862743854</p>
                <p className="text-[10px] font-bold text-zinc-400 flex items-center justify-center gap-1.5"><Mail className="h-3 w-3" /> surajdebnath149@gmail.com</p>
              </div>
            </div>

            {/* Bill Info */}
            <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-6">
              <div>No: <span className="text-zinc-900">#{saleData.id.slice(0, 8)}</span></div>
              <div>Date: <span className="text-zinc-900">{new Date(saleData.date).toLocaleDateString()}</span></div>
            </div>

            {/* Items Table */}
            <table className="w-full mb-8">
              <thead className="border-b-2 border-zinc-900">
                <tr className="text-[10px] font-black uppercase tracking-widest text-zinc-400 text-left">
                  <th className="py-2">Item</th>
                  <th className="py-2 text-center">Qty</th>
                  <th className="py-2 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-50">
                {items.map((item, idx) => (
                  <tr key={idx} className="text-sm">
                    <td className="py-3">
                      <div className="font-black text-zinc-900 uppercase tracking-tight leading-none">{item.productName}</div>
                      <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mt-1">{item.size}</div>
                    </td>
                    <td className="py-3 text-center font-black">x{item.qty} {item.unit || 'pcs'}</td>
                    <td className="py-3 text-right font-black tracking-tighter text-zinc-900">₹{item.base_price * item.qty}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Totals */}
            <div className="space-y-2 border-t-2 border-zinc-900 pt-6">
              <div className="flex justify-between text-xs font-black uppercase tracking-widest text-zinc-400">
                <span>Subtotal</span>
                <span>₹{subtotal.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-xs font-black uppercase tracking-widest text-emerald-500">
                <span>Discount</span>
                <span>- ₹{saleData.discount.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-end pt-2">
                <span className="text-sm font-black uppercase tracking-widest">Total Amount</span>
                <span className="text-3xl font-black tracking-tighter">₹{saleData.total.toLocaleString()}</span>
              </div>
            </div>

            {/* Footer */}
            <div className="mt-10 pt-6 border-t border-dashed border-zinc-200 text-center">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">Thank you for shopping with us!</p>
              <div className="mt-4 flex justify-center">
                <div className="bg-zinc-100 p-2 rounded-lg">
                  {/* Mock QR Code for Digital Receipt */}
                  <div className="h-12 w-12 border-2 border-zinc-200 flex items-center justify-center">
                    <div className="h-8 w-8 bg-zinc-900" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Actions Footer */}
        <div className="p-6 bg-white border-t border-zinc-100 grid grid-cols-2 gap-3">
          <Button 
            variant="outline" 
            className="rounded-2xl h-14 font-black uppercase tracking-widest text-[10px] gap-2 border-zinc-200"
            onClick={handlePrint}
          >
            <Printer className="h-4 w-4" /> Print
          </Button>

          <Button 
            variant="outline" 
            className="rounded-2xl h-14 font-black uppercase tracking-widest text-[10px] gap-2 border-emerald-100 text-emerald-600 hover:bg-emerald-50"
            onClick={handleSendToWhatsApp}
          >
            <MessageSquare className="h-4 w-4" /> WhatsApp
          </Button>

          <Button 
            variant="outline" 
            className="rounded-2xl h-14 font-black uppercase tracking-widest text-[10px] gap-2 border-blue-100 text-blue-600 hover:bg-blue-50"
            onClick={() => onGenerateGst?.(items)}
          >
            <FileBadge className="h-4 w-4" /> Gen GST
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger render={<Button className="w-full rounded-2xl h-14 bg-zinc-900 hover:bg-black text-white font-black uppercase tracking-widest text-[10px] gap-2" />}>
              <Download className="h-4 w-4" /> Download
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="rounded-2xl border-none shadow-2xl p-2 bg-white/95 backdrop-blur-xl z-[6000]">
              <DropdownMenuItem onClick={downloadAsImage} className="rounded-xl h-12 flex gap-3 font-bold cursor-pointer">
                <ImageIcon className="h-4 w-4 text-blue-500" /> Save as Image
              </DropdownMenuItem>
              <DropdownMenuItem onClick={downloadAsPDF} className="rounded-xl h-12 flex gap-3 font-bold cursor-pointer">
                <FileText className="h-4 w-4 text-red-500" /> Save as PDF
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="p-4 bg-zinc-50 text-center">
          <button 
            onClick={onClose}
            className="text-[10px] font-black text-zinc-400 uppercase tracking-widest hover:text-zinc-900 transition-colors"
          >
            Close & New Sale
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
