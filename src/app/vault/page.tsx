"use client";

import { useState } from "react";
import { 
  FileText, UploadCloud, Search, CheckCircle2, 
  Clock, Camera, Filter, Link as LinkIcon, 
  Image as ImageIcon, Trash2, Plus, Eye,
  Truck, MessageSquare, Share2, Download,
  MoreVertical, ShieldCheck, Zap
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { v4 as uuidv4 } from "uuid";
import imageCompression from 'browser-image-compression';
import { GstInvoiceModal } from "@/components/GstInvoiceModal";
import { EWayBillModal } from "@/components/EWayBillModal";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { motion, AnimatePresence } from "framer-motion";

export default function Vault() {
  const [search, setSearch] = useState("");
  const [newSupplier, setNewSupplier] = useState("");
  const [newAmount, setNewAmount] = useState("");
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [capturedFile, setCapturedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const [isGstModalOpen, setIsGstModalOpen] = useState(false);
  const [isEwayModalOpen, setIsEwayModalOpen] = useState(false);
  const [viewOnlyData, setViewOnlyData] = useState<any>(null);
  
  const bills = useLiveQuery(() => db.bills.where('is_deleted').equals(0).toArray(), []) || [];
  const digitalBills = useLiveQuery(() => db.digital_bills.where('is_deleted').equals(0).toArray(), []) || [];

  const handleAddBill = async () => {
    if (!newSupplier || !newAmount) return toast.error("Enter all fields");
    setIsUploading(true);
    let url = undefined;
    if (capturedFile) {
      try {
        const compressed = await imageCompression(capturedFile, { maxSizeMB: 0.2 });
        const name = `${uuidv4()}.jpg`;
        const { error } = await supabase.storage.from('product-images').upload(`bills/${name}`, compressed);
        if (!error) {
          const { data } = supabase.storage.from('product-images').getPublicUrl(`bills/${name}`);
          url = data.publicUrl;
        }
      } catch {}
    }
    await db.bills.add({
      id: `B-${new Date().getFullYear()}-${Math.floor(Math.random() * 1000)}`,
      supplier: newSupplier.toUpperCase(),
      date: new Date().toLocaleDateString('en-GB'),
      amount: parseInt(newAmount),
      status: "Pending",
      image_url: url,
      updated_at: new Date().toISOString(),
      is_deleted: 0,
      sync_status: 'pending',
      version_clock: Date.now()
    });
    setNewSupplier(""); setNewAmount(""); setCapturedImage(null); setIsUploading(false);
    toast.success("Bill added to Vault");
  };

  const handleShareWhatsApp = (bill: any) => {
    const text = encodeURIComponent(`Invoice Details: ${bill.supplier} - ₹${bill.amount} (${bill.date})`);
    window.open(`https://wa.me/?text=${text}`, '_blank');
  };

  const openDigitalBill = (bill: any) => {
    try {
      const data = JSON.parse(bill.data);
      setViewOnlyData(data);
      if (bill.type === 'gst') setIsGstModalOpen(true);
      else setIsEwayModalOpen(true);
    } catch {
      toast.error("Failed to read bill data");
    }
  };

  const filteredBills = bills.filter(b => b.supplier.toLowerCase().includes(search.toLowerCase()));
  const filteredDigital = digitalBills.filter(b => b.customer_name.toLowerCase().includes(search.toLowerCase()) || b.bill_no.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-20 text-left">
      {/* Modals with ViewOnly Capability */}
      <GstInvoiceModal isOpen={isGstModalOpen} onClose={() => { setIsGstModalOpen(false); setViewOnlyData(null); }} viewOnlyData={viewOnlyData} />
      <EWayBillModal isOpen={isEwayModalOpen} onClose={() => { setIsEwayModalOpen(false); setViewOnlyData(null); }} viewOnlyData={viewOnlyData} />

      {/* TOP BUTTON BOX (UPGRADED) */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 bg-zinc-50/50 p-8 rounded-[2rem] border border-zinc-100 shadow-inner">
        <div>
          <h2 className="text-4xl font-black text-zinc-900 uppercase italic tracking-tighter flex items-center gap-3">
             <ShieldCheck className="h-10 w-10 text-blue-600" /> GST VAULT
          </h2>
          <p className="text-zinc-500 text-[10px] font-black uppercase tracking-[0.2em] mt-2 opacity-60">Enterprise Archive & supplier Ledger</p>
        </div>
        
        <div className="flex flex-wrap gap-3">
          <Button variant="outline" onClick={() => { setViewOnlyData(null); setIsGstModalOpen(true); }} className="h-14 rounded-2xl font-black uppercase text-[10px] tracking-widest border-zinc-200 bg-white shadow-xl hover:bg-zinc-50 transition-all px-6">
            <Plus className="mr-2 h-4 w-4" /> CREATE GST
          </Button>
          <Button variant="outline" onClick={() => { setViewOnlyData(null); setIsEwayModalOpen(true); }} className="h-14 rounded-2xl font-black uppercase text-[10px] tracking-widest border-zinc-200 bg-white shadow-xl hover:bg-zinc-50 transition-all px-6">
            <Truck className="mr-2 h-4 w-4" /> CREATE eWAY
          </Button>
          <Dialog onOpenChange={o => !o && setCapturedImage(null)}>
            <DialogTrigger>
               <div className="h-14 rounded-2xl bg-zinc-900 font-black uppercase text-[10px] tracking-widest px-8 shadow-2xl hover:bg-black transition-all text-white flex items-center justify-center cursor-pointer">
                 <Camera className="mr-2 h-5 w-5 text-blue-400" /> SCAN PHYSICAL BILL
               </div>
            </DialogTrigger>
            <DialogContent className="rounded-[2.5rem] p-8 max-w-md border-none shadow-2xl bg-white/95 backdrop-blur-3xl">
              <DialogHeader>
                <DialogTitle className="text-2xl font-black italic uppercase tracking-tighter">Digitize Invoice</DialogTitle>
                <DialogDescription className="font-bold text-[10px] uppercase tracking-widest text-zinc-400">Capture supplier bills for instant storage</DialogDescription>
              </DialogHeader>
              <div className="space-y-6 pt-6">
                <div className="space-y-2">
                   <Label className="font-black text-[10px] uppercase tracking-widest text-zinc-400 ml-1">Supplier Entity</Label>
                   <Input value={newSupplier} onChange={e=>setNewSupplier(e.target.value)} placeholder="e.g. MILTON STEEL" className="h-12 rounded-xl bg-zinc-50" />
                </div>
                <div className="space-y-2">
                   <Label className="font-black text-[10px] uppercase tracking-widest text-zinc-400 ml-1">Total Amount (₹)</Label>
                   <Input type="number" value={newAmount} onChange={e=>setNewAmount(e.target.value)} placeholder="0.00" className="h-12 rounded-xl bg-zinc-50 font-bold" />
                </div>
                <div className="border-2 border-dashed border-zinc-200 rounded-2xl h-44 flex flex-col items-center justify-center relative bg-zinc-50 group hover:border-blue-400 transition-colors">
                   <input type="file" accept="image/*" capture="environment" className="absolute inset-0 opacity-0 cursor-pointer z-10" onChange={e => {
                     const f = e.target.files?.[0];
                     if(f) { setCapturedImage(URL.createObjectURL(f)); setCapturedFile(f); }
                   }} />
                   {capturedImage ? (
                      <div className="w-full h-full relative p-2">
                         <img src={capturedImage} className="w-full h-full object-cover rounded-xl shadow-lg" />
                         <div className="absolute inset-0 bg-blue-500/10 animate-pulse rounded-xl" />
                      </div>
                   ) : (
                      <div className="flex flex-col items-center gap-3">
                         <div className="p-4 bg-white rounded-full shadow-inner"><Camera className="h-8 w-8 text-zinc-300" /></div>
                         <span className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">Focus & Snap</span>
                      </div>
                   )}
                </div>
                <Button onClick={handleAddBill} disabled={isUploading} className="w-full h-16 rounded-2xl bg-zinc-900 font-black uppercase tracking-widest shadow-xl active:scale-95 transition-all text-white">
                  {isUploading ? <Zap className="h-5 w-5 animate-spin" /> : "SECURE IN VAULT"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* SEARCH AREA */}
      <div className="relative group">
        <Search className="absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5 text-zinc-400 group-focus-within:text-zinc-900 transition-colors" />
        <Input 
           placeholder="Search suppliers, bill numbers, or dates..." 
           className="pl-14 h-16 rounded-2xl bg-white border-zinc-200 shadow-xl font-bold tracking-tight text-lg" 
           value={search} 
           onChange={e=>setSearch(e.target.value)} 
        />
      </div>

      <Tabs defaultValue="scanned">
        <TabsList className="bg-zinc-100 p-1 rounded-2xl mb-8 h-14">
          <TabsTrigger value="scanned" className="rounded-xl px-10 h-full font-black uppercase text-[10px] tracking-widest data-[state=active]:bg-white data-[state=active]:shadow-lg">Scanned Supplier Bills</TabsTrigger>
          <TabsTrigger value="digital" className="rounded-xl px-10 h-full font-black uppercase text-[10px] tracking-widest data-[state=active]:bg-white data-[state=active]:shadow-lg">Generated Digital Documents</TabsTrigger>
        </TabsList>

        <TabsContent value="scanned">
          <Card className="border-zinc-200 shadow-2xl rounded-3xl overflow-hidden bg-white">
            <Table>
              <TableHeader className="bg-zinc-50 border-b border-zinc-100">
                <TableRow className="h-16">
                  <TableHead className="pl-10 font-black uppercase text-[10px] tracking-widest">Supplier</TableHead>
                  <TableHead className="font-black uppercase text-[10px] tracking-widest">Date</TableHead>
                  <TableHead className="font-black uppercase text-[10px] tracking-widest text-right">Value</TableHead>
                  <TableHead className="font-black uppercase text-[10px] tracking-widest text-center">Status</TableHead>
                  <TableHead className="pr-10 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredBills.map(bill => (
                  <TableRow key={bill.id} className="h-20 hover:bg-zinc-50/50 transition-colors group border-zinc-50">
                    <TableCell className="pl-10 font-black uppercase italic tracking-tight text-lg text-zinc-900">{bill.supplier}</TableCell>
                    <TableCell className="font-bold text-zinc-400 text-xs">{bill.date}</TableCell>
                    <TableCell className="text-right font-black text-xl tracking-tighter">₹{bill.amount.toLocaleString()}</TableCell>
                    <TableCell className="text-center">
                       <Badge variant={bill.status === 'Paid' ? 'default' : 'outline'} className={cn("rounded-lg px-3 py-1 font-black text-[9px] uppercase tracking-widest", bill.status === 'Pending' ? "text-amber-600 border-amber-200" : "bg-zinc-900")}>
                          {bill.status}
                       </Badge>
                    </TableCell>
                    <TableCell className="pr-10 text-right">
                       <div className="flex gap-2 justify-end">
                          <DropdownMenu>
                             <DropdownMenuTrigger>
                                <div className="h-10 w-10 rounded-xl hover:bg-zinc-100 transition-all flex items-center justify-center cursor-pointer">
                                  <MoreVertical className="h-4 w-4" />
                                </div>
                             </DropdownMenuTrigger>
                             <DropdownMenuContent className="rounded-2xl bg-white border-zinc-100 shadow-2xl p-2 font-black text-[10px] uppercase">
                                <DropdownMenuItem className="rounded-xl flex gap-3 h-10 px-4" onClick={() => bill.image_url && window.open(bill.image_url, '_blank')}><Eye className="h-4 w-4" /> View Scan</DropdownMenuItem>
                                <DropdownMenuItem className="rounded-xl flex gap-3 h-10 px-4" onClick={() => handleShareWhatsApp(bill)}><MessageSquare className="h-4 w-4 text-emerald-500" /> Share</DropdownMenuItem>
                                {bill.status === 'Pending' && <DropdownMenuItem className="rounded-xl flex gap-3 h-10 px-4 text-emerald-600" onClick={async () => { await db.bills.update(bill.id, { status: "Paid" }); toast.success("Marked as Paid"); }}><CheckCircle2 className="h-4 w-4" /> Mark Paid</DropdownMenuItem>}
                                <DropdownMenuItem className="rounded-xl flex gap-3 h-10 px-4 text-red-500 hover:bg-red-50" onClick={async () => { if(confirm("Delete?")) await db.bills.update(bill.id, { is_deleted: 1 }); }}><Trash2 className="h-4 w-4" /> Delete</DropdownMenuItem>
                             </DropdownMenuContent>
                          </DropdownMenu>
                       </div>
                    </TableCell>
                  </TableRow>
                ))}
                {filteredBills.length === 0 && (
                   <TableRow><TableCell colSpan={5} className="py-20 text-center text-zinc-300 font-black uppercase tracking-widest text-xs italic">No matching scanned bills</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        <TabsContent value="digital">
           <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredDigital.map(bill => (
                <Card key={bill.id} className="p-8 border-zinc-200 shadow-xl rounded-3xl bg-white group hover:shadow-2xl transition-all border border-white/40">
                   <div className="flex justify-between items-start mb-6">
                      <Badge className={cn("rounded-xl px-4 py-1.5 font-black text-[8px] uppercase tracking-[0.2em] border-none shadow-lg shadow-blue-500/20", bill.type === 'gst' ? "bg-blue-600" : "bg-emerald-600")}>{bill.type === 'gst' ? "GST INVOICE" : "eWAY BILL"}</Badge>
                      <span className="text-[10px] font-black text-zinc-400 uppercase">{new Date(bill.date).toLocaleDateString()}</span>
                   </div>
                   <h4 className="font-black uppercase italic text-2xl tracking-tighter mb-1 text-zinc-900 group-hover:text-blue-600 transition-colors">{bill.customer_name}</h4>
                   <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-8 flex items-center gap-2">
                      <div className="h-1 w-1 rounded-full bg-zinc-400" /> REF: {bill.bill_no || "PRO-ORDER"}
                   </p>
                   <div className="flex gap-3">
                      <Button onClick={() => openDigitalBill(bill)} className="flex-1 bg-zinc-900 hover:bg-black text-white rounded-2xl h-14 font-black uppercase text-[10px] tracking-widest shadow-2xl active:scale-95 transition-all">
                        <Eye className="mr-2 h-4 w-4" /> PREVIEW
                      </Button>
                      <Button variant="outline" size="icon" className="h-14 w-14 rounded-2xl border-zinc-200 hover:bg-red-50 text-zinc-300 hover:text-red-500 transition-all" onClick={async ()=>{ if(confirm("Purge document?")) await db.digital_bills.update(bill.id, { is_deleted: 1 }); }}>
                         <Trash2 className="h-5 w-5" />
                      </Button>
                   </div>
                </Card>
              ))}
              {filteredDigital.length === 0 && (
                <div className="col-span-full py-20 text-center text-zinc-300 font-black uppercase tracking-widest text-xs italic bg-zinc-50/50 rounded-3xl border-2 border-dashed border-zinc-100">No generated documents archived</div>
              )}
           </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
