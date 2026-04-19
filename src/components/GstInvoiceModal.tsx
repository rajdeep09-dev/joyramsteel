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
  X
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
}

export function GstInvoiceModal({ isOpen, onClose }: GstInvoiceModalProps) {
  const invoiceRef = useRef<HTMLDivElement>(null);
  const [items, setItems] = useState([{ desc: "", hsn: "", qty: "1", finalRate: "", gstRate: "18", taxableValue: 0, cgst: 0, sgst: 0, total: 0 }]);
  const [receiver, setReceiver] = useState({ name: "", address: "", gstin: "" });
  const [invoiceDetails, setInvoiceDetails] = useState({ no: "", date: new Date().toISOString().split('T')[0] });

  // Load all products for the dropdown
  const catalog = useLiveQuery(async () => {
    const products = await db.products.toArray();
    const variants = await db.variants.toArray();
    return variants.map(v => {
      const p = products.find(prod => prod.id === v.product_id);
      return {
        ...v,
        productName: p?.name || "Unknown Product",
        size: v.size
      };
    });
  }, []);

  const addItem = (selectedProduct?: any) => {
    const newItem = {
      desc: selectedProduct ? `${selectedProduct.productName} - ${selectedProduct.size}` : "",
      hsn: "7323", // Default HSN
      qty: "1",
      finalRate: selectedProduct ? selectedProduct.base_price.toString() : "",
      gstRate: "18", // Default GST
      taxableValue: 0,
      cgst: 0,
      sgst: 0,
      total: 0
    };
    
    // Auto-calculate if product selected
    if (selectedProduct) {
      const taxable = selectedProduct.base_price / 1.18;
      const gstAmount = selectedProduct.base_price - taxable;
      newItem.taxableValue = parseFloat(taxable.toFixed(2));
      newItem.cgst = parseFloat((gstAmount / 2).toFixed(2));
      newItem.sgst = parseFloat((gstAmount / 2).toFixed(2));
      newItem.total = selectedProduct.base_price;
    }

    setItems([...items, newItem]);
  };

  const updateItem = (index: number, field: string, value: string) => {
    const newItems = [...items];
    (newItems[index] as any)[field] = value;
    
    // Calculate Backward GST (Inclusive to Exclusive)
    const qty = parseFloat(newItems[index].qty) || 0;
    const finalRate = parseFloat(newItems[index].finalRate) || 0;
    const gstRate = parseFloat(newItems[index].gstRate) || 18;
    const totalAmount = qty * finalRate;
    
    if (totalAmount > 0) {
      const taxable = totalAmount / (1 + (gstRate / 100));
      const gstAmount = totalAmount - taxable;
      
      newItems[index].taxableValue = parseFloat(taxable.toFixed(2));
      newItems[index].cgst = parseFloat((gstAmount / 2).toFixed(2));
      newItems[index].sgst = parseFloat((gstAmount / 2).toFixed(2));
      newItems[index].total = totalAmount;
    } else {
      newItems[index].taxableValue = 0;
      newItems[index].cgst = 0;
      newItems[index].sgst = 0;
      newItems[index].total = 0;
    }
    
    setItems(newItems);
  };

  const removeItem = (index: number) => {
    if (items.length > 0) {
      setItems(items.filter((_, i) => i !== index));
    }
  };

  const totalTaxable = items.reduce((acc, item) => acc + item.taxableValue, 0);
  const totalCgst = items.reduce((acc, item) => acc + item.cgst, 0);
  const totalSgst = items.reduce((acc, item) => acc + item.sgst, 0);
  const grandTotal = items.reduce((acc, item) => acc + item.total, 0);

  const downloadAsImage = async () => {
    if (!invoiceRef.current) return;
    toast.info("Generating A4 Image...");
    try {
      const dataUrl = await toPng(invoiceRef.current, { 
        pixelRatio: 2,
        quality: 0.8,
        cacheBust: true,
        backgroundColor: '#ffffff'
      });
      const link = document.createElement('a');
      link.download = `JoyRam-GST-${invoiceDetails.no || 'Invoice'}.png`;
      link.href = dataUrl;
      link.click();
      toast.success("Image Saved");
    } catch (err) {
      toast.error("Export failed");
    }
  };

  const downloadAsPDF = async () => {
    if (!invoiceRef.current) return;
    toast.info("Generating PDF...");
    try {
      const dataUrl = await toPng(invoiceRef.current, { 
        pixelRatio: 2,
        quality: 0.7,
        cacheBust: true,
        backgroundColor: '#ffffff'
      });
      
      const pdf = new jsPDF({
        orientation: 'p',
        unit: 'mm',
        format: 'a4',
        compress: true
      });

      pdf.addImage(dataUrl, 'JPEG', 0, 0, 210, 297, undefined, 'FAST');
      pdf.save(`JoyRam-GST-${invoiceDetails.no || 'Invoice'}.pdf`);
      toast.success("PDF Saved");
    } catch (err) {
      toast.error("Export failed");
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="!fixed !inset-0 !max-w-none !w-screen !h-[100dvh] !m-0 !p-0 !border-none !bg-zinc-950 !flex !flex-col overflow-hidden !rounded-none !shadow-none !ring-0 !transform-none !top-0 !left-0 !z-[5000]">
        
        {/* MOBILE VIEW: Tabs based layout */}
        <div className="md:hidden flex flex-col h-full w-full">
          <Tabs defaultValue="edit" className="flex-1 flex flex-col h-full overflow-hidden">
            <div className="bg-zinc-900 border-b border-white/10 p-3 shrink-0">
              <TabsList className="w-full bg-zinc-800/50 rounded-2xl h-14 p-1">
                <TabsTrigger value="edit" className="rounded-xl font-black text-xs tracking-widest uppercase">1. Edit Data</TabsTrigger>
                <TabsTrigger value="preview" className="rounded-xl font-black text-xs tracking-widest uppercase">2. View Bill</TabsTrigger>
              </TabsList>
            </div>
            
            <TabsContent value="edit" className="flex-1 overflow-y-auto bg-white">
              <div className="p-6 pb-24">
                <GstForm receiver={receiver} setReceiver={setReceiver} invoiceDetails={invoiceDetails} setInvoiceDetails={setInvoiceDetails} items={items} addItem={addItem} updateItem={updateItem} removeItem={removeItem} catalog={catalog} onClose={onClose} downloadAsImage={downloadAsImage} downloadAsPDF={downloadAsPDF} />
              </div>
            </TabsContent>
            
            <TabsContent value="preview" className="flex-1 overflow-auto bg-zinc-950 flex items-start justify-center p-4 scrollbar-hide">
              <div className="origin-top transform-gpu scale-[0.4] sm:scale-[0.55] transition-all">
                <GstInvoicePreview ref={invoiceRef} receiver={receiver} invoiceDetails={invoiceDetails} items={items} totalTaxable={totalTaxable} totalCgst={totalCgst} totalSgst={totalSgst} grandTotal={grandTotal} />
              </div>
            </TabsContent>
          </Tabs>
        </div>

        {/* DESKTOP VIEW: Side-by-side layout (No Tabs) */}
        <div className="hidden md:flex flex-row h-full w-full overflow-hidden">
          <div className="w-[480px] h-full bg-white overflow-y-auto shrink-0 border-r border-zinc-200">
            <div className="p-10">
              <GstForm receiver={receiver} setReceiver={setReceiver} invoiceDetails={invoiceDetails} setInvoiceDetails={setInvoiceDetails} items={items} addItem={addItem} updateItem={updateItem} removeItem={removeItem} catalog={catalog} onClose={onClose} downloadAsImage={downloadAsImage} downloadAsPDF={downloadAsPDF} />
            </div>
          </div>
          <div className="flex-1 h-full overflow-auto bg-zinc-900 p-12 lg:p-20 flex items-start justify-center scrollbar-hide">
            <div className="origin-top transform-gpu scale-[0.7] lg:scale-[0.85] xl:scale-100 transition-all">
              <GstInvoicePreview ref={invoiceRef} receiver={receiver} invoiceDetails={invoiceDetails} items={items} totalTaxable={totalTaxable} totalCgst={totalCgst} totalSgst={totalSgst} grandTotal={grandTotal} />
            </div>
          </div>
        </div>

      </DialogContent>
    </Dialog>
  );
}

// Extract Sub-Components for clean code
function GstForm({ receiver, setReceiver, invoiceDetails, setInvoiceDetails, items, addItem, updateItem, removeItem, catalog, onClose, downloadAsImage, downloadAsPDF }: any) {
  return (
    <div className="flex flex-col gap-8">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-black italic tracking-tighter text-zinc-900 leading-none uppercase">GST Generator</h2>
          <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-[0.2em] mt-2">Professional Billing Engine</p>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full hover:bg-zinc-100 h-12 w-12"><X className="h-6 w-6 text-zinc-400" /></Button>
      </div>

      <div className="space-y-6">
        <div className="space-y-3 text-left">
          <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 pl-1">Billed To (Receiver)</Label>
          <div className="space-y-2">
            <Input value={receiver.name} onChange={e => setReceiver({...receiver, name: e.target.value})} placeholder="M/s. Customer Name" className="h-14 rounded-2xl bg-zinc-50 border-zinc-100 focus:bg-white transition-all font-black text-base shadow-inner uppercase" />
            <Input value={receiver.address} onChange={e => setReceiver({...receiver, address: e.target.value})} placeholder="Full Address" className="h-14 rounded-2xl bg-zinc-50 border-zinc-100 focus:bg-white transition-all font-bold text-sm shadow-inner uppercase" />
            <Input value={receiver.gstin} onChange={e => setReceiver({...receiver, gstin: e.target.value})} placeholder="Receiver GSTIN" className="h-14 rounded-2xl bg-zinc-50 border-zinc-100 focus:bg-white transition-all font-black uppercase text-base shadow-inner" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-3 text-left">
            <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 pl-1">Invoice No.</Label>
            <Input value={invoiceDetails.no} onChange={e => setInvoiceDetails({...invoiceDetails, no: e.target.value})} placeholder="JR/24-25/001" className="h-14 rounded-2xl bg-zinc-50 border-zinc-100 focus:bg-white transition-all font-black text-center shadow-inner uppercase" />
          </div>
          <div className="space-y-3 text-left">
            <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 pl-1">Date</Label>
            <Input type="date" value={invoiceDetails.date} onChange={e => setInvoiceDetails({...invoiceDetails, date: e.target.value})} className="h-14 rounded-2xl bg-zinc-50 border-zinc-100 focus:bg-white transition-all font-bold shadow-inner" />
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex flex-col gap-3">
          <div className="flex justify-between items-center px-1">
            <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">Add Inventory Items</Label>
            <DropdownMenu>
              <DropdownMenuTrigger render={<Button variant="link" className="h-auto p-0 text-[10px] font-black text-blue-600 uppercase">Quick List</Button>} />
              <DropdownMenuContent className="max-h-[300px] overflow-y-auto rounded-2xl p-2 min-w-[250px] shadow-2xl border-zinc-100 bg-white z-[6000]">
                {catalog?.map((p: any) => (
                  <DropdownMenuItem key={p.id} onClick={() => addItem(p)} className="rounded-xl h-12 font-bold text-xs flex justify-between cursor-pointer">
                    <span>{p.productName} ({p.size})</span>
                    <span className="text-blue-600">₹{p.base_price}</span>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          <div className="flex gap-2">
            <ProductSearch onSelect={(p) => addItem(p)} className="flex-1" placeholder="Search product..." />
            <Button onClick={() => addItem()} variant="outline" size="icon" className="h-14 w-14 rounded-2xl border-2 border-zinc-100 shrink-0 hover:bg-zinc-50">
              <Plus className="h-6 w-6" />
            </Button>
          </div>
        </div>

        <div className="space-y-4">
          {items.map((item: any, index: number) => (
            <div key={index} className="bg-zinc-50 p-5 rounded-[2.5rem] border border-zinc-100 space-y-4 relative group hover:border-zinc-200 transition-all shadow-sm">
              <Input value={item.desc} onChange={e => updateItem(index, 'desc', e.target.value)} placeholder="Description of Goods" className="h-12 bg-white border-zinc-200 font-black text-sm rounded-2xl shadow-sm uppercase" />
              <div className="grid grid-cols-4 gap-3">
                <div className="space-y-1">
                  <span className="text-[8px] font-black text-zinc-400 block uppercase pl-2">HSN</span>
                  <Input value={item.hsn} onChange={e => updateItem(index, 'hsn', e.target.value)} placeholder="7323" className="h-10 bg-white border-zinc-200 text-xs rounded-xl font-bold shadow-sm" />
                </div>
                <div className="space-y-1">
                  <span className="text-[8px] font-black text-zinc-400 block uppercase pl-2">Qty</span>
                  <Input type="number" value={item.qty} onChange={e => updateItem(index, 'qty', e.target.value)} placeholder="1" className="h-10 bg-white border-zinc-200 text-xs rounded-xl font-black shadow-sm" />
                </div>
                <div className="space-y-1">
                  <span className="text-[8px] font-black text-zinc-400 block uppercase pl-2">Rate</span>
                  <Input type="number" value={item.finalRate} onChange={e => updateItem(index, 'finalRate', e.target.value)} placeholder="0.00" className="h-10 bg-white border-zinc-200 text-xs rounded-xl font-black text-blue-600 shadow-sm" />
                </div>
                <div className="space-y-1">
                  <span className="text-[8px] font-black text-zinc-400 block uppercase pl-2">GST%</span>
                  <Input type="number" value={item.gstRate} onChange={e => updateItem(index, 'gstRate', e.target.value)} placeholder="18" className="h-10 bg-white border-zinc-200 text-xs rounded-xl font-black text-green-600 shadow-sm" />
                </div>
              </div>
              <Button onClick={() => removeItem(index)} variant="ghost" size="icon" className="absolute -top-3 -right-2 bg-white shadow-xl rounded-full h-10 w-10 text-red-500 hover:bg-red-50 border border-zinc-100"><Trash2 className="h-4 w-4" /></Button>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-10 flex gap-4 pb-8">
        <Button onClick={() => window.print()} variant="outline" className="flex-1 rounded-[1.5rem] h-20 border-2 border-zinc-100 font-black tracking-widest text-[10px] hover:bg-zinc-50 uppercase"><Printer className="h-6 w-6 mr-3 text-zinc-400" /> PRINT</Button>
        <DropdownMenu>
          <DropdownMenuTrigger render={<Button className="flex-1 rounded-[1.5rem] h-20 bg-zinc-900 text-white font-black tracking-widest text-[10px] shadow-2xl hover:bg-zinc-800 uppercase" />} >
            <Download className="h-6 w-6 mr-3 text-zinc-400" /> EXPORT
          </DropdownMenuTrigger>
          <DropdownMenuContent className="rounded-[1.5rem] p-3 border-none shadow-[0_32px_64px_-12px_rgba(0,0,0,0.3)] min-w-[220px] bg-white/95 backdrop-blur-3xl z-[6000]">
            <DropdownMenuItem onClick={downloadAsImage} className="rounded-xl h-16 flex gap-4 font-black text-[10px] uppercase tracking-widest cursor-pointer hover:bg-zinc-50"><ImageIcon className="h-6 w-6 text-blue-600" /> Save as Image</DropdownMenuItem>
            <DropdownMenuItem onClick={downloadAsPDF} className="rounded-xl h-16 flex gap-4 font-black text-[10px] uppercase tracking-widest cursor-pointer hover:bg-zinc-50"><FileText className="h-6 w-6 text-red-600" /> Save as PDF</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}

const GstInvoicePreview = React.forwardRef(({ receiver, invoiceDetails, items, totalTaxable, totalCgst, totalSgst, grandTotal }: any, ref: any) => {
  return (
    <div 
      ref={ref}
      className="bg-white shadow-[0_60px_150px_rgba(0,0,0,0.6)] flex flex-col p-[15mm] text-black shrink-0"
      style={{ width: '210mm', minHeight: '297mm', fontFamily: "'Times New Roman', serif" }}
    >
      <div className="flex justify-between items-start mb-6 text-[10.5pt]">
        <div className="font-bold tracking-tight">GSTIN : 16ENCPD2885R1ZE</div>
        <div className="text-center">
          <div className="font-bold border-b-2 border-black px-8 pb-0.5 text-[12pt] tracking-widest uppercase">TAX INVOICE</div>
        </div>
        <div className="text-[9pt] border-2 border-black p-2 space-y-1.5 font-bold min-w-[140px]">
          <div className="flex items-center gap-2"><div className="w-3.5 h-3.5 border-2 border-black rounded-sm" /><span>Original Copy</span></div>
          <div className="flex items-center gap-2"><div className="w-3.5 h-3.5 border-2 border-black rounded-sm" /><span>Duplicate Copy</span></div>
          <div className="flex items-center gap-2"><div className="w-3.5 h-3.5 border-2 border-black rounded-sm" /><span>Triplicate Copy</span></div>
        </div>
      </div>

      <div className="text-center mb-10 mt-4">
        <h1 className="text-[48pt] font-black tracking-tighter uppercase italic leading-[0.9] border-black inline-block">JOY RAM STEEL</h1>
        <p className="text-[13pt] font-bold mt-3 tracking-wide">Dhajanagar, Udaipur, Gomati Tripura, Pin - 799114</p>
      </div>

      <div className="flex justify-between mb-8 border-t-2 border-black pt-5 text-[11pt] leading-relaxed">
        <div className="flex-1 space-y-2.5">
          <div className="font-bold uppercase underline tracking-wider">Details of Receiver :</div>
          <div className="flex gap-2"><span>M/s.</span> <span className="font-black text-[13pt] uppercase">{receiver.name || "_________________________________"}</span></div>
          <div className="flex gap-2"><span>Address :</span> <span className="font-bold italic flex-1 uppercase">{receiver.address || "______________________________________________________"}</span></div>
          <div className="flex gap-2 mt-4"><span>GSTIN / Unique ID :</span> <span className="font-black uppercase tracking-widest text-[12pt]">{receiver.gstin || "____________________"}</span></div>
        </div>
        <div className="w-[75mm] space-y-3 pl-6 border-l-2 border-black">
          <div className="flex justify-between items-center"><span>Invoice No. :</span> <span className="font-black text-[12pt] uppercase">{invoiceDetails.no || "N/A"}</span></div>
          <div className="flex justify-between items-center border-b border-zinc-300 pb-1"><span>Date :</span> <span className="font-black text-[12pt]">{invoiceDetails.date ? new Date(invoiceDetails.date).toLocaleDateString('en-GB') : ""}</span></div>
          <div className="text-[9pt] mt-4 font-black uppercase leading-tight italic text-zinc-500 text-right">Supply of Goods under GST<br/>(Fill in the State Code)</div>
        </div>
      </div>

      <table className="w-full border-collapse border-2 border-black mb-8 text-[11pt]">
        <thead>
          <tr className="border-b-2 border-black font-black uppercase bg-zinc-50 text-[10pt]">
            <th className="border-r-2 border-black py-2 w-[12mm]">Sl. No.</th>
            <th className="border-r-2 border-black py-2 text-left px-4">Description of Goods</th>
            <th className="border-r-2 border-black py-2 w-[25mm]">HSN Code</th>
            <th className="border-r-2 border-black py-2 w-[30mm]">Quantity Unit</th>
            <th className="border-r-2 border-black py-2 w-[28mm]">Rate</th>
            <th className="py-2 w-[40mm]">Amount Rs.</th>
          </tr>
        </thead>
        <tbody className="font-bold">
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
            <tr key={`empty-${i}`} className="border-b border-zinc-100 h-[10mm]">
              <td className="border-r-2 border-black"></td><td className="border-r-2 border-black"></td><td className="border-r-2 border-black"></td><td className="border-r-2 border-black"></td><td className="border-r-2 border-black"></td><td></td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="flex gap-8 mt-auto pt-4">
        <div className="flex-1">
          <table className="w-full border-2 border-black text-[9.5pt] font-black">
            <thead>
              <tr className="border-b-2 border-black uppercase bg-zinc-50">
                <th className="border-r-2 border-black py-1">HSN Code</th>
                <th className="border-r-2 border-black py-1">Taxable Value</th>
                <th className="border-r-2 border-black py-1">Rate</th>
                <th className="border-r-2 border-black py-1">CGST</th>
                <th className="border-r-2 border-black py-1">SGST</th>
                <th className="py-1">IGST</th>
              </tr>
            </thead>
            <tbody>
              <tr className="h-[10mm] border-b-2 border-black text-right pr-2">
                <td className="border-r-2 border-black text-center">-</td>
                <td className="border-r-2 border-black pr-2">{totalTaxable.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                <td className="border-r-2 border-black text-center">{items.length > 0 ? (items.every((i: any) => i.gstRate === items[0].gstRate) ? items[0].gstRate + '%' : 'Mixed') : '0%'}</td>
                <td className="border-r-2 border-black pr-2">{totalCgst.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                <td className="border-r-2 border-black pr-2">{totalSgst.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                <td className="pr-2">0.00</td>
              </tr>
              <tr className="uppercase bg-zinc-50">
                <td className="border-r-2 border-black text-center py-1.5">TOTAL</td>
                <td className="border-r-2 border-black pr-2">{totalTaxable.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                <td className="border-r-2 border-black"></td>
                <td className="border-r-2 border-black pr-2">{totalCgst.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                <td className="border-r-2 border-black pr-2">{totalSgst.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                <td className="pr-2">0.00</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="w-[80mm] border-2 border-black p-5 space-y-3 bg-zinc-50/50">
          <div className="flex justify-between font-bold text-[10.5pt]"><span>Total Taxable Value</span> <span className="font-black">₹{totalTaxable.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span></div>
          <div className="flex justify-between text-zinc-600 text-[10pt]"><span>Add : CGST @ 9%</span> <span className="font-bold">₹{totalCgst.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span></div>
          <div className="flex justify-between text-zinc-600 text-[10pt] border-b-2 border-black pb-3"><span>Add : SGST @ 9%</span> <span className="font-bold">₹{totalSgst.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span></div>
          <div className="flex justify-between pt-3 font-black text-[18pt] tracking-tighter text-blue-800 italic underline underline-offset-4 decoration-2">
            <span>GRAND TOTAL</span> 
            <span>₹{grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
          </div>
        </div>
      </div>

      <div className="mt-12 border-t-2 border-black flex justify-between items-end pb-4 pt-10">
        <div className="flex-1 pr-14">
          <div className="font-black uppercase text-[10pt] mb-3 underline decoration-black decoration-1 underline-offset-4">Total Invoice Value (In words) :</div>
          <div className="border-b-2 border-dotted border-zinc-500 w-full h-[12mm] italic text-zinc-800 text-[14pt] font-black pt-1 uppercase flex items-center justify-center text-center leading-none">
            Rupees Only
          </div>
        </div>
        <div className="text-center min-w-[65mm]">
          <div className="font-black uppercase text-[10pt] mb-16 tracking-tight">For JOY RAM STEEL</div>
          <div className="font-black uppercase text-[11pt] border-t-2 border-black pt-2 tracking-[0.2em] italic">Proprietor</div>
        </div>
      </div>
    </div>
  );
});
GstInvoicePreview.displayName = "GstInvoicePreview";
