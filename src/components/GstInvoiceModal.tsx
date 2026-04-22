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
  Layout,
  Settings2,
  Save
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
import { toJpeg } from "html-to-image";
import jsPDF from "jspdf";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import { v4 as uuidv4 } from "uuid";

interface GstInvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialItems?: any[];
  initialReceiver?: any;
  viewOnlyData?: any;
}

export function GstInvoiceModal({ isOpen, onClose, initialItems, initialReceiver, viewOnlyData }: GstInvoiceModalProps) {
  const invoiceRef = useRef<HTMLDivElement>(null);
  const [items, setItems] = useState([{ desc: "", hsn: "7323", qty: "1", unit: "pcs", finalRate: "", gstRate: "18", taxableValue: 0, cgst: 0, sgst: 0, total: 0 }]);
  const [receiver, setReceiver] = useState({ name: "", address: "", gstin: "" });
  const [invoiceDetails, setInvoiceDetails] = useState({ 
    no: `JR-${Math.floor(Math.random() * 10000)}`, 
    date: new Date().toISOString() 
  });
  
  const [shopDetails, setShopDetails] = useState({
    name: "JOY RAM STEEL",
    address: "Dhajanagar, Udaipur, Gomati Tripura, Pin - 799114",
    gstin: "16ENCPD2885R1ZE",
    totalInWords: "Rupees Only",
    igst: "0.00",
    summaryHsn: "-"
  });

  React.useEffect(() => {
    if (isOpen) {
      if (viewOnlyData) {
        setItems(viewOnlyData.items);
        setReceiver(viewOnlyData.receiver);
        setInvoiceDetails(viewOnlyData.invoiceDetails);
        setShopDetails(viewOnlyData.shopDetails);
      } else if (initialItems && initialItems.length > 0) {
        const formatted = initialItems.map(item => {
          // Intelligent Bundle Resolution
          const isBundle = item.pricing_type === 'bundle' && item.bundle_price && item.bundle_qty;
          
          // Force Qty to bundle_qty for combos, otherwise use original qty
          const effectiveQty = isBundle ? item.bundle_qty : item.qty;
          
          // Calculate per-unit rate to ensure (Rate * Qty) == Bundle Total
          const effectiveRate = isBundle 
            ? (item.bundle_price / item.bundle_qty) 
            : item.base_price;

          const taxable = effectiveRate / 1.18;
          const totalLine = effectiveRate * effectiveQty;
          
          return {
            desc: `${item.productName} - ${item.size}`.toUpperCase() + (isBundle ? ` (PACK OF ${item.bundle_qty})` : ""),
            hsn: "7323",
            qty: effectiveQty.toString(),
            unit: item.unit || 'pcs',
            finalRate: effectiveRate.toFixed(2),
            gstRate: "18",
            taxableValue: parseFloat((taxable * effectiveQty).toFixed(2)),
            cgst: parseFloat((((effectiveRate - taxable) * effectiveQty) / 2).toFixed(2)),
            sgst: parseFloat((((effectiveRate - taxable) * effectiveQty) / 2).toFixed(2)),
            total: parseFloat(totalLine.toFixed(2))
          };
        });
        setItems(formatted);
      }
    }
  }, [isOpen, initialItems, viewOnlyData]);

  const catalog = useLiveQuery(async () => {
    const products = await db.products.where('is_deleted').equals(0).toArray();
    const variants = await db.variants.where('is_deleted').equals(0).toArray();
    return variants.map(v => {
      const p = products.find(prod => prod.id === v.product_id);
      return { ...v, productName: p?.name || "Unknown", size: v.size };
    });
  }, []);

  const addItem = (p?: any) => {
    const isBundle = p?.pricing_type === 'bundle' && p?.bundle_price && p?.bundle_qty;
    const initialQty = isBundle ? p.bundle_qty : 1;
    const effectiveRate = isBundle ? (p.bundle_price / p.bundle_qty) : (p?.base_price || 0);

    const newItem = {
      desc: p ? `${p.productName} - ${p.size}`.toUpperCase() + (isBundle ? ` (PACK OF ${p.bundle_qty})` : "") : "",
      hsn: "7323",
      qty: initialQty.toString(),
      unit: p?.unit || 'pcs',
      finalRate: p ? effectiveRate.toFixed(2) : "",
      gstRate: "18",
      taxableValue: 0, cgst: 0, sgst: 0, total: 0
    };

    if (p) {
      const tot = initialQty * effectiveRate;
      const tax = tot / 1.18;
      newItem.taxableValue = parseFloat(tax.toFixed(2));
      newItem.cgst = parseFloat(((tot - tax) / 2).toFixed(2));
      newItem.sgst = parseFloat(((tot - tax) / 2).toFixed(2));
      newItem.total = parseFloat(tot.toFixed(2));
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

  const saveToHistory = async () => {
    if (!receiver.name || items.length === 0) {
      toast.error("Enter receiver details first");
      return;
    }
    try {
      const now = new Date().toISOString();
      await db.digital_bills.put({
        id: invoiceDetails.no || uuidv4(),
        type: 'gst',
        bill_no: invoiceDetails.no,
        date: invoiceDetails.date,
        customer_name: receiver.name,
        data: JSON.stringify({ items, receiver, invoiceDetails, shopDetails }),
        updated_at: now,
        is_deleted: 0,
        sync_status: 'pending',
        version_clock: Date.now()
      });
      toast.success("Invoice Synced to Archives");
    } catch { toast.error("Failed to sync invoice"); }
  };

  const exportDoc = async (type: 'pdf' | 'img') => {
    if (!invoiceRef.current) return;
    toast.info("Generating...");
    try {
      const url = await toJpeg(invoiceRef.current, { pixelRatio: 1.5, quality: 0.8, backgroundColor: '#ffffff' });
      if (type === 'img') {
        const a = document.createElement('a'); a.download = `JoyRam-GST.jpg`; a.href = url; a.click();
      } else {
        const pdf = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4', compress: true });
        pdf.addImage(url, 'JPEG', 0, 0, 210, 297, undefined, 'FAST'); pdf.save(`JoyRam-GST.pdf`);
      }
      await saveToHistory();
      toast.success("Success");
    } catch { toast.error("Failed"); }
  };

  return (
    <Dialog open={isOpen} onOpenChange={open => !open && onClose()}>
      <DialogContent fullScreen className="bg-zinc-950">
        <div className="md:hidden flex flex-col h-full w-full overflow-hidden text-left">
          <Tabs defaultValue="edit" className="flex-1 flex flex-col h-full overflow-hidden">
            <TabsList className="grid grid-cols-2 h-16 bg-zinc-900/50 border-b border-white/10 p-2 shrink-0">
              <TabsTrigger value="edit" className="rounded-xl font-black text-[10px] uppercase tracking-widest">1. Data</TabsTrigger>
              <TabsTrigger value="preview" className="rounded-xl font-black text-[10px] uppercase tracking-widest">2. View</TabsTrigger>
            </TabsList>
            <TabsContent value="edit" className="flex-1 overflow-y-auto bg-white m-0 p-6 pb-32">
              <FormContent receiver={receiver} setReceiver={setReceiver} invoiceDetails={invoiceDetails} setInvoiceDetails={setInvoiceDetails} items={items} setItems={setItems} addItem={addItem} updateItem={updateItem} removeItem={(i:number)=>setItems(items.filter((_,idx)=>idx!==i))} catalog={catalog} onClose={onClose} exportDoc={exportDoc} shopDetails={shopDetails} setShopDetails={setShopDetails} saveToHistory={saveToHistory} />
            </TabsContent>
            <TabsContent value="preview" className="flex-1 overflow-auto bg-zinc-950 flex items-start justify-center p-4 m-0 scrollbar-hide">
              <div className="origin-top transform-gpu scale-[0.42] transition-all">
                <PreviewContent ref={invoiceRef} receiver={receiver} invoiceDetails={invoiceDetails} items={items} totalTaxable={totalTaxable} totalCgst={totalCgst} totalSgst={totalSgst} grandTotal={grandTotal} shopDetails={shopDetails} />
              </div>
            </TabsContent>
          </Tabs>
        </div>

        <div className="hidden md:flex flex-row h-full w-full overflow-hidden bg-zinc-950">
          <div className="w-[500px] h-full bg-white shrink-0 border-r border-zinc-200 overflow-y-auto p-10 scrollbar-hide">
             <FormContent receiver={receiver} setReceiver={setReceiver} invoiceDetails={invoiceDetails} setInvoiceDetails={setInvoiceDetails} items={items} setItems={setItems} addItem={addItem} updateItem={updateItem} removeItem={(i:number)=>setItems(items.filter((_,idx)=>idx!==i))} catalog={catalog} onClose={onClose} exportDoc={exportDoc} shopDetails={shopDetails} setShopDetails={setShopDetails} saveToHistory={saveToHistory} />
          </div>
          <div className="flex-1 h-full overflow-auto p-20 flex items-start justify-center scrollbar-hide">
             <div className="origin-top transform-gpu scale-[0.8] lg:scale-[0.9] xl:scale-100 transition-all">
                <PreviewContent ref={invoiceRef} receiver={receiver} invoiceDetails={invoiceDetails} items={items} totalTaxable={totalTaxable} totalCgst={totalCgst} totalSgst={totalSgst} grandTotal={grandTotal} shopDetails={shopDetails} />
             </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function FormContent({ receiver, setReceiver, invoiceDetails, setInvoiceDetails, items, setItems, addItem, updateItem, removeItem, catalog, onClose, exportDoc, shopDetails, setShopDetails, saveToHistory }: any) {
  const [showAdvanced, setShowAdvanced] = useState(false);

  return (
    <div className="flex flex-col gap-10 text-left">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-2xl bg-zinc-900 text-white flex items-center justify-center font-black italic shadow-xl">G</div>
          <div><h2 className="text-3xl font-black italic tracking-tighter uppercase leading-none">GST GEN</h2><p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mt-1">Professional Biller</p></div>
        </div>
        <div className="flex gap-2">
            <Button variant="ghost" size="icon" onClick={saveToHistory} className="rounded-full h-12 w-12 text-zinc-400 hover:text-emerald-600"><Save className="h-6 w-6" /></Button>
            <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full h-12 w-12"><X className="h-6 w-6 text-zinc-400" /></Button>
        </div>
      </div>

      <div className="space-y-6">
        <div className="flex justify-between items-center px-1">
            <Label className="text-[10px] font-black uppercase text-zinc-400 tracking-widest">Billed To</Label>
            <Button variant="ghost" className="h-auto p-0 text-[10px] font-black text-zinc-400 uppercase gap-1" onClick={()=>setShowAdvanced(!showAdvanced)}><Settings2 className="h-3 w-3" /> {showAdvanced ? 'Hide Settings' : 'Shop Settings'}</Button>
        </div>
        
        {showAdvanced && (
           <div className="p-5 bg-zinc-50 rounded-3xl border border-zinc-100 space-y-4 mb-4">
              <div className="space-y-2"><span className="text-[8px] font-black text-zinc-400 uppercase pl-1">Shop Name</span><Input value={shopDetails.name} onChange={e=>setShopDetails({...shopDetails, name:e.target.value})} className="h-10 rounded-xl bg-white border-zinc-200 font-black uppercase" /></div>
              <div className="space-y-2"><span className="text-[8px] font-black text-zinc-400 uppercase pl-1">Shop Address</span><Input value={shopDetails.address} onChange={e=>setShopDetails({...shopDetails, address:e.target.value})} className="h-10 rounded-xl bg-white border-zinc-200 font-bold" /></div>
              <div className="space-y-2"><span className="text-[8px] font-black text-zinc-400 uppercase pl-1">Shop GSTIN</span><Input value={shopDetails.gstin} onChange={e=>setShopDetails({...shopDetails, gstin:e.target.value})} className="h-10 rounded-xl bg-white border-zinc-200 font-black uppercase" /></div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><span className="text-[8px] font-black text-zinc-400 uppercase pl-1">Summary HSN</span><Input value={shopDetails.summaryHsn} onChange={e=>setShopDetails({...shopDetails, summaryHsn:e.target.value})} className="h-10 rounded-xl bg-white border-zinc-200 font-black text-center" /></div>
                <div className="space-y-2"><span className="text-[8px] font-black text-zinc-400 uppercase pl-1">IGST Value</span><Input value={shopDetails.igst} onChange={e=>setShopDetails({...shopDetails, igst:e.target.value})} className="h-10 rounded-xl bg-white border-zinc-200 font-black text-center" /></div>
              </div>
              <div className="space-y-2"><span className="text-[8px] font-black text-zinc-400 uppercase pl-1">Amount in Words</span><Input value={shopDetails.totalInWords} onChange={e=>setShopDetails({...shopDetails, totalInWords:e.target.value})} className="h-10 rounded-xl bg-white border-zinc-200 font-bold italic" /></div>
           </div>
        )}

        <div className="space-y-2">
          <Input value={receiver.name} onChange={e=>setReceiver({...receiver, name:e.target.value})} placeholder="Customer Name" className="h-14 rounded-2xl bg-zinc-50 border-zinc-100 font-black text-base shadow-inner uppercase" />
          <Input value={receiver.address} onChange={e=>setReceiver({...receiver, address:e.target.value})} placeholder="Address" className="h-14 rounded-2xl bg-zinc-50 border-zinc-100 font-bold text-sm shadow-inner uppercase" />
          <Input value={receiver.gstin} onChange={e=>setReceiver({...receiver, gstin:e.target.value})} placeholder="Receiver GSTIN" className="h-14 rounded-2xl bg-zinc-50 border-zinc-100 font-black text-base shadow-inner uppercase" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2"><Label className="text-[10px] font-black uppercase text-zinc-400 pl-1">Invoice No</Label><Input value={invoiceDetails.no} onChange={e=>setInvoiceDetails({...invoiceDetails, no:e.target.value})} placeholder="No." className="h-14 rounded-2xl bg-zinc-50 border-zinc-100 font-black text-center uppercase" /></div>
          <div className="space-y-2"><Label className="text-[10px] font-black uppercase text-zinc-400 pl-1">Date</Label><Input type="date" value={invoiceDetails.date.split('T')[0]} onChange={e=>setInvoiceDetails({...invoiceDetails, date:new Date(e.target.value).toISOString()})} className="h-14 rounded-2xl bg-zinc-50 border-zinc-100 font-bold" /></div>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex justify-between items-center px-1">
          <Label className="text-[10px] font-black uppercase text-zinc-400 tracking-widest">Inventory List</Label>
          <DropdownMenu>
            <DropdownMenuTrigger render={<Button variant="link" className="h-auto p-0 text-[10px] font-black text-blue-600 uppercase flex items-center gap-1"><Layout className="h-3 w-3" /> Quick Dropdown</Button>} />
            <DropdownMenuContent className="max-h-[400px] overflow-y-auto rounded-[2rem] p-3 min-w-[300px] shadow-2xl border-zinc-100 bg-white z-[6000] flex flex-col gap-1">
              {catalog?.map((p: any) => (
                <DropdownMenuItem key={p.id} onClick={() => addItem(p)} className="rounded-2xl h-14 font-black text-xs flex justify-between cursor-pointer px-4">{p.productName} ({p.size}) <span className="text-emerald-600">₹{p.base_price}</span></DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <div className="flex gap-2">
          <ProductSearch onSelect={addItem} className="flex-1" placeholder="Type to search..." />
          <Button onClick={()=>addItem()} variant="outline" size="icon" className="h-14 w-14 rounded-2xl border-2 border-zinc-100 bg-zinc-50 hover:bg-white shadow-sm"><Plus className="h-6 w-6" /></Button>
        </div>
        <div className="space-y-4">
          {items.map((item: any, idx: number) => (
            <div key={idx} className="bg-zinc-50/50 p-6 rounded-[2.5rem] border border-zinc-100 space-y-4 relative group shadow-sm hover:shadow-md transition-all text-left">
              <Input value={item.desc} onChange={e=>updateItem(idx, 'desc', e.target.value)} placeholder="Item Name" className="h-12 bg-white border-zinc-200 font-black text-sm rounded-2xl shadow-sm uppercase" />
              <div className="grid grid-cols-4 gap-3">
                <div className="space-y-1"><span className="text-[8px] font-black text-zinc-400 block uppercase pl-2">HSN</span><Input value={item.hsn} onChange={e=>updateItem(idx,'hsn',e.target.value)} className="h-10 bg-white border-zinc-200 text-xs rounded-xl font-bold" /></div>
                <div className="space-y-1"><span className="text-[8px] font-black text-zinc-400 block uppercase pl-2">Qty</span><Input type="number" value={item.qty} onChange={e=>updateItem(idx,'qty',e.target.value)} className="h-10 bg-white border-zinc-200 text-xs rounded-xl font-black" /></div>
                <div className="space-y-1"><span className="text-[8px] font-black text-zinc-400 block uppercase pl-2">Unit</span><select value={item.unit} onChange={e=>updateItem(idx, 'unit', e.target.value)} className="w-full h-10 bg-white border border-zinc-200 text-xs rounded-xl font-black focus:ring-0 outline-none px-2 uppercase shadow-sm"><option value="pcs">PCS</option><option value="kg">KG</option></select></div>
                <div className="space-y-1"><span className="text-[8px] font-black text-zinc-400 block uppercase pl-2">Gst%</span><Input type="number" value={item.gstRate} onChange={e=>updateItem(idx,'gstRate',e.target.value)} className="h-10 bg-white border-zinc-200 text-xs rounded-xl font-black text-green-600" /></div>
              </div>
              <div className="space-y-1"><span className="text-[8px] font-black text-zinc-400 block uppercase pl-2">Price Per {item.unit?.toUpperCase() || 'UNIT'}</span><Input type="number" value={item.finalRate} onChange={e=>updateItem(idx,'finalRate',e.target.value)} className="h-12 bg-white border border-zinc-200 text-sm rounded-2xl font-black text-blue-600" /></div>
              <Button onClick={()=>removeItem(idx)} variant="ghost" size="icon" className="absolute -top-3 -right-2 bg-white shadow-xl rounded-full h-10 w-10 text-red-500 border border-zinc-100 transition-all opacity-0 group-hover:opacity-100"><Trash2 className="h-4 w-4" /></Button>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-auto grid grid-cols-2 gap-4 pb-10">
        <Button onClick={()=>window.print()} variant="outline" className="h-20 rounded-[1.5rem] border-2 border-zinc-100 font-black tracking-widest text-[10px] uppercase shadow-sm"><Printer className="h-6 w-6 mr-3 text-zinc-400" /> Print</Button>
        <DropdownMenu>
          <DropdownMenuTrigger render={<Button className="h-20 rounded-[1.5rem] bg-zinc-900 text-white font-black tracking-widest text-[10px] shadow-2xl uppercase"><Download className="h-6 w-6 mr-3 text-zinc-400" /> Export</Button>} />
          <DropdownMenuContent className="rounded-[1.5rem] p-3 shadow-2xl min-w-[220px] bg-white/95 backdrop-blur-3xl z-[6000] flex flex-col gap-1">
             <DropdownMenuItem onClick={()=>exportDoc('img')} className="rounded-xl h-16 flex gap-4 font-black text-[10px] uppercase cursor-pointer hover:bg-zinc-50"><ImageIcon className="h-6 w-6 text-blue-600" /> Image</DropdownMenuItem>
             <DropdownMenuItem onClick={()=>exportDoc('pdf')} className="rounded-xl h-16 flex gap-4 font-black text-[10px] uppercase cursor-pointer hover:bg-zinc-50"><FileText className="h-6 w-6 text-red-600" /> PDF</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}

const PreviewContent = React.forwardRef(({ receiver, invoiceDetails, items, totalTaxable, totalCgst, totalSgst, grandTotal, shopDetails }: any, ref: any) => {
  return (
    <div ref={ref} className="bg-white shadow-[0_60px_150px_rgba(0,0,0,0.6)] flex flex-col p-[15mm] text-black shrink-0" style={{ width: '210mm', minHeight: '297mm', fontFamily: "'Times New Roman', serif" }}>
      <div className="flex justify-between items-start mb-6 text-[10.5pt] text-left">
        <div className="font-bold tracking-tight uppercase">GSTIN : {shopDetails.gstin}</div>
        <div className="font-bold border-b-2 border-black px-8 pb-0.5 text-[12pt] tracking-widest uppercase">TAX INVOICE</div>
        <div className="w-[140px]"></div>
      </div>
      <div className="text-center mb-10 mt-4 text-left flex items-center gap-6">
        <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-zinc-50 shadow-2xl shrink-0"><img src="/joyramlogo.png" alt="Logo" className="w-full h-full object-cover" /></div>
        <div><h1 className="text-[48pt] font-black tracking-tighter uppercase italic leading-[0.9] inline-block">{shopDetails.name}</h1><p className="text-[13pt] font-bold mt-3 tracking-wide">{shopDetails.address}</p></div>
      </div>
      <div className="flex justify-between mb-8 border-t-2 border-black pt-5 text-[11pt] leading-relaxed text-left">
        <div className="flex-1 space-y-2.5">
          <div className="font-bold uppercase underline tracking-wider">Details of Receiver :</div>
          <div className="flex gap-2"><span>M/s.</span> <span className="font-black text-[13pt] uppercase">{receiver.name || "_________________________________"}</span></div>
          <div className="flex gap-2"><span>Address :</span> <span className="font-bold italic flex-1 uppercase">{receiver.address || "______________________________________________________"}</span></div>
          <div className="flex gap-2 mt-4"><span>GSTIN / Unique ID :</span> <span className="font-black uppercase tracking-widest text-[12pt]">{receiver.gstin || "____________________"}</span></div>
        </div>
        <div className="w-[75mm] space-y-3 pl-6 border-l-2 border-black text-left">
          <div className="flex justify-between items-center"><span>Invoice No. :</span> <span className="font-black text-[12pt] uppercase">{invoiceDetails.no || "N/A"}</span></div>
          <div className="flex justify-between items-center border-b border-zinc-300 pb-1"><span>Date :</span> <span className="font-black text-[12pt]">{new Date(invoiceDetails.date).toLocaleDateString('en-GB')}</span></div>
        </div>
      </div>
      <table className="w-full border-collapse border-2 border-black mb-8 text-[11pt]">
        <thead><tr className="border-b-2 border-black font-black uppercase bg-zinc-50 text-[10pt]"><th className="border-r-2 border-black py-2 w-[12mm]">Sl.</th><th className="border-r-2 border-black py-2 text-left px-4">Description of Goods</th><th className="border-r-2 border-black py-2 w-[25mm]">HSN</th><th className="border-r-2 border-black py-2 w-[30mm]">Qty Unit</th><th className="border-r-2 border-black py-2 w-[28mm]">Rate</th><th className="py-2 w-[40mm]">Amount Rs.</th></tr></thead>
        <tbody className="font-bold uppercase text-center">
          {items.map((item: any, i: number) => (
            <tr key={i} className="border-b border-zinc-200 h-[10mm] italic">
              <td className="border-r-2 border-black">{i+1}</td>
              <td className="border-r-2 border-black text-left px-4 font-black uppercase not-italic text-[10.5pt]">{item.desc}</td>
              <td className="border-r-2 border-black">{item.hsn}</td>
              <td className="border-r-2 border-black">{item.qty} {item.unit?.toUpperCase() || 'PCS'}</td>
              <td className="border-r-2 border-black">{item.taxableValue > 0 ? (item.taxableValue / (parseFloat(item.qty)||1)).toFixed(2) : ""}</td>
              <td className="text-right pr-2 text-[12pt] font-black">{item.taxableValue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
            </tr>
          ))}
          {[...Array(Math.max(0, 8 - items.length))].map((_, i) => (
            <tr key={`empty-${i}`} className="border-b border-zinc-100 h-[10mm]"><td className="border-r-2 border-black"></td><td className="border-r-2 border-black"></td><td className="border-r-2 border-black"></td><td className="border-r-2 border-black"></td><td className="border-r-2 border-black"></td><td></td></tr>
          ))}
        </tbody>
      </table>
      <div className="flex gap-8 mt-auto pt-4 text-right font-black uppercase">
        <div className="flex-1">
          <table className="w-full border-2 border-black text-[9.5pt]">
            <thead><tr className="border-b-2 border-black bg-zinc-50"><th className="border-r-2 border-black">HSN Code</th><th className="border-r-2 border-black">Taxable Value</th><th className="border-r-2 border-black text-blue-700">CGST (9%)</th><th className="border-r-2 border-black text-blue-700">SGST (9%)</th><th className="text-blue-900">IGST</th></tr></thead>
            <tbody><tr className="h-[10mm] font-black"><td className="border-r-2 border-black text-center">{shopDetails.summaryHsn}</td><td className="border-r-2 border-black pr-2">{totalTaxable.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td><td className="border-r-2 border-black pr-2 text-blue-700">{totalCgst.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td><td className="border-r-2 border-black pr-2 text-blue-700">{totalSgst.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td><td className="pr-2 text-blue-900">{shopDetails.igst}</td></tr></tbody>
          </table>
        </div>
        <div className="w-[80mm] border-2 border-black p-5 space-y-3 bg-zinc-50/50">
          <div className="flex justify-between font-bold text-[10.5pt]"><span>Total Taxable Value</span> <span className="font-black">₹{totalTaxable.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span></div>
          <div className="flex justify-between text-zinc-600 text-[10pt]"><span>Add : CGST @ 9%</span> <span className="font-bold text-blue-700">₹{totalCgst.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span></div>
          <div className="flex justify-between text-zinc-600 text-[10pt] border-b-2 border-black pb-3"><span>Add : SGST @ 9%</span> <span className="font-bold text-blue-700">₹{totalSgst.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span></div>
          <div className="flex justify-between pt-3 text-[18pt] text-blue-800 underline underline-offset-8 italic"><span>GRAND TOTAL</span> <span>₹{grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span></div>
        </div>
      </div>
      <div className="mt-12 border-t-2 border-black flex justify-between items-end pb-4 pt-10">
        <div className="flex-1 pr-14"><div className="font-black uppercase text-[10pt] mb-3 underline decoration-black decoration-1 underline-offset-4 text-left">Total Invoice Value (In words) :</div><div className="border-b-2 border-dotted border-zinc-500 w-full h-[12mm] italic text-zinc-800 text-[14pt] font-black pt-1 uppercase flex items-center justify-center text-center leading-none">{shopDetails.totalInWords}</div></div>
        <div className="text-center min-w-[65mm]"><div className="font-black uppercase text-[10pt] mb-16 tracking-tight">For {shopDetails.name}</div><div className="font-black uppercase text-[11pt] border-t-2 border-black pt-2 tracking-[0.2em] italic">Proprietor</div></div>
      </div>
    </div>
  );
});
PreviewContent.displayName = "PreviewContent";
