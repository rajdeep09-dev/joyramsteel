"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Plus, Search, PackageOpen, Tag, Barcode, Camera, 
  UploadCloud, AlertTriangle, Truck, Trash2, Link as LinkIcon 
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import { toast } from "sonner";
import { v4 as uuidv4 } from "uuid";
import { BulkImportModal } from "@/components/BulkImportModal";
import { uploadToCloudinary } from "@/lib/cloudinary";
import { cn } from "@/lib/utils";
import { ProductCard } from "@/components/ProductCard";

export default function Inventory() {
  const [search, setSearch] = useState("");
  const [newProductName, setNewProductName] = useState("");
  const [newProductCategory, setNewProductCategory] = useState("");
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  
  const [newSize, setNewSize] = useState("");
  const [newStock, setNewStock] = useState("");
  const [newPrice, setNewPrice] = useState("");
  const [newMsp, setNewMsp] = useState("");
  const [newUnit, setNewUnit] = useState("pcs");
  const [newPricingType, setNewPricingType] = useState<'standard' | 'bundle'>('standard');
  const [newBundleQty, setNewBundleQty] = useState("");
  const [newBundlePrice, setNewBundlePrice] = useState("");
  const [capturedFile, setCapturedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  // Task 1: Pre-defined Template Map
  const PRICING_TEMPLATES: Record<string, { unit: string; type: string; bundle_qty?: string; bundle_price?: string; base_price?: string }> = {
    "Standard": { unit: 'pcs', type: 'standard' },
    "4-for-100": { unit: 'pcs', type: 'bundle', bundle_qty: "4", bundle_price: "100" },
    "3-for-100": { unit: 'pcs', type: 'bundle', bundle_qty: "3", bundle_price: "100" },
    "By Weight": { unit: 'kg', type: 'standard' },
    "Fixed 100": { unit: 'pcs', type: 'standard', base_price: "100" }
  };

  const applyTemplate = (templateKey: keyof typeof PRICING_TEMPLATES) => {
    const t = PRICING_TEMPLATES[templateKey];
    setNewUnit(t.unit);
    setNewPricingType(t.type as any);
    if (t.type === 'bundle') {
      setNewBundleQty(t.bundle_qty || "");
      setNewBundlePrice(t.bundle_price || "");
    } else {
      setNewBundleQty("");
      setNewBundlePrice("");
    }
    if ((t as any).base_price) setNewPrice((t as any).base_price);
    toast.success(`Template Applied: ${templateKey}`);
  };

  const products = useLiveQuery(() => db.products.where('is_deleted').equals(0).toArray()) || [];
  const variants = useLiveQuery(() => db.variants.where('is_deleted').equals(0).toArray()) || [];

  const handleAddMasterProduct = async () => {
    if (!newProductName || !newProductCategory) return toast.error("Fill all fields");
    const now = new Date().toISOString();
    await db.products.add({ 
      id: uuidv4(), name: newProductName.toUpperCase(), category: newProductCategory.toUpperCase(), 
      created_at: now, updated_at: now, is_deleted: 0, sync_status: 'pending', version_clock: Date.now() 
    });
    toast.success("Master Product added");
    setNewProductName("");
  };

  const handleAddVariant = async () => {
    if (!selectedProductId || !newSize || !newStock || !newPrice) return toast.error("Fill all fields");
    setIsUploading(true);
    let url = undefined;
    try {
      if (capturedFile) url = await uploadToCloudinary(capturedFile);
      const now = new Date().toISOString();
      await db.variants.add({
        id: uuidv4(), product_id: selectedProductId, size: newSize, unit: newUnit as any,
        stock: parseInt(newStock), dented_stock: 0, cost_price: parseInt(newMsp || newPrice), 
        msp: parseInt(newMsp || newPrice), base_price: parseInt(newPrice), image_url: url,
        pricing_type: newPricingType, 
        bundle_qty: newPricingType === 'bundle' ? parseInt(newBundleQty) : undefined,
        bundle_price: newPricingType === 'bundle' ? parseInt(newBundlePrice) : undefined,
        created_at: now, updated_at: now, is_deleted: 0, sync_status: 'pending', version_clock: Date.now()
      });
      toast.success("Variant deployed");
      setNewSize(""); setNewStock(""); setNewPrice(""); setCapturedFile(null); setSelectedProductId(null);
      setNewBundleQty(""); setNewBundlePrice(""); setNewPricingType('standard');
    } catch { toast.error("Failed to add variant"); } finally { setIsUploading(false); }
  };

  const filteredVariants = variants.map(v => ({
    ...v,
    productName: products.find(p => p.id === v.product_id)?.name || "Unknown",
    category: products.find(p => p.id === v.product_id)?.category || "General",
    parentImage: products.find(p => p.id === v.product_id)?.image_url
  })).filter(v => v.productName.toLowerCase().includes(search.toLowerCase()) || v.size.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-20 text-left">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-3xl font-black tracking-tight text-zinc-900 uppercase italic">Inventory</h2>
          <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest opacity-60">Manage your master catalog</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => (window as any).dispatchEvent(new CustomEvent('open-bulk-import'))} className="h-11 rounded-xl font-bold uppercase text-[10px] tracking-widest border-zinc-200">Import</Button>
          <Dialog>
            <DialogTrigger render={<Button className="h-11 rounded-xl bg-zinc-900 font-bold uppercase text-[10px] tracking-widest px-6"><Plus className="mr-2 h-4 w-4" /> Add Product</Button>} />
            <DialogContent className="rounded-2xl p-6">
              <DialogHeader><DialogTitle>New Master Entry</DialogTitle></DialogHeader>
              <div className="space-y-4 pt-4">
                <Input value={newProductName} onChange={e=>setNewProductName(e.target.value)} placeholder="Product Name" className="h-12 rounded-xl" />
                <Input value={newProductCategory} onChange={e=>setNewProductCategory(e.target.value)} placeholder="Category" className="h-12 rounded-xl" />
                <Button onClick={handleAddMasterProduct} className="w-full h-12 rounded-xl bg-zinc-900 font-bold">Create</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-zinc-400" />
        <Input placeholder="Search catalog..." className="pl-12 h-14 rounded-2xl bg-white border-zinc-200 shadow-lg" value={search} onChange={e=>setSearch(e.target.value)} />
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
        {filteredVariants.map(v => (
          <div key={v.id} className="relative group">
            <ProductCard variant={v as any} onClick={() => {}} />
            <button onClick={async () => { if(confirm("Delete?")) await db.variants.update(v.id, { is_deleted: 1, updated_at: new Date().toISOString() }); }} className="absolute top-2 right-2 p-2 bg-white/80 rounded-full text-red-500 opacity-0 group-hover:opacity-100 transition-all shadow-lg"><Trash2 className="h-4 w-4" /></button>
          </div>
        ))}
        <Button variant="outline" className="h-full min-h-[200px] border-2 border-dashed rounded-3xl flex flex-col gap-2" onClick={() => setSelectedProductId(products[0]?.id || null)}>
           <Plus className="h-8 w-8 text-zinc-300" />
           <span className="text-[10px] font-black uppercase text-zinc-400">New Variant</span>
        </Button>
      </div>

      <Dialog open={!!selectedProductId} onOpenChange={o => !o && setSelectedProductId(null)}>
        <DialogContent className="rounded-3xl p-8 max-w-md">
           <DialogHeader><DialogTitle>Deploy Variant</DialogTitle></DialogHeader>
           <div className="space-y-4 pt-4">
              <Select onValueChange={(val: any) => setSelectedProductId(val)} value={selectedProductId || ""}>
                <SelectTrigger className="h-12 rounded-xl"><SelectValue placeholder="Master Product" /></SelectTrigger>
                <SelectContent className="bg-white">{products.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
              </Select>

              {/* Task 2: Fast-Click Pill UI */}
              <div className="space-y-2">
                 <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 ml-1">Quick Pricing Templates</Label>
                 <div className="flex flex-wrap gap-2">
                    {Object.keys(PRICING_TEMPLATES).map((key) => (
                      <motion.button
                        key={key}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => applyTemplate(key as any)}
                        className="px-3 py-1.5 rounded-lg bg-zinc-100 border border-zinc-200 text-[9px] font-black uppercase tracking-widest hover:bg-zinc-900 hover:text-white transition-colors shadow-sm"
                      >
                        {key}
                      </motion.button>
                    ))}
                 </div>
              </div>

              <Input value={newSize} onChange={e=>setNewSize(e.target.value)} placeholder="Size (e.g. 5L)" className="h-12 rounded-xl" />
              <div className="grid grid-cols-2 gap-4">
                <Input type="number" value={newStock} onChange={e=>setNewStock(e.target.value)} placeholder="Stock" className="h-12 rounded-xl" />
                
                {newPricingType === 'standard' ? (
                  <Input type="number" value={newPrice} onChange={e=>setNewPrice(e.target.value)} placeholder="Retail Price ₹" className="h-12 rounded-xl border-blue-100 bg-blue-50/20 font-bold" />
                ) : (
                  <Input type="number" value={newPrice} onChange={e=>setNewPrice(e.target.value)} placeholder="Loose Price ₹" className="h-12 rounded-xl" />
                )}
              </div>

              {/* Bundle Specific Fields */}
              <AnimatePresence>
                {newPricingType === 'bundle' && (
                  <motion.div 
                    initial={{ height: 0, opacity: 0 }} 
                    animate={{ height: 'auto', opacity: 1 }} 
                    exit={{ height: 0, opacity: 0 }}
                    className="grid grid-cols-2 gap-4 bg-zinc-900 p-4 rounded-2xl text-white overflow-hidden"
                  >
                    <div className="space-y-1">
                       <Label className="text-[8px] font-black uppercase text-zinc-400">Bundle Qty</Label>
                       <Input type="number" value={newBundleQty} onChange={e=>setNewBundleQty(e.target.value)} placeholder="e.g. 4" className="h-10 bg-white/10 border-white/20 text-white rounded-lg font-bold" />
                    </div>
                    <div className="space-y-1">
                       <Label className="text-[8px] font-black uppercase text-zinc-400">Bundle Price</Label>
                       <Input type="number" value={newBundlePrice} onChange={e=>setNewBundlePrice(e.target.value)} placeholder="₹" className="h-10 bg-white/10 border-white/20 text-white rounded-lg font-bold" />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="border-2 border-dashed rounded-2xl p-4 flex flex-col items-center gap-2 relative bg-zinc-50/50">
                 <input type="file" accept="image/*" className="absolute inset-0 opacity-0 cursor-pointer" onChange={e=>setCapturedFile(e.target.files?.[0] || null)} />
                 <Camera className="h-6 w-6 text-zinc-300" />
                 <span className="text-[9px] font-black uppercase text-zinc-400">{capturedFile ? capturedFile.name : "Variant Image (Optional)"}</span>
              </div>
              <Button onClick={handleAddVariant} disabled={isUploading} className="w-full h-14 rounded-2xl bg-zinc-900 text-white font-black uppercase tracking-widest shadow-xl active:scale-95 transition-all">
                {isUploading ? "Processing Cloud..." : "Authorise Deployment"}
              </Button>
           </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
