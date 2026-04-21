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
  QrCode,
  Barcode as BarcodeIcon,
  X,
  Plus,
  Layout,
  Trash2,
  MapPin,
  Settings2,
  Save,
  MessageSquare,
  Loader2
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
import { v4 as uuidv4 } from "uuid";
import { uploadCompressedToCloudinary } from "@/lib/cloudinary";

interface EWayBillModalProps {
  isOpen: boolean;
  onClose: () => void;
  viewOnlyData?: any;
}

export function EWayBillModal({ isOpen, onClose, viewOnlyData }: EWayBillModalProps) {
  const ewayRef = useRef<HTMLDivElement>(null);
  const [isSharing, setIsSharing] = useState(false);
  const [items, setItems] = useState<any[]>([
    { itemName: "STEEL KITCHEN WARE ITEMS", itemHsn: "7323", itemQty: "1.00", unit: "pcs", itemAmount: "10,000.00" }
  ]);
  const [details, setDetails] = useState({
    no: `EW-${new Date().getFullYear()}-${Math.floor(Math.random() * 10000)}`,
    date: new Date().toISOString(),
    fromName: "JOY RAM STEEL",
    fromGstin: "16ENCPD2885R1ZE",
    fromAddress: "DHAJANAGAR, UDAIPUR, TRIPURA",
    toName: "",
    toGstin: "",
    toAddress: "TRIPURA - 799114",
    transporterName: "Vikash Steel Logistics",
    transporterId: "16BFOPD3349R1ZT",
    vehicleNo: "TR03L1621",
    distance: "2476km",
    mode: "Road",
    type: "Outward - Supply",
    txnType: "Regular",
    origin: "AGARTALA, TRIPURA"
  });

  React.useEffect(() => {
    if (isOpen && viewOnlyData) {
      setItems(viewOnlyData.items);
      setDetails(viewOnlyData.details);
    }
  }, [isOpen, viewOnlyData]);

  const catalog = useLiveQuery(async () => {
    const products = await db.products.where('is_deleted').equals(0).toArray();
    const variants = await db.variants.where('is_deleted').equals(0).toArray();
    return variants.map(v => {
      const p = products.find(prod => prod.id === v.product_id);
      return { ...v, productName: p?.name || "Unknown", size: v.size };
    });
  }, []);

  const handleProductSelect = (p: any) => {
    const newItem = {
      itemName: `${p.productName} - ${p.size}`.toUpperCase(),
      itemHsn: "7323",
      itemQty: "1.00",
      unit: p.unit || 'pcs',
      itemAmount: p.base_price.toLocaleString('en-IN', { minimumFractionDigits: 2 })
    };
    setItems([...items, newItem]);
    toast.success("Added to bill");
  };

  const removeItem = (idx: number) => setItems(items.filter((_, i) => i !== idx));

  const updateItem = (idx: number, field: string, value: string) => {
    const newItems = [...items];
    newItems[idx][field] = value;
    setItems(newItems);
  };

  const saveToHistory = async () => {
    if (items.length === 0) return;
    try {
      const now = new Date().toISOString();
      await db.digital_bills.put({
        id: details.no || uuidv4(),
        type: 'eway',
        bill_no: details.no,
        date: details.date,
        customer_name: details.toName || "Walk-in",
        data: JSON.stringify({ items, details }),
        updated_at: now,
        is_deleted: 0,
        sync_status: 'pending',
        version_clock: Date.now()
      });
    } catch { toast.error("Failed to sync bill"); }
  };

  const handleWhatsAppShare = async () => {
    const rawPhone = prompt("Enter Customer WhatsApp Number (e.g. 9876543210):");
    if (!rawPhone) return;

    let cleanPhone = rawPhone.replace(/[^0-9]/g, '');
    if (cleanPhone.length === 10) cleanPhone = '91' + cleanPhone;

    if (!ewayRef.current) return;
    setIsSharing(true);
    const id = toast.loading("Digitizing eWay Bill...");

    try {
      const dataUrl = await toPng(ewayRef.current, { pixelRatio: 2, cacheBust: true, backgroundColor: '#ffffff' });
      const blob = await (await fetch(dataUrl)).blob();
      const file = new File([blob], `eway-${details.no}.png`, { type: "image/png" });
      const publicUrl = await uploadCompressedToCloudinary(file);

      const text = `Hello! Here is your eWay Bill from Joy Ram Steel (Ref: ${details.no}).\n\nView Bill: ${publicUrl}\n\nThank you!`;
      window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}`, '_blank');
      toast.success("eWay Bill shared on WhatsApp", { id });
      await saveToHistory();
    } catch (err) {
      console.error(err);
      toast.error("Sharing Failed", { id });
    } finally {
      setIsSharing(false);
    }
  };

  const exportDoc = async (type: 'pdf' | 'img') => {
    if (!ewayRef.current) return;
    toast.info("Generating...");
    try {
      const url = await toPng(ewayRef.current, { pixelRatio: 2, cacheBust: true, backgroundColor: '#ffffff', width: 794, height: 1123 });
      if (type === 'img') {
        const a = document.createElement('a'); a.download = `EWayBill.png`; a.href = url; a.click();
      } else {
        const pdf = new jsPDF('p', 'mm', 'a4');
        pdf.addImage(url, 'PNG', 0, 0, 210, 297); pdf.save(`EWayBill.pdf`);
      }
      await saveToHistory();
      toast.success("Success");
    } catch { toast.error("Error"); }
  };

  return (
    <Dialog open={isOpen} onOpenChange={open => !open && onClose()}>
      <DialogContent fullScreen className="bg-zinc-950">
        <div className="md:hidden flex flex-col h-full w-full overflow-hidden text-left">
          <Tabs defaultValue="edit" className="flex-1 flex flex-col h-full overflow-hidden">
            <div className="bg-zinc-900 border-b border-white/10 p-3 shrink-0">
              <TabsList className="w-full bg-zinc-800/50 rounded-2xl h-14 p-1">
                <TabsTrigger value="edit" className="rounded-xl font-black text-[10px] uppercase">1. Data</TabsTrigger>
                <TabsTrigger value="preview" className="rounded-xl font-black text-[10px] uppercase">2. View</TabsTrigger>
              </TabsList>
            </div>
            <TabsContent value="edit" className="flex-1 overflow-y-auto bg-white m-0 p-6 pb-24">
              <EWayForm details={details} setDetails={setDetails} items={items} setItems={setItems} handleProductSelect={handleProductSelect} removeItem={removeItem} updateItem={updateItem} catalog={catalog} onClose={onClose} exportDoc={exportDoc} saveToHistory={saveToHistory} handleWhatsAppShare={handleWhatsAppShare} isSharing={isSharing} />
            </TabsContent>
            <TabsContent value="preview" className="flex-1 overflow-auto bg-zinc-950 flex items-start justify-center p-4 m-0 scrollbar-hide">
              <div className="origin-top transform-gpu scale-[0.38] transition-all">
                <EWayPreview ref={ewayRef} details={details} items={items} />
              </div>
            </TabsContent>
          </Tabs>
        </div>

        <div className="hidden md:flex flex-row h-full w-full overflow-hidden bg-zinc-950">
          <div className="w-[480px] h-full bg-white shrink-0 border-r border-zinc-100 overflow-y-auto p-10 scrollbar-hide">
             <EWayForm details={details} setDetails={setDetails} items={items} setItems={setItems} handleProductSelect={handleProductSelect} removeItem={removeItem} updateItem={updateItem} catalog={catalog} onClose={onClose} exportDoc={exportDoc} saveToHistory={saveToHistory} handleWhatsAppShare={handleWhatsAppShare} isSharing={isSharing} />
          </div>
          <div className="flex-1 h-full overflow-auto p-20 flex items-start justify-center scrollbar-hide">
             <div className="origin-top transform-gpu scale-[0.7] lg:scale-[0.85] xl:scale-100 transition-all text-left">
                <EWayPreview ref={ewayRef} details={details} items={items} />
             </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function EWayForm({ details, setDetails, items, setItems, handleProductSelect, removeItem, updateItem, catalog, onClose, exportDoc, saveToHistory, handleWhatsAppShare, isSharing }: any) {
  const [showAdvanced, setShowAdvanced] = useState(false);

  return (
    <div className="flex flex-col gap-8 text-left">
      <div className="flex justify-between items-center text-left">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center font-black italic shadow-xl shadow-blue-600/20">E</div>
          <div><h2 className="text-2xl font-black italic tracking-tighter uppercase leading-none">eWay Bill</h2><p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mt-1">Logistics Engine</p></div>
        </div>
        <div className="flex gap-2">
            <Button variant="ghost" size="icon" onClick={saveToHistory} className="rounded-full h-12 w-12 text-zinc-400 hover:text-emerald-600"><Save className="h-6 w-6" /></Button>
            <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full h-12 w-12"><X className="h-6 w-6 text-zinc-400" /></Button>
        </div>
      </div>

      <div className="space-y-6">
        <div className="flex justify-between items-center px-1">
          <Label className="text-[10px] font-black uppercase text-zinc-400 tracking-widest">Manifest Details</Label>
          <Button variant="ghost" className="h-auto p-0 text-[10px] font-black text-zinc-400 uppercase gap-1" onClick={()=>setShowAdvanced(!showAdvanced)}><Settings2 className="h-3 w-3" /> {showAdvanced ? 'Hide Config' : 'E-Way Config'}</Button>
        </div>

        {showAdvanced && (
           <div className="p-5 bg-zinc-50 rounded-3xl border border-zinc-100 space-y-4 mb-4 text-left">
              <div className="grid grid-cols-2 gap-3">
                 <div className="space-y-1"><span className="text-[8px] font-black text-zinc-400 uppercase pl-1">Mode</span><Input value={details.mode} onChange={e=>setDetails({...details, mode:e.target.value})} className="h-10 rounded-xl bg-white border-zinc-200 font-bold" /></div>
                 <div className="space-y-1"><span className="text-[8px] font-black text-zinc-400 uppercase pl-1">Distance</span><Input value={details.distance} onChange={e=>setDetails({...details, distance:e.target.value})} className="h-10 rounded-xl bg-white border-zinc-200 font-bold" /></div>
              </div>
              <div className="space-y-1"><span className="text-[8px] font-black text-zinc-400 uppercase pl-1">Transaction Type</span><Input value={details.txnType} onChange={e=>setDetails({...details, txnType:e.target.value})} className="h-10 rounded-xl bg-white border-zinc-200 font-bold" /></div>
              <div className="space-y-1"><span className="text-[8px] font-black text-zinc-400 uppercase pl-1">Bill Type</span><Input value={details.type} onChange={e=>setDetails({...details, type:e.target.value})} className="h-10 rounded-xl bg-white border-zinc-200 font-bold" /></div>
              <div className="space-y-1"><span className="text-[8px] font-black text-zinc-400 uppercase pl-1">Point of Origin</span><Input value={details.origin} onChange={e=>setDetails({...details, origin:e.target.value})} className="h-10 rounded-xl bg-white border-zinc-200 font-bold uppercase" /></div>
              <div className="space-y-1"><span className="text-[8px] font-black text-zinc-400 uppercase pl-1">Transporter ID</span><Input value={details.transporterId} onChange={e=>setDetails({...details, transporterId:e.target.value})} className="h-10 rounded-xl bg-white border-zinc-200 font-black uppercase" /></div>
           </div>
        )}

        <Input value={details.no} onChange={e=>setDetails({...details, no:e.target.value})} className="h-14 rounded-2xl bg-zinc-50 border-zinc-100 font-black text-lg shadow-inner text-center uppercase" />
        
        <div className="space-y-4">
           <Label className="text-[10px] font-black uppercase text-zinc-400 pl-1 tracking-widest text-left block">Address Configuration</Label>
           <div className="grid grid-cols-2 gap-4">
             <div className="space-y-2 text-left">
               <span className="text-[8px] font-black text-blue-600 uppercase pl-1">Sender (From)</span>
               <Input value={details.fromName} onChange={e=>setDetails({...details, fromName:e.target.value})} placeholder="From Name" className="h-12 rounded-xl bg-zinc-50 border-zinc-100 font-black uppercase" />
               <Input value={details.fromAddress} onChange={e=>setDetails({...details, fromAddress:e.target.value})} placeholder="From Address" className="h-12 rounded-xl bg-zinc-50 border-zinc-100 font-bold uppercase text-[10px]" />
               <Input value={details.fromGstin} onChange={e=>setDetails({...details, fromGstin:e.target.value})} placeholder="From GSTIN" className="h-12 rounded-xl bg-zinc-50 border-zinc-100 font-black uppercase" />
             </div>
             <div className="space-y-2 text-left">
               <span className="text-[8px] font-black text-emerald-600 uppercase pl-1">Receiver (To)</span>
               <Input value={details.toName} onChange={e=>setDetails({...details, toName:e.target.value})} placeholder="Customer Name" className="h-12 rounded-xl bg-zinc-50 border-zinc-100 font-black uppercase" />
               <Input value={details.toAddress} onChange={e=>setDetails({...details, toAddress:e.target.value})} placeholder="Final Destination" className="h-12 rounded-xl bg-zinc-50 border-zinc-100 font-bold uppercase text-[10px]" />
               <Input value={details.toGstin} onChange={e=>setDetails({...details, toGstin:e.target.value})} placeholder="To GSTIN" className="h-12 rounded-xl bg-zinc-50 border-zinc-100 font-black uppercase" />
             </div>
           </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2 text-left">
            <Label className="text-[10px] font-black uppercase text-zinc-400 pl-1">Transporter</Label>
            <Input value={details.transporterName} onChange={e=>setDetails({...details, transporterName:e.target.value})} placeholder="Transporter Name" className="h-12 rounded-xl bg-zinc-50 border-zinc-100 font-bold uppercase shadow-inner" />
          </div>
          <div className="space-y-2 text-left">
            <Label className="text-[10px] font-black uppercase text-zinc-400 pl-1">Vehicle No</Label>
            <Input value={details.vehicleNo} onChange={e=>setDetails({...details, vehicleNo:e.target.value})} placeholder="Vehicle No" className="h-12 rounded-xl bg-zinc-50 border-zinc-100 font-black uppercase shadow-inner" />
          </div>
        </div>
      </div>

      <div className="space-y-4 pt-6 border-t border-zinc-100">
        <div className="flex justify-between items-center px-1">
          <Label className="text-[10px] font-black uppercase text-zinc-400 tracking-widest">Goods Selection</Label>
          <DropdownMenu>
            <DropdownMenuTrigger>
               <Button variant="link" className="h-auto p-0 text-[10px] font-black text-blue-600 uppercase flex items-center gap-1"><Layout className="h-3 w-3" /> Quick Catalog</Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="max-h-[400px] overflow-y-auto rounded-3xl p-3 min-w-[300px] shadow-2xl border-zinc-100 bg-white z-[6000]">
              {catalog?.map((p: any) => (
                <DropdownMenuItem key={p.id} onClick={() => handleProductSelect(p)} className="rounded-2xl h-14 font-black text-xs flex justify-between cursor-pointer px-4">
                  {p.productName} ({p.size})
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <ProductSearch onSelect={handleProductSelect} placeholder="Search product to bill..." />
        
        <div className="space-y-4 pb-20">
          {items.map((item: any, idx: number) => (
            <div key={idx} className="space-y-3 p-5 bg-zinc-50/50 rounded-[2rem] border border-zinc-100 shadow-inner relative group text-left">
              <button onClick={() => removeItem(idx)} className="absolute -top-2 -right-2 bg-white shadow-md border border-zinc-100 p-2 rounded-full text-red-500 opacity-0 group-hover:opacity-100 transition-all z-10">
                <Trash2 className="h-4 w-4" />
              </button>
              <Input value={item.itemName} onChange={e=>updateItem(idx, 'itemName', e.target.value)} placeholder="Product Name" className="h-12 bg-white border-zinc-200 font-black text-xs rounded-2xl shadow-sm uppercase" />
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <span className="text-[8px] font-black text-zinc-400 block uppercase pl-2">HSN</span>
                  <Input value={item.itemHsn} onChange={e=>updateItem(idx, 'itemHsn', e.target.value)} placeholder="HSN" className="h-10 bg-white border-zinc-200 text-xs rounded-xl font-bold shadow-sm" />
                </div>
                <div className="space-y-1">
                  <span className="text-[8px] font-black text-zinc-400 block uppercase pl-2">Qty</span>
                  <Input value={item.itemQty} onChange={e=>updateItem(idx, 'itemQty', e.target.value)} placeholder="Qty" className="h-10 bg-white border-zinc-200 text-xs rounded-xl font-bold shadow-sm" />
                </div>
                <div className="space-y-1">
                  <span className="text-[8px] font-black text-zinc-400 block uppercase pl-2">Unit</span>
                  <select value={item.unit} onChange={e=>updateItem(idx, 'unit', e.target.value)} className="w-full h-10 bg-white border border-zinc-200 text-xs rounded-xl font-black focus:ring-0 outline-none px-2 uppercase shadow-sm">
                    <option value="pcs">PCS</option>
                    <option value="kg">KG</option>
                  </select>
                </div>
              </div>
              <div className="space-y-1">
                <span className="text-[8px] font-black text-zinc-400 block uppercase pl-2">Value</span>
                <Input value={item.itemAmount} onChange={e=>updateItem(idx, 'itemAmount', e.target.value)} placeholder="Value" className="h-10 bg-white border-zinc-200 text-xs rounded-xl font-black text-blue-600 shadow-sm" />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 p-6 bg-white/90 backdrop-blur-xl border-t border-zinc-100 flex flex-col gap-3 md:relative md:bg-transparent md:border-none md:p-0">
          <Button onClick={handleWhatsAppShare} disabled={isSharing || items.length === 0} className="w-full h-16 rounded-2xl bg-[#25D366] hover:bg-[#20bd5a] text-white font-black uppercase text-xs tracking-widest shadow-xl flex gap-3">
             {isSharing ? <Loader2 className="h-5 w-5 animate-spin" /> : <MessageSquare className="h-5 w-5" />} Share eWay on WhatsApp
          </Button>
          <div className="grid grid-cols-2 gap-3">
            <Button onClick={()=>window.print()} variant="outline" className="h-14 rounded-2xl border-2 border-zinc-100 font-black tracking-widest text-[9px] hover:bg-zinc-50 uppercase"><Printer className="h-4 w-4 mr-2 text-zinc-400" /> Print</Button>
            <DropdownMenu>
              <DropdownMenuTrigger>
                <div className="h-14 rounded-2xl bg-zinc-900 text-white font-black tracking-widest text-[9px] shadow-2xl uppercase flex items-center justify-center cursor-pointer px-6">
                  <Download className="h-4 w-4 mr-2" /> Save
                </div>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="rounded-[1.5rem] p-3 shadow-2xl min-w-[220px] bg-white/95 backdrop-blur-3xl z-[6000]">

                 <DropdownMenuItem onClick={()=>exportDoc('img')} className="rounded-xl h-16 flex gap-4 font-black text-[10px] uppercase cursor-pointer hover:bg-zinc-50"><ImageIcon className="h-6 w-6 text-blue-600" /> Image</DropdownMenuItem>
                 <DropdownMenuItem onClick={()=>exportDoc('pdf')} className="rounded-xl h-16 flex gap-4 font-black text-[10px] uppercase cursor-pointer hover:bg-zinc-50"><FileText className="h-6 w-6 text-red-600" /> PDF</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
      </div>
    </div>
  );
}

const EWayPreview = React.forwardRef(({ details, items }: any, ref: any) => {
  return (
    <div ref={ref} className="bg-white shadow-[0_60px_150px_rgba(0,0,0,0.6)] flex flex-col p-[15mm] shrink-0" style={{ width: '210mm', minHeight: '297mm', color: '#000', fontFamily: 'sans-serif' }}>
      <div className="flex justify-between items-start mb-10 text-left">
        <div className="flex items-center gap-6">
          <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-zinc-50 shadow-xl shrink-0">
            <img src="/joyramlogo.png" alt="Logo" className="h-full w-full object-cover" />
          </div>
          <h1 className="text-[24pt] font-black tracking-tight border-b-4 border-black pb-2 uppercase italic">e-Way Bill</h1>
        </div>
        <div className="border-4 border-black p-2">
          <QrCode className="h-20 w-20 text-zinc-900" />
        </div>
      </div>
      <div className="space-y-8 text-left">
        <section><div className="font-black border-b-2 border-black pb-1 mb-4 text-[12pt] uppercase bg-zinc-100 px-2 py-1">1. Details</div><div className="grid grid-cols-2 gap-y-3 text-[11pt] px-2 font-bold uppercase"><div>eWay Bill No: <span className="font-black">{details.no}</span></div><div>Date: <span className="font-black">{new Date(details.date).toLocaleString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span></div><div>Mode: {details.mode}</div><div>Type: {details.txnType}</div><div>Bill Type: {details.type}</div><div>Distance: {details.distance}</div></div></section>
        
        <section>
          <div className="font-black border-b-2 border-black pb-1 mb-4 text-[12pt] uppercase bg-zinc-100 px-2 py-1">2. Address Details</div>
          <div className="grid grid-cols-2 gap-12 px-2">
            <div className="space-y-1 relative border-2 border-dashed border-zinc-100 p-4 rounded-2xl bg-zinc-50/50 text-left">
              <div className="font-black text-[10pt] uppercase underline text-blue-600 mb-2">From (Sender)</div>
              <div className="font-black text-[14pt] text-zinc-900 tracking-wider leading-none uppercase">{details.fromName}</div>
              <div className="text-[10pt] font-bold text-zinc-400 mt-2 leading-tight uppercase">{details.fromAddress}</div>
              <div className="mt-2 pt-2 border-t border-zinc-200 font-black text-[10pt] tracking-tighter text-blue-800 italic">GSTIN: {details.fromGstin}</div>
            </div>
            <div className="space-y-1 relative border-2 border-dashed border-zinc-100 p-4 rounded-2xl bg-zinc-50/50 text-left">
              <div className="font-black text-[10pt] uppercase underline text-emerald-600 mb-2">To (Final Destination)</div>
              <div className="font-black text-[14pt] text-zinc-900 tracking-wider leading-none uppercase">{details.toName || "WALK-IN"}</div>
              <div className="text-[10pt] font-bold text-zinc-400 mt-2 leading-tight uppercase">{details.toAddress || "URP"}</div>
              <div className="mt-2 pt-2 border-t border-zinc-200 font-black text-[10pt] tracking-tighter text-blue-800 italic">GSTIN: {details.toGstin || "UNREGISTERED"}</div>
            </div>
          </div>
        </section>

        <section>
          <div className="font-black border-b-2 border-black pb-1 mb-4 text-[12pt] uppercase bg-zinc-100 px-2 py-1">3. Goods</div>
          <table className="w-full border-collapse border-2 border-black text-[10pt]">
            <thead>
              <tr className="bg-zinc-50 font-black uppercase border-b-2 border-black text-center">
                <th className="p-2 border-r-2 border-black">HSN</th>
                <th className="p-2 text-left border-r-2 border-black pl-4">Product Description</th>
                <th className="p-2 border-r-2 border-black">Qty Unit</th>
                <th className="p-2 text-right pr-4">Amount</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item: any, i: number) => (
                <tr key={i} className="h-[10mm] font-black uppercase italic border-b border-zinc-200 last:border-0 text-center">
                  <td className="p-2 border-r-2 border-black">{item.itemHsn}</td>
                  <td className="p-2 border-r-2 border-black text-left pl-4 font-black not-italic">{item.itemName}</td>
                  <td className="p-2 border-r-2 border-black text-center">{item.itemQty} {item.unit?.toUpperCase() || 'PCS'}</td>
                  <td className="p-2 text-right pr-4 font-black not-italic">₹{item.itemAmount}</td>
                </tr>
              ))}
              {items.length < 4 && [...Array(4 - items.length)].map((_, i) => (
                <tr key={`e-${i}`} className="h-[10mm] border-b border-zinc-100 last:border-0">
                  <td className="border-r-2 border-black"></td><td className="border-r-2 border-black"></td><td className="border-r-2 border-black"></td><td></td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
        
        <section>
          <div className="font-black border-b-2 border-black pb-1 mb-4 text-[12pt] uppercase bg-zinc-100 px-2 py-1">4. Logistics Details</div>
          <table className="w-full border-collapse border-2 border-black text-[10pt]">
            <thead>
              <tr className="bg-zinc-50 font-black uppercase border-b-2 border-black text-center">
                <th className="p-2 border-r-2 border-black w-1/3">Transporter</th>
                <th className="p-2 border-r-2 border-black w-1/3 text-center flex items-center justify-center gap-2">Vehicle <MapPin className="h-4 w-4" /></th>
                <th className="p-2">Point of Origin</th>
              </tr>
            </thead>
            <tbody>
              <tr className="h-[12mm] font-black uppercase italic text-center">
                <td className="p-2 border-r-2 border-black">{details.transporterName.toUpperCase()} <br/> <small className="text-[7pt] font-black text-zinc-500">{details.transporterId}</small></td>
                <td className="p-2 border-r-2 border-black text-[14pt] tracking-tighter text-blue-700 underline">{details.vehicleNo.toUpperCase()}</td>
                <td className="p-2 font-black not-italic uppercase">{details.origin}</td>
              </tr>
            </tbody>
          </table>
        </section>
      </div>
      <div className="mt-auto pt-12 flex flex-col items-center gap-4"><div className="w-[120mm] h-[15mm] border-2 border-black flex items-center justify-center relative bg-white"><BarcodeIcon className="h-full w-full px-8 text-zinc-900" /><div className="absolute -bottom-6 font-black tracking-[1.2em] text-[10pt] uppercase">{details.no.replace(/\s/g, '').toUpperCase()}</div></div></div>
    </div>
  );
});
EWayPreview.displayName = "EWayPreview";
