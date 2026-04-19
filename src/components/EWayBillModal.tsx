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
  Plus
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

interface EWayBillModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function EWayBillModal({ isOpen, onClose }: EWayBillModalProps) {
  const ewayRef = useRef<HTMLDivElement>(null);
  const [details, setDetails] = useState({
    no: "7615 9627 7617",
    date: "19/01/2026 04:49 PM",
    fromName: "JOY RAM STEEL",
    fromGstin: "16ENCPD2885R1ZE",
    toName: "",
    toGstin: "",
    transporter: "Vikash Steel Logistics",
    vehicleNo: "TR03L1621",
    itemName: "STEEL KITCHEN WARE ITEMS",
    itemHsn: "7323",
    itemQty: "1.00",
    itemAmount: "10,000.00"
  });

  const catalog = useLiveQuery(async () => {
    const products = await db.products.toArray();
    const variants = await db.variants.toArray();
    return variants.map(v => {
      const p = products.find(prod => prod.id === v.product_id);
      return { ...v, productName: p?.name || "Unknown", size: v.size };
    });
  }, []);

  const handleProductSelect = (p: any) => {
    setDetails({
      ...details,
      itemName: `${p.productName} - ${p.size}`.toUpperCase(),
      itemHsn: "7323",
      itemQty: "1.00",
      itemAmount: p.base_price.toLocaleString('en-IN', { minimumFractionDigits: 2 })
    });
  };

  const downloadAsImage = async () => {
    if (!ewayRef.current) return;
    try {
      const dataUrl = await toPng(ewayRef.current, { cacheBust: true, backgroundColor: '#ffffff', width: 794, height: 1123 });
      const link = document.createElement('a');
      link.download = `EWayBill-${details.no.replace(/\s/g, '')}.png`;
      link.href = dataUrl;
      link.click();
      toast.success("Downloaded");
    } catch (err) {
      toast.error("Error");
    }
  };

  const downloadAsPDF = async () => {
    if (!ewayRef.current) return;
    try {
      const dataUrl = await toPng(ewayRef.current, { cacheBust: true, backgroundColor: '#ffffff', width: 794, height: 1123 });
      const pdf = new jsPDF('p', 'mm', 'a4');
      pdf.addImage(dataUrl, 'PNG', 0, 0, 210, 297);
      pdf.save(`EWayBill-${details.no.replace(/\s/g, '')}.pdf`);
      toast.success("Downloaded");
    } catch (err) {
      toast.error("Error");
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="!fixed !inset-0 !max-w-none !w-screen !h-[100dvh] !m-0 !p-0 !border-none !bg-zinc-950 !flex !flex-col overflow-hidden !rounded-none !shadow-none !ring-0 !transform-none !top-0 !left-0 !z-[5000]">
        
        <Tabs defaultValue="edit" className="w-full h-full flex flex-col md:flex-row gap-0">
          
          <div className="md:hidden bg-zinc-900 border-b border-white/10 p-3 shrink-0">
            <TabsList className="w-full bg-zinc-800/50 rounded-2xl h-14 p-1">
              <TabsTrigger value="edit" className="rounded-xl font-black text-xs tracking-widest uppercase">1. Edit Bill</TabsTrigger>
              <TabsTrigger value="preview" className="rounded-xl font-black text-xs tracking-widest uppercase">2. View Result</TabsTrigger>
            </TabsList>
          </div>

          {/* Form Side */}
          <TabsContent value="edit" className="flex-1 h-full md:w-[480px] md:max-w-[480px] md:shrink-0 bg-white border-r border-zinc-100 overflow-y-auto m-0">
            <div className="p-6 md:p-10 flex flex-col gap-8 min-h-full">
              <EWayForm details={details} setDetails={setDetails} handleProductSelect={handleProductSelect} catalog={catalog} onClose={onClose} downloadAsImage={downloadAsImage} downloadAsPDF={downloadAsPDF} />
            </div>
          </TabsContent>

          {/* Preview Side */}
          <TabsContent value="preview" className="flex-1 h-full overflow-auto bg-zinc-950 p-4 md:p-12 lg:p-20 flex items-start justify-center m-0 scrollbar-hide">
            <div className="shrink-0 flex justify-center origin-top transform-gpu scale-[0.35] sm:scale-[0.5] md:scale-[0.65] lg:scale-[0.8] xl:scale-100 transition-all duration-500">
              <EWayPreview ref={ewayRef} details={details} />
            </div>
          </TabsContent>

          {/* DESKTOP VIEW: Side-by-side override (Hidden on mobile) */}
          <div className="hidden md:flex flex-row h-full w-full overflow-hidden absolute inset-0 pointer-events-none z-0">
             <div className="w-[480px] h-full bg-white border-r border-zinc-100 pointer-events-auto overflow-y-auto">
               <div className="p-10">
                 <EWayForm details={details} setDetails={setDetails} handleProductSelect={handleProductSelect} catalog={catalog} onClose={onClose} downloadAsImage={downloadAsImage} downloadAsPDF={downloadAsPDF} />
               </div>
             </div>
             <div className="flex-1 h-full overflow-auto bg-zinc-900 flex items-start justify-center p-12 lg:p-20 pointer-events-auto scrollbar-hide">
                <div className="shrink-0 flex justify-center origin-top transform-gpu scale-[0.7] lg:scale-[0.85] xl:scale-100 transition-all">
                  <EWayPreview ref={ewayRef} details={details} />
                </div>
             </div>
          </div>

        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

function EWayForm({ details, setDetails, handleProductSelect, catalog, onClose, downloadAsImage, downloadAsPDF }: any) {
  return (
    <div className="flex flex-col gap-8">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-black italic tracking-tighter uppercase leading-none">eWay Bill Generator</h2>
          <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-[0.2em] mt-2">Logistics Manifest</p>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full hover:bg-zinc-100 h-12 w-12"><X className="h-6 w-6 text-zinc-400" /></Button>
      </div>

      <div className="space-y-6 text-left">
        <div className="space-y-3">
          <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 pl-1">e-Way Bill Number</Label>
          <Input value={details.no} onChange={e => setDetails({...details, no: e.target.value})} className="h-14 rounded-2xl bg-zinc-50 border-zinc-100 focus:bg-white transition-all font-black text-lg shadow-inner text-center uppercase" />
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-3">
            <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 pl-1">Receiver GSTIN</Label>
            <Input value={details.toGstin} onChange={e => setDetails({...details, toGstin: e.target.value})} placeholder="Customer GSTIN" className="h-14 rounded-2xl bg-zinc-50 border-zinc-100 focus:bg-white transition-all font-black uppercase shadow-inner" />
          </div>
          <div className="space-y-3">
            <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 pl-1">Receiver Name</Label>
            <Input value={details.toName} onChange={e => setDetails({...details, toName: e.target.value})} placeholder="Customer Name" className="h-14 rounded-2xl bg-zinc-50 border-zinc-100 focus:bg-white transition-all font-bold shadow-inner uppercase" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-3">
            <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 pl-1">Transporter</Label>
            <Input value={details.transporter} onChange={e => setDetails({...details, transporter: e.target.value})} className="h-14 rounded-2xl bg-zinc-50 border-zinc-100 focus:bg-white transition-all font-bold shadow-inner uppercase" />
          </div>
          <div className="space-y-3">
            <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 pl-1">Vehicle No.</Label>
            <Input value={details.vehicleNo} onChange={e => setDetails({...details, vehicleNo: e.target.value})} className="h-14 rounded-2xl bg-zinc-50 border-zinc-100 focus:bg-white transition-all font-black uppercase shadow-inner" />
          </div>
        </div>

        <div className="space-y-4 pt-6 border-t border-zinc-100">
          <div className="flex justify-between items-center px-1">
            <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">Goods Selection</Label>
            <DropdownMenu>
              <DropdownMenuTrigger render={<Button variant="link" className="h-auto p-0 text-[10px] font-black text-blue-600 uppercase">Catalog</Button>} />
              <DropdownMenuContent className="max-h-[300px] overflow-y-auto rounded-2xl p-2 min-w-[250px] shadow-2xl border-zinc-100 bg-white z-[6000]">
                {catalog?.map((p: any) => (
                  <DropdownMenuItem key={p.id} onClick={() => handleProductSelect(p)} className="rounded-xl h-12 font-bold text-xs flex justify-between cursor-pointer">
                    <span>{p.productName} ({p.size})</span>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          <ProductSearch onSelect={handleProductSelect} placeholder="Search product to bill..." />
          
          <div className="space-y-3 p-5 bg-zinc-50/50 rounded-[2rem] border border-zinc-100 shadow-inner">
            <Input value={details.itemName} onChange={e => setDetails({...details, itemName: e.target.value})} placeholder="Product Name" className="h-12 bg-white border-zinc-200 font-black text-xs rounded-2xl shadow-sm uppercase" />
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1">
                <span className="text-[8px] font-black text-zinc-400 block uppercase pl-2">HSN</span>
                <Input value={details.itemHsn} onChange={e => setDetails({...details, itemHsn: e.target.value})} placeholder="HSN" className="h-10 bg-white border-zinc-200 text-xs rounded-xl font-bold shadow-sm" />
              </div>
              <div className="space-y-1">
                <span className="text-[8px] font-black text-zinc-400 block uppercase pl-2">Qty</span>
                <Input value={details.itemQty} onChange={e => setDetails({...details, itemQty: e.target.value})} placeholder="Qty" className="h-10 bg-white border-zinc-200 text-xs rounded-xl font-bold shadow-sm" />
              </div>
              <div className="space-y-1">
                <span className="text-[8px] font-black text-zinc-400 block uppercase pl-2">Value</span>
                <Input value={details.itemAmount} onChange={e => setDetails({...details, itemAmount: e.target.value})} placeholder="Value" className="h-10 bg-white border-zinc-200 text-xs rounded-xl font-black text-blue-600 shadow-sm" />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-auto pt-10 flex gap-4 pb-8">
        <Button onClick={() => window.print()} variant="outline" className="flex-1 rounded-[1.5rem] h-20 border-2 border-zinc-100 font-black tracking-widest text-[10px] hover:bg-zinc-50 transition-all uppercase"><Printer className="h-6 w-6 mr-3 text-zinc-400" /> PRINT</Button>
        <DropdownMenu>
          <DropdownMenuTrigger render={<Button className="flex-1 rounded-[1.5rem] h-20 bg-zinc-900 text-white font-black tracking-widest text-[10px] shadow-2xl hover:bg-zinc-800 transition-all uppercase" />} >
            <Download className="h-6 w-6 mr-3 text-zinc-400" /> SAVE
          </DropdownMenuTrigger>
          <DropdownMenuContent className="rounded-[1.5rem] p-3 border-none shadow-[0_32px_64px_-12px_rgba(0,0,0,0.3)] min-w-[220px] bg-white/95 backdrop-blur-3xl z-[6000]">
            <DropdownMenuItem onClick={downloadAsImage} className="rounded-xl h-16 flex gap-4 font-black text-[10px] uppercase tracking-widest cursor-pointer hover:bg-zinc-50 transition-all"><ImageIcon className="h-6 w-6 text-blue-600" /> Save as Image</DropdownMenuItem>
            <DropdownMenuItem onClick={downloadAsPDF} className="rounded-xl h-16 flex gap-4 font-black text-[10px] uppercase tracking-widest cursor-pointer hover:bg-zinc-50 transition-all"><FileText className="h-6 w-6 text-red-600" /> Save as PDF</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}

const EWayPreview = React.forwardRef(({ details }: any, ref: any) => {
  return (
    <div 
      ref={ref}
      className="bg-white shadow-[0_60px_150px_rgba(0,0,0,0.6)] flex flex-col p-[15mm] shrink-0"
      style={{ width: '210mm', minHeight: '297mm', color: '#000', fontFamily: 'sans-serif' }}
    >
      <div className="flex justify-between items-start mb-10">
        <h1 className="text-[24pt] font-black tracking-tight border-b-4 border-black pb-2 uppercase italic">e-Way Bill</h1>
        <div className="border-4 border-black p-2">
          <QrCode className="h-20 w-20 text-zinc-900" />
        </div>
      </div>

      <div className="space-y-8">
        <section>
          <div className="font-black border-b-2 border-black pb-1 mb-4 text-[12pt] uppercase bg-zinc-100 px-2 py-1">1. E-WAY BILL Details</div>
          <div className="grid grid-cols-2 gap-y-3 text-[11pt] px-2 font-bold">
            <div>eWay Bill No: <span className="font-black">{details.no}</span></div>
            <div>Generated Date: <span className="font-black">{details.date}</span></div>
            <div>Mode: <span className="font-black uppercase">Road</span></div>
            <div>Type: <span className="font-black uppercase">Outward - Supply</span></div>
            <div>Approx Distance: <span className="font-black">2476km</span></div>
            <div>Transaction Type: <span className="font-black">Regular</span></div>
          </div>
        </section>

        <section>
          <div className="font-black border-b-2 border-black pb-1 mb-4 text-[12pt] uppercase bg-zinc-100 px-2 py-1">2. Address Details</div>
          <div className="grid grid-cols-2 gap-12 px-2">
            <div className="space-y-2">
              <div className="font-black text-[10pt] uppercase text-zinc-500 underline">From</div>
              <div className="font-black text-[14pt] text-blue-700 tracking-wider leading-none">{details.fromGstin}</div>
              <div className="font-black text-[13pt] uppercase italic leading-none">{details.fromName}</div>
              <div className="text-[10pt] font-bold text-zinc-400">Dhajanagar, Udaipur, Tripura-799114</div>
            </div>
            <div className="space-y-2">
              <div className="font-black text-[10pt] uppercase text-zinc-500 underline">To</div>
              <div className="font-black text-[14pt] text-blue-700 tracking-wider leading-none uppercase">{details.toGstin || "URP"}</div>
              <div className="font-black text-[13pt] uppercase italic leading-none uppercase">{details.toName || "WALK-IN CUSTOMER"}</div>
              <div className="text-[10pt] font-bold text-zinc-400 uppercase">TRIPURA - 799114</div>
            </div>
          </div>
        </section>

        <section>
          <div className="font-black border-b-2 border-black pb-1 mb-4 text-[12pt] uppercase bg-zinc-100 px-2 py-1">3. Goods Details</div>
          <table className="w-full border-collapse border-2 border-black text-[10pt]">
            <thead className="bg-zinc-50 font-black uppercase border-b-2 border-black">
              <tr>
                <th className="border-r-2 border-black p-2 w-[30mm]">HSN Code</th>
                <th className="border-r-2 border-black p-2 text-left px-4">Product Name & Desc.</th>
                <th className="border-r-2 border-black p-2 w-[30mm]">Qty</th>
                <th className="p-2 w-[40mm]">Amount Rs.</th>
              </tr>
            </thead>
            <tbody className="font-bold uppercase">
              <tr className="h-[12mm] border-b border-zinc-200">
                <td className="border-r-2 border-black text-center font-black">{details.itemHsn}</td>
                <td className="border-r-2 border-black p-2 font-black italic px-4">{details.itemName}</td>
                <td className="border-r-2 border-black text-center font-black">{details.itemQty}</td>
                <td className="text-right pr-4 font-black">{details.itemAmount}</td>
              </tr>
            </tbody>
          </table>
        </section>

        <section>
          <div className="font-black border-b-2 border-black pb-1 mb-4 text-[12pt] uppercase bg-zinc-100 px-2 py-1">4. Transportation Details</div>
          <div className="px-2 text-[11pt]">
            <div className="text-zinc-600 uppercase font-black tracking-tight">Transporter ID & Name: <span className="text-zinc-900 font-black">16BFOPD3349R1ZT & {details.transporter.toUpperCase()}</span></div>
          </div>
        </section>

        <section>
          <div className="font-black border-b-2 border-black pb-1 mb-4 text-[12pt] uppercase bg-zinc-100 px-2 py-1">5. Vehicle Details</div>
          <table className="w-full border-collapse border-2 border-black text-[10pt]">
            <thead className="bg-zinc-50 font-black border-b-2 border-black">
              <tr>
                <th className="border-r-2 border-black p-2">Mode</th>
                <th className="border-r-2 border-black p-2">Vehicle / Trans Doc No.</th>
                <th className="border-r-2 border-black p-2">From</th>
                <th className="p-2">Entered Date</th>
              </tr>
            </thead>
            <tbody>
              <tr className="h-[12mm] font-black uppercase italic">
                <td className="border-r-2 border-black text-center">Road</td>
                <td className="border-r-2 border-black text-center text-[14pt] tracking-tighter px-4">{details.vehicleNo.toUpperCase()}</td>
                <td className="border-r-2 border-black text-center px-4">AGARTALA</td>
                <td className="text-center">{details.date.split(' ')[0]}</td>
              </tr>
            </tbody>
          </table>
        </section>
      </div>

      <div className="mt-auto pt-12 flex flex-col items-center gap-4">
        <div className="w-[120mm] h-[15mm] border-2 border-black flex items-center justify-center relative bg-white">
          <BarcodeIcon className="h-full w-full px-8 text-zinc-900" />
          <div className="absolute -bottom-6 font-black tracking-[1.2em] text-[10pt] pl-4 uppercase">{details.no.replace(/\s/g, '').toUpperCase()}</div>
        </div>
      </div>
    </div>
  );
});
EWayPreview.displayName = "EWayPreview";
