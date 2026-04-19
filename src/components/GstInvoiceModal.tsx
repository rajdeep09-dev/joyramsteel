"use client";

import React, { useRef, useState } from "react";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { 
  Printer, 
  Download, 
  Image as ImageIcon, 
  FileText, 
  Plus,
  Trash2,
  X,
  Layout
} from "lucide-react";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ProductSearch } from "@/components/ProductSearch";
import { toPng } from "html-to-image";
import jsPDF from "jspdf";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";

interface GstInvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialItems?: any[];
  initialReceiver?: any;
}

export function GstInvoiceModal({ isOpen, onClose, initialItems, initialReceiver }: GstInvoiceModalProps) {
  const invoiceRef = useRef<HTMLDivElement>(null);
  const [items, setItems] = useState([{ desc: "", hsn: "7323", qty: "1", finalRate: "", gstRate: "18", taxableValue: 0, cgst: 0, sgst: 0, total: 0 }]);
  const [receiver, setReceiver] = useState({ name: "", address: "", gstin: "" });
  const [invoiceDetails, setInvoiceDetails] = useState({ no: "", date: new Date().toISOString().split('T')[0] });

  // Pre-fill from POS if provided
  React.useEffect(() => {
    if (isOpen && initialItems && initialItems.length > 0) {
      const formatted = initialItems.map(item => {
        const rate = item.base_price;
        const taxable = rate / 1.18;
        return {
          desc: `${item.productName} - ${item.size}`.toUpperCase(),
          hsn: "7323",
          qty: item.qty.toString(),
          finalRate: rate.toString(),
          gstRate: "18",
          taxableValue: parseFloat((taxable * item.qty).toFixed(2)),
          cgst: parseFloat((((rate - taxable) * item.qty) / 2).toFixed(2)),
          sgst: parseFloat((((rate - taxable) * item.qty) / 2).toFixed(2)),
          total: rate * item.qty
        };
      });
      setItems(formatted);
    }
  }, [isOpen, initialItems]);

  // Catalog for dropdown
  const catalog = useLiveQuery(async () => {
    const products = await db.products.toArray();
    const variants = await db.variants.toArray();
    return variants.map(v => {
      const p = products.find(prod => prod.id === v.product_id);
      return { ...v, productName: p?.name || "Unknown", size: v.size };
    });
  }, []);

  const addItem = (p?: any) => {
    const newItem = {
      desc: p ? `${p.productName} - ${p.size}`.toUpperCase() : "",
      hsn: "7323",
      qty: "1",
      finalRate: p ? p.base_price.toString() : "",
      gstRate: "18",
      taxableValue: 0, cgst: 0, sgst: 0, total: 0
    };
    if (p) {
      const taxable = p.base_price / 1.18;
      newItem.taxableValue = parseFloat(taxable.toFixed(2));
      newItem.cgst = parseFloat(((p.base_price - taxable) / 2).toFixed(2));
      newItem.sgst = parseFloat(((p.base_price - taxable) / 2).toFixed(2));
      newItem.total = p.base_price;
    }
    setItems([...items, newItem]);
  };

  const updateItem = (index: number, field: string, value: string) => {
    const newItems = [...items];
    (newItems[index] as any)[field] = value;
    const q = parseFloat(newItems[index].qty) || 0;
    const r = parseFloat(newItems[index].finalRate) || 0;
    const g = parseFloat(newItems[index].gstRate) || 18;
    const tot = q * r;
    if (tot > 0) {
      const tax = tot / (1 + (g / 100));
      newItems[index].taxableValue = parseFloat(tax.toFixed(2));
      newItems[index].cgst = parseFloat(((tot - tax) / 2).toFixed(2));
      newItems[index].sgst = parseFloat(((tot - tax) / 2).toFixed(2));
      newItems[index].total = tot;
    }
    setItems(newItems);
  };

  const totalTaxable = items.reduce((a, b) => a + b.taxableValue, 0);
  const totalCgst = items.reduce((a, b) => a + b.cgst, 0);
  const totalSgst = items.reduce((a, b) => a + b.sgst, 0);
  const grandTotal = items.reduce((a, b) => a + b.total, 0);

  const exportDoc = async (type: 'pdf' | 'img') => {
    if (!invoiceRef.current) return;
    toast.info("Generating...");
    try {
      const url = await toPng(invoiceRef.current, { pixelRatio: 2, quality: 0.8, backgroundColor: '#ffffff' });
      if (type === 'img') {
        const a = document.createElement('a'); a.download = `JoyRam-GST.png`; a.href = url; a.click();
      } else {
        const pdf = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });
        pdf.addImage(url, 'JPEG', 0, 0, 210, 297); pdf.save(`JoyRam-GST.pdf`);
      }
      toast.success("Success");
    } catch { toast.error("Failed"); }
  };

  return (
    <Dialog open={isOpen} onOpenChange={open => !open && onClose()}>
      <DialogContent fullScreen className="bg-zinc-950">
        
        {/* MOBILE: Tabs */}
        <div className="md:hidden flex flex-col h-full w-full overflow-hidden">
          <Tabs defaultValue="edit" className="flex-1 flex flex-col h-full overflow-hidden">
            <TabsList className="grid grid-cols-2 h-16 bg-zinc-900/50 border-b border-white/10 p-2 shrink-0">
              <TabsTrigger value="edit" className="rounded-xl font-black text-[10px] uppercase tracking-widest">1. Data</TabsTrigger>
              <TabsTrigger value="preview" className="rounded-xl font-black text-[10px] uppercase tracking-widest">2. View</TabsTrigger>
            </TabsList>
            <TabsContent value="edit" className="flex-1 overflow-y-auto bg-white m-0 p-6 pb-32">
              <FormContent receiver={receiver} setReceiver={setReceiver} invoiceDetails={invoiceDetails} setInvoiceDetails={setInvoiceDetails} items={items} addItem={addItem} updateItem={updateItem} removeItem={(i:number)=>setItems(items.filter((_,idx)=>idx!==i))} catalog={catalog} onClose={onClose} exportDoc={exportDoc} />
            </TabsContent>
            <TabsContent value="preview" className="flex-1 overflow-auto bg-zinc-950 flex items-start justify-center p-4 m-0 scrollbar-hide">
              <div className="origin-top transform-gpu scale-[0.42] transition-all">
                <PreviewContent ref={invoiceRef} receiver={receiver} invoiceDetails={invoiceDetails} items={items} totalTaxable={totalTaxable} totalCgst={totalCgst} totalSgst={totalSgst} grandTotal={grandTotal} />
              </div>
            </TabsContent>
          </Tabs>
        </div>

        {/* DESKTOP: Side-by-Side */}
        <div className="hidden md:flex flex-row h-full w-full overflow-hidden bg-zinc-950">
          <div className="w-[500px] h-full bg-white shrink-0 border-r border-zinc-200 overflow-y-auto p-10 scrollbar-hide">
             <FormContent receiver={receiver} setReceiver={setReceiver} invoiceDetails={invoiceDetails} setInvoiceDetails={setInvoiceDetails} items={items} addItem={addItem} updateItem={updateItem} removeItem={(i:number)=>setItems(items.filter((_,idx)=>idx!==i))} catalog={catalog} onClose={onClose} exportDoc={exportDoc} />
          </div>
          <div className="flex-1 h-full overflow-auto p-20 flex items-start justify-center scrollbar-hide">
             <div className="origin-top transform-gpu scale-[0.8] lg:scale-[0.9] xl:scale-100 transition-all">
                <PreviewContent ref={invoiceRef} receiver={receiver} invoiceDetails={invoiceDetails} items={items} totalTaxable={totalTaxable} totalCgst={totalCgst} totalSgst={totalSgst} grandTotal={grandTotal} />
             </div>
          </div>
        </div>

      </DialogContent>
    </Dialog>
  );
}

function FormContent({ receiver, setReceiver, invoiceDetails, setInvoiceDetails, items, addItem, updateItem, removeItem, catalog, onClose, exportDoc }: any) {
  return (
    <div className="flex flex-col gap-10">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-2xl bg-zinc-900 text-white flex items-center justify-center font-black italic shadow-xl">G</div>
          <div><h2 className="text-3xl font-black italic tracking-tighter uppercase leading-none">GST GEN</h2><p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mt-1">Professional Biller</p></div>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full h-12 w-12"><X className="h-6 w-6 text-zinc-400" /></Button>
      </div>

      <div className="space-y-6">
        <div className="space-y-3"><Label className="text-[10px] font-black uppercase text-zinc-400 tracking-widest pl-1">Billed To</Label>
          <Input value={receiver.name} onChange={e=>setReceiver({...receiver, name:e.target.value})} placeholder="Customer Name" className="h-14 rounded-2xl bg-zinc-50 border-zinc-100 font-black text-base shadow-inner uppercase" />
          <Input value={receiver.address} onChange={e=>setReceiver({...receiver, address:e.target.value})} placeholder="Address" className="h-14 rounded-2xl bg-zinc-50 border-zinc-100 font-bold text-sm shadow-inner uppercase" />
          <Input value={receiver.gstin} onChange={e=>setReceiver({...receiver, gstin:e.target.value})} placeholder="Receiver GSTIN" className="h-14 rounded-2xl bg-zinc-50 border-zinc-100 font-black text-base shadow-inner uppercase" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2"><Label className="text-[10px] font-black uppercase text-zinc-400 pl-1">Invoice No</Label><Input value={invoiceDetails.no} onChange={e=>setInvoiceDetails({...invoiceDetails, no:e.target.value})} placeholder="No." className="h-14 rounded-2xl bg-zinc-50 border-zinc-100 font-black text-center uppercase" /></div>
          <div className="space-y-2"><Label className="text-[10px] font-black uppercase text-zinc-400 pl-1">Date</Label><Input type="date" value={invoiceDetails.date} onChange={e=>setInvoiceDetails({...invoiceDetails, date:e.target.value})} className="h-14 rounded-2xl bg-zinc-50 border-zinc-100 font-bold" /></div>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex justify-between items-center px-1">
          <Label className="text-[10px] font-black uppercase text-zinc-400 tracking-widest">Inventory List</Label>
          <DropdownMenu>
            <DropdownMenuTrigger render={
              <Button variant="link" className="h-auto p-0 text-[10px] font-black text-blue-600 uppercase flex items-center gap-1">
                <Layout className="h-3 w-3" /> Quick Dropdown
              </Button>
            } />
            <DropdownMenuContent className="max-h-[400px] overflow-y-auto rounded-[2rem] p-3 min-w-[300px] shadow-[0_40px_80px_rgba(0,0,0,0.2)] border-zinc-100 bg-white z-[6000]">
              <div className="p-3 border-b border-zinc-50 mb-2"><p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Select Product</p></div>
              {catalog?.map((p: any) => (
                <DropdownMenuItem key={p.id} onClick={() => addItem(p)} className="rounded-2xl h-14 font-black text-xs flex justify-between cursor-pointer hover:bg-zinc-50 px-4">
                  <span className="truncate">{p.productName} ({p.size})</span> <span className="text-emerald-600 shrink-0">₹{p.base_price}</span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <div className="flex gap-2">
          <ProductSearch onSelect={addItem} className="flex-1" placeholder="Type to search..." />
          <Button onClick={()=>addItem()} variant="outline" size="icon" className="h-14 w-14 rounded-2xl border-2 border-zinc-100 bg-zinc-50 hover:bg-white"><Plus className="h-6 w-6" /></Button>
        </div>
        <div className="space-y-4">
          {items.map((item: any, idx: number) => (
            <div key={idx} className="bg-zinc-50/50 p-6 rounded-[2.5rem] border border-zinc-100 space-y-4 relative group shadow-sm hover:shadow-md transition-all">
              <Input value={item.desc} onChange={e=>updateItem(idx, 'desc', e.target.value)} placeholder="Item Name" className="h-12 bg-white border-zinc-200 font-black text-sm rounded-2xl shadow-sm uppercase" />
              <div className="grid grid-cols-4 gap-3">
                <div className="space-y-1"><span className="text-[8px] font-black text-zinc-400 block uppercase pl-2">HSN</span><Input value={item.hsn} onChange={e=>updateItem(idx,'hsn',e.target.value)} className="h-10 bg-white border-zinc-200 text-xs rounded-xl font-bold" /></div>
                <div className="space-y-1"><span className="text-[8px] font-black text-zinc-400 block uppercase pl-2">Qty</span><Input type="number" value={item.qty} onChange={e=>updateItem(idx,'qty',e.target.value)} className="h-10 bg-white border-zinc-200 text-xs rounded-xl font-black" /></div>
                <div className="space-y-1"><span className="text-[8px] font-black text-zinc-400 block uppercase pl-2">Rate</span><Input type="number" value={item.finalRate} onChange={e=>updateItem(idx,'finalRate',e.target.value)} className="h-10 bg-white border-zinc-200 text-xs rounded-xl font-black text-blue-600" /></div>
                <div className="space-y-1"><span className="text-[8px] font-black text-zinc-400 block uppercase pl-2">Gst%</span><Input type="number" value={item.gstRate} onChange={e=>updateItem(idx,'gstRate',e.target.value)} className="h-10 bg-white border-zinc-200 text-xs rounded-xl font-black text-green-600" /></div>
              </div>
              <Button onClick={()=>removeItem(idx)} variant="ghost" size="icon" className="absolute -top-3 -right-2 bg-white shadow-xl rounded-full h-10 w-10 text-red-500 border border-zinc-100 transition-all opacity-0 group-hover:opacity-100"><Trash2 className="h-4 w-4" /></Button>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-auto grid grid-cols-2 gap-4 pb-10">
        <Button onClick={()=>window.print()} variant="outline" className="h-20 rounded-[1.5rem] border-2 border-zinc-100 font-black tracking-widest text-[10px] uppercase"><Printer className="h-6 w-6 mr-3 text-zinc-400" /> Print</Button>
        <DropdownMenu>
          <DropdownMenuTrigger render={
            <Button className="h-20 rounded-[1.5rem] bg-zinc-900 text-white font-black tracking-widest text-[10px] shadow-2xl uppercase">
              <Download className="h-6 w-6 mr-3" /> Export
            </Button>
          } />
          <DropdownMenuContent className="rounded-[1.5rem] p-3 shadow-2xl min-w-[220px] bg-white/95 backdrop-blur-3xl z-[6000]">
             <DropdownMenuItem onClick={()=>exportDoc('img')} className="rounded-xl h-16 flex gap-4 font-black text-[10px] uppercase cursor-pointer hover:bg-zinc-50"><ImageIcon className="h-6 w-6 text-blue-600" /> Image</DropdownMenuItem>
             <DropdownMenuItem onClick={()=>exportDoc('pdf')} className="rounded-xl h-16 flex gap-4 font-black text-[10px] uppercase cursor-pointer hover:bg-zinc-50"><FileText className="h-6 w-6 text-red-600" /> PDF</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}

const PreviewContent = React.forwardRef(({ receiver, invoiceDetails, items, totalTaxable, totalCgst, totalSgst, grandTotal }: any, ref: any) => {
  return (
    <div ref={ref} className="bg-white shadow-[0_60px_150px_rgba(0,0,0,0.6)] flex flex-col p-[15mm] text-black shrink-0" style={{ width: '210mm', minHeight: '297mm', fontFamily: "'Times New Roman', serif" }}>
      <div className="flex justify-between items-start mb-6 text-[10.5pt]">
        <div className="font-bold tracking-tight">GSTIN : 16ENCPD2885R1ZE</div>
        <div className="font-bold border-b-2 border-black px-8 pb-0.5 text-[12pt] tracking-widest uppercase">TAX INVOICE</div>
        <div className="text-[9pt] border-2 border-black p-2 space-y-1.5 font-bold min-w-[140px]">
          <div className="flex items-center gap-2"><div className="w-3.5 h-3.5 border-2 border-black rounded-sm" /><span>Original Copy</span></div>
          <div className="flex items-center gap-2"><div className="w-3.5 h-3.5 border-2 border-black rounded-sm" /><span>Duplicate Copy</span></div>
          <div className="flex items-center gap-2"><div className="w-3.5 h-3.5 border-2 border-black rounded-sm" /><span>Triplicate Copy</span></div>
        </div>
      </div>
      <div className="text-center mb-10 mt-4">
        <h1 className="text-[48pt] font-black tracking-tighter uppercase italic leading-[0.9] inline-block">JOY RAM STEEL</h1>
        <p className="text-[13pt] font-bold mt-3 tracking-wide">Dhajanagar, Udaipur, Gomati Tripura, Pin - 799114</p>
      </div>
      <div className="flex justify-between mb-8 border-t-2 border-black pt-5 text-[11pt] leading-relaxed text-left">
        <div className="flex-1 space-y-2.5">
          <div className="font-bold uppercase underline tracking-wider">Details of Receiver :</div>
          <div className="flex gap-2"><span>M/s.</span> <span className="font-black text-[13pt] uppercase">{receiver.name || "_________________________________"}</span></div>
          <div className="flex gap-2"><span>Address :</span> <span className="font-bold italic flex-1 uppercase">{receiver.address || "______________________________________________________"}</span></div>
          <div className="flex gap-2 mt-4"><span>GSTIN / Unique ID :</span> <span className="font-black uppercase tracking-widest text-[12pt]">{receiver.gstin || "____________________"}</span></div>
        </div>
        <div className="w-[75mm] space-y-3 pl-6 border-l-2 border-black">
          <div className="flex justify-between items-center"><span>Invoice No. :</span> <span className="font-black text-[12pt] uppercase">{invoiceDetails.no || "N/A"}</span></div>
          <div className="flex justify-between items-center border-b border-zinc-300 pb-1"><span>Date :</span> <span className="font-black text-[12pt]">{invoiceDetails.date ? new Date(invoiceDetails.date).toLocaleDateString('en-GB') : ""}</span></div>
        </div>
      </div>
      <table className="w-full border-collapse border-2 border-black mb-8 text-[11pt]">
        <thead><tr className="border-b-2 border-black font-black uppercase bg-zinc-50 text-[10pt]"><th className="border-r-2 border-black py-2 w-[12mm]">Sl.</th><th className="border-r-2 border-black py-2 text-left px-4">Description of Goods</th><th className="border-r-2 border-black py-2 w-[25mm]">HSN</th><th className="border-r-2 border-black py-2 w-[30mm]">Qty</th><th className="border-r-2 border-black py-2 w-[28mm]">Rate</th><th className="py-2 w-[40mm]">Amount Rs.</th></tr></thead>
        <tbody className="font-bold uppercase">
          {items.map((item: any, i: number) => (
            <tr key={i} className="border-b border-zinc-200 h-[10mm] text-center italic">
              <td className="border-r-2 border-black">{i+1}</td>
              <td className="border-r-2 border-black text-left px-4 font-black uppercase not-italic text-[10.5pt]">{item.desc}</td>
              <td className="border-r-2 border-black">{item.hsn}</td>
              <td className="border-r-2 border-black">{item.qty} PCS</td>
              <td className="border-r-2 border-black">{item.taxableValue > 0 ? (item.taxableValue / (parseFloat(item.qty)||1)).toFixed(2) : ""}</td>
              <td className="text-right pr-2 text-[12pt] font-black">{item.taxableValue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
            </tr>
          ))}
          {[...Array(Math.max(0, 10 - items.length))].map((_, i) => (
            <tr key={`empty-${i}`} className="border-b border-zinc-100 h-[10mm]"><td className="border-r-2 border-black"></td><td className="border-r-2 border-black"></td><td className="border-r-2 border-black"></td><td className="border-r-2 border-black"></td><td className="border-r-2 border-black"></td><td></td></tr>
          ))}
        </tbody>
      </table>
      <div className="flex gap-8 mt-auto pt-4 text-right font-black uppercase">
        <div className="flex-1"><table className="w-full border-2 border-black text-[9.5pt]"><thead><tr className="border-b-2 border-black bg-zinc-50"><th>HSN</th><th>Taxable</th><th>Rate</th><th>CGST</th><th>SGST</th><th>IGST</th></tr></thead><tbody><tr className="h-[10mm] font-black"><td className="border-r-2 border-black">-</td><td className="border-r-2 border-black pr-2">{totalTaxable.toLocaleString('en-IN')}</td><td className="border-r-2 border-black text-center">18%</td><td className="border-r-2 border-black pr-2">{totalCgst.toLocaleString('en-IN')}</td><td className="border-r-2 border-black pr-2">{totalSgst.toLocaleString('en-IN')}</td><td className="pr-2">0.00</td></tr></tbody></table></div>
        <div className="w-[80mm] border-2 border-black p-5 space-y-3 bg-zinc-50/50">
          <div className="flex justify-between"><span>Total Taxable</span> <span>₹{totalTaxable.toLocaleString('en-IN')}</span></div>
          <div className="flex justify-between border-b-2 border-black pb-3"><span>CGST + SGST</span> <span>₹{(totalCgst+totalSgst).toLocaleString('en-IN')}</span></div>
          <div className="flex justify-between pt-3 text-[18pt] text-blue-800 underline underline-offset-8"><span>GRAND TOTAL</span> <span>₹{grandTotal.toLocaleString('en-IN')}</span></div>
        </div>
      </div>
    </div>
  );
});
PreviewContent.displayName = "PreviewContent";
