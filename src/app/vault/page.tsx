"use client";

import { useState } from "react";
import { FileText, UploadCloud, Search, CheckCircle2, Clock, Camera, Filter, Link as LinkIcon, Image as ImageIcon, Trash2, Plus } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
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
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { v4 as uuidv4 } from "uuid";
import imageCompression from 'browser-image-compression';
import { GstInvoiceModal } from "@/components/GstInvoiceModal";
import { EWayBillModal } from "@/components/EWayBillModal";

export default function Vault() {
  const [search, setSearch] = useState("");
  const [newSupplier, setNewSupplier] = useState("");
  const [newAmount, setNewAmount] = useState("");
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [capturedFile, setCapturedFile] = useState<File | null>(null);

  const [isGstModalOpen, setIsGstModalOpen] = useState(false);
  const [isEwayModalOpen, setIsEwayModalOpen] = useState(false);
  
  const bills = useLiveQuery(() => db.bills.where('is_deleted').equals(0).toArray(), []) || [];
  const pendingAmount = bills.filter(b => b.status === "Pending").reduce((acc, curr) => acc + curr.amount, 0);

  const handleAddBill = async () => {
    if (!newSupplier || !newAmount) {
      toast.error("Please enter supplier and amount");
      return;
    }

    let finalBillUrl = undefined;

    if (capturedFile) {
      toast.info("Compressing & Saving Bill...", { id: 'bill-save' });
      try {
        const options = { maxSizeMB: 0.2, maxWidthOrHeight: 1200, useWebWorker: true };
        const compressedFile = await imageCompression(capturedFile, options);
        
        const fileExt = capturedFile.name.split('.').pop() || 'jpg';
        const fileName = `${uuidv4()}.${fileExt}`;
        const { error } = await supabase.storage
          .from('product-images') // Re-using the same bucket for simplicity, or create a 'bills' one
          .upload(`bills/${fileName}`, compressedFile);

        if (!error) {
          const { data } = supabase.storage.from('product-images').getPublicUrl(`bills/${fileName}`);
          finalBillUrl = data.publicUrl;
          toast.success("Bill digitized!", { id: 'bill-save' });
        }
      } catch (err) {
        console.error(err);
      }
    }
    
    const now = new Date().toISOString();
    await db.bills.add({
      id: `B-${new Date().getFullYear()}-${Math.floor(Math.random() * 1000)}`,
      supplier: newSupplier,
      date: new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }),
      amount: parseInt(newAmount),
      status: "Pending",
      image_url: finalBillUrl,
      updated_at: now,
      is_deleted: 0,
      sync_status: 'pending'
    });
    
    toast.success("Bill added to vault");
    setNewSupplier(""); setNewAmount(""); setCapturedImage(null); setCapturedFile(null);
  };

  const handleMarkPaid = async (id: string) => {
    await db.bills.update(id, { status: "Paid", updated_at: new Date().toISOString() });
    toast.success("Marked as Paid");
  };

  const handleDeleteBill = async (id: string) => {
    if (!confirm("Delete this bill from vault?")) return;
    
    // Production logic: Soft delete for sync reliability
    await db.bills.update(id, { is_deleted: 1, updated_at: new Date().toISOString() });
    toast.success("Bill removed");
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-10">
      <GstInvoiceModal isOpen={isGstModalOpen} onClose={() => setIsGstModalOpen(false)} />
      <EWayBillModal isOpen={isEwayModalOpen} onClose={() => setIsEwayModalOpen(false)} />

      <div className="flex flex-col sm:flex-row gap-6 justify-between sm:items-end">
        <div>
          <h2 className="text-4xl font-black tracking-tight text-zinc-900">GST Vault</h2>
          <p className="text-zinc-500 mt-1 text-lg font-medium leading-tight">Digitize physical bills and track supplier payments.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button variant="outline" className="rounded-2xl h-14 px-6 font-black uppercase text-[10px] tracking-widest border-zinc-200 bg-white shadow-sm hover:bg-zinc-50 transition-all active:scale-95" onClick={() => setIsGstModalOpen(true)}>
            <Plus className="mr-2 h-4 w-4" /> Create GST Bill
          </Button>
          <Button variant="outline" className="rounded-2xl h-14 px-6 font-black uppercase text-[10px] tracking-widest border-zinc-200 bg-white shadow-sm hover:bg-zinc-50 transition-all active:scale-95" onClick={() => setIsEwayModalOpen(true)}>
            <Plus className="mr-2 h-4 w-4" /> Create eWay Bill
          </Button>
          <Dialog onOpenChange={(open) => { if(!open) setCapturedImage(null) }}>
            <DialogTrigger render={<Button size="lg" className="bg-zinc-900 hover:bg-zinc-800 text-white shadow-2xl shadow-zinc-900/20 rounded-2xl h-14 px-8 font-black transition-all active:scale-95"><Camera className="mr-2 h-5 w-5" /> Snap physical bill</Button>} />
            <DialogContent className="sm:max-w-[500px] rounded-3xl border-none shadow-2xl bg-white/90 backdrop-blur-2xl">
              <DialogHeader>
                <DialogTitle className="text-2xl font-black text-zinc-900 text-left">Upload GST Bill</DialogTitle>
                <DialogDescription className="text-zinc-500 text-left">Scan the supplier invoice to store it digitally.</DialogDescription>
              </DialogHeader>
              <div className="grid gap-6 py-4">
                <Tabs defaultValue="camera" className="w-full">
                  <TabsList className="grid w-full grid-cols-2 bg-zinc-100 rounded-xl p-1 h-12">
                    <TabsTrigger value="camera" className="rounded-lg data-[state=active]:bg-white flex gap-2 items-center"><Camera className="h-4 w-4" /> Camera</TabsTrigger>
                    <TabsTrigger value="file" className="rounded-lg data-[state=active]:bg-white flex gap-2 items-center"><ImageIcon className="h-4 w-4" /> File</TabsTrigger>
                  </TabsList>
                  <TabsContent value="camera" className="mt-4">
                    <div className="relative group overflow-hidden border-2 border-dashed border-zinc-200 rounded-2xl flex flex-col items-center justify-center bg-zinc-50 h-56">
                      <input type="file" accept="image/*" capture="environment" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" onChange={(e) => {
                        const file = e.target.files?.[0];
                        if(file) {
                          setCapturedImage(URL.createObjectURL(file));
                          setCapturedFile(file);
                        }
                      }} />
                      {capturedImage ? <img src={capturedImage} className="absolute inset-0 w-full h-full object-cover" /> : <Camera className="h-10 w-10 text-zinc-300" />}
                    </div>
                  </TabsContent>
                  <TabsContent value="file" className="mt-4">
                    <div className="relative group overflow-hidden border-2 border-dashed border-zinc-200 rounded-2xl flex flex-col items-center justify-center bg-zinc-50 h-56">
                      <input type="file" accept="image/*" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" onChange={(e) => {
                        const file = e.target.files?.[0];
                        if(file) {
                          setCapturedImage(URL.createObjectURL(file));
                          setCapturedFile(file);
                        }
                      }} />
                      {capturedImage ? <img src={capturedImage} className="absolute inset-0 w-full h-full object-cover" /> : <UploadCloud className="h-10 w-10 text-zinc-300" />}
                    </div>
                  </TabsContent>
                </Tabs>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2 text-left">
                    <Label className="font-bold">Supplier Name</Label>
                    <Input value={newSupplier} onChange={e => setNewSupplier(e.target.value)} placeholder="e.g. Milton Mfg" className="h-12 rounded-xl" />
                  </div>
                  <div className="space-y-2 text-left">
                    <Label className="font-bold">Bill Amount (₹)</Label>
                    <Input type="number" value={newAmount} onChange={e => setNewAmount(e.target.value)} placeholder="0" className="h-12 rounded-xl font-black" />
                  </div>
                </div>
              </div>
              <Button onClick={handleAddBill} className="w-full h-14 text-lg rounded-2xl shadow-xl bg-zinc-900 hover:bg-zinc-800 text-white font-black">Save Bill to Vault</Button>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="border-none shadow-2xl shadow-zinc-200/50 bg-zinc-900 text-white md:col-span-1 rounded-[2rem] relative overflow-hidden">
          <div className="absolute right-0 top-0 w-32 h-32 bg-white/10 rounded-full blur-3xl -mr-10 -mt-10" />
          <CardContent className="p-8 relative z-10">
            <h3 className="font-black text-zinc-400 flex items-center gap-2 mb-2 text-xs uppercase tracking-widest">
              Total Pending Payments
            </h3>
            <div className="text-5xl font-black tracking-tighter">₹{pendingAmount.toLocaleString()}</div>
            <div className="mt-6 flex items-center">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 bg-white/5 px-4 py-2 rounded-xl border border-white/5 backdrop-blur-xl">
                {bills.filter(b => b.status === "Pending").length} UNPAID INVOICES
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-zinc-400" />
          <Input 
            placeholder="Search by supplier or bill ID..." 
            className="pl-12 h-14 text-lg bg-white/70 backdrop-blur-3xl border-zinc-100 shadow-2xl shadow-zinc-200/50 rounded-2xl"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Button variant="outline" className="h-14 px-8 rounded-2xl bg-white border-zinc-100 text-zinc-700 shadow-sm font-black transition-all active:scale-95">
          <Filter className="mr-2 h-5 w-5" /> Filter
        </Button>
      </div>

      <Card className="border-none shadow-2xl shadow-zinc-200/50 bg-white/70 backdrop-blur-3xl rounded-[2.5rem] overflow-hidden">
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-zinc-50/50 border-none">
              <TableRow className="hover:bg-transparent border-none">
                <TableHead className="pl-8 h-14 font-black uppercase text-[10px] tracking-widest text-zinc-400">Supplier</TableHead>
                <TableHead className="h-14 font-black uppercase text-[10px] tracking-widest text-zinc-400">ID & Date</TableHead>
                <TableHead className="text-right h-14 font-black uppercase text-[10px] tracking-widest text-zinc-400">Amount</TableHead>
                <TableHead className="text-right h-14 font-black uppercase text-[10px] tracking-widest text-zinc-400">Status</TableHead>
                <TableHead className="pr-8 h-14"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {bills.filter(b => b.supplier.toLowerCase().includes(search.toLowerCase()) || b.id.toLowerCase().includes(search.toLowerCase())).map((bill) => (
                <TableRow key={bill.id} className="hover:bg-zinc-50/80 transition-colors cursor-pointer group border-none">
                  <TableCell className="pl-8 py-6">
                    <div className="flex items-center gap-4">
                      <div className="h-12 w-12 rounded-2xl bg-white shadow-xl shadow-zinc-200/50 flex items-center justify-center font-black text-zinc-900 border border-zinc-50 uppercase">{bill.supplier.charAt(0)}</div>
                      <span className="font-black text-zinc-900 group-hover:text-blue-600 transition-colors text-lg tracking-tight">
                        {bill.supplier}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="py-6">
                    <div className="font-black text-zinc-900 text-sm">{bill.id}</div>
                    <div className="text-xs font-bold text-zinc-400 mt-1 uppercase tracking-widest">{bill.date}</div>
                  </TableCell>
                  <TableCell className="text-right py-6">
                    <span className="font-black text-zinc-900 text-2xl tracking-tighter">₹{bill.amount.toLocaleString()}</span>
                  </TableCell>
                  <TableCell className="text-right py-6">
                    {bill.status === "Paid" ? (
                      <Badge className="bg-emerald-50 text-emerald-700 hover:bg-emerald-50 border-emerald-100 font-black px-4 py-1.5 shadow-none rounded-xl text-[10px]">
                        <CheckCircle2 className="mr-1.5 h-4 w-4" /> PAID
                      </Badge>
                    ) : (
                      <Badge className="bg-amber-50 text-amber-700 hover:bg-amber-50 border-amber-100 font-black px-4 py-1.5 shadow-none rounded-xl text-[10px] cursor-pointer" onClick={() => handleMarkPaid(bill.id)}>
                        <Clock className="mr-1.5 h-4 w-4" /> PENDING
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right pr-8 py-6">
                    <div className="flex gap-2 justify-end">
                      <Button variant="ghost" size="icon" className="text-zinc-400 hover:text-red-600 hover:bg-red-50 rounded-xl" onClick={() => handleDeleteBill(bill.id)}>
                        <Trash2 className="h-5 w-5" />
                      </Button>
                      <Button 
                        variant="outline" 
                        className="rounded-xl border-zinc-100 text-zinc-600 font-black bg-white hover:bg-zinc-50 shadow-sm text-xs h-10 px-4 disabled:opacity-30"
                        disabled={!bill.image_url}
                        onClick={() => bill.image_url && window.open(bill.image_url, '_blank')}
                      >
                        VIEW SCAN
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}