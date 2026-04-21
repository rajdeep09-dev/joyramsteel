"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Plus, Search, PackageOpen, Tag, Barcode, Camera, 
  UploadCloud, AlertTriangle, Truck, Trash2, Link as LinkIcon, Loader2, Info
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
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
import { uploadCompressedToCloudinary } from "@/lib/cloudinary";
import { generateBarcode } from "@/lib/barcode";
import { cn } from "@/lib/utils";
import { ProductCard } from "@/components/ProductCard";
import { ScrollArea } from "@/components/ui/scroll-area";
import { BarcodeViewModal } from "@/components/BarcodeViewModal";

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
  const [newUnitsPerCombo, setNewUnitsPerCombo] = useState("1");
  const [capturedFile, setCapturedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const [isImportOpen, setIsImportOpen] = useState(false);
  const [selectedBarcodeItem, setSelectedBarcodeItem] = useState<any>(null);

  const products = useLiveQuery(() => db.products.where('is_deleted').equals(0).toArray()) || [];
  const variants = useLiveQuery(() => db.variants.where('is_deleted').equals(0).toArray()) || [];

  const handleAddMasterProduct = async () => {
    if (!newProductName || !newProductCategory) return toast.error("Fill all fields");
    const now = new Date().toISOString();
    await db.products.add({ 
      id: uuidv4(), 
      name: newProductName.toUpperCase(), 
      category: newProductCategory.toUpperCase(), 
      created_at: now, 
      updated_at: now, 
      is_deleted: 0, 
      sync_status: 'pending', 
      version_clock: Date.now() 
    });
    toast.success("Master Product added");
    setNewProductName("");
  };

  const handleAddVariant = async () => {
    if (!selectedProductId || !newSize || !newStock || !newPrice) return toast.error("Fill all fields");
    setIsUploading(true);
    let url = undefined;
    try {
      if (capturedFile) {
        url = await uploadCompressedToCloudinary(capturedFile);
      }
      const now = new Date().toISOString();
      await db.variants.add({
        id: uuidv4(),
        product_id: selectedProductId,
        size: newSize,
        unit: newUnit as any,
        stock: parseInt(newStock),
        dented_stock: 0,
        cost_price: parseInt(newMsp || newPrice), 
        msp: parseInt(newMsp || newPrice), 
        base_price: parseInt(newPrice), 
        image_url: url,
        barcode: generateBarcode(), 
        pricing_type: newPricingType, 
        bundle_qty: newPricingType === 'bundle' ? parseInt(newBundleQty) : undefined,
        bundle_price: newPricingType === 'bundle' ? parseInt(newBundlePrice) : undefined,
        units_per_combo: parseInt(newUnitsPerCombo) || 1,
        created_at: now,
        updated_at: now,
        is_deleted: 0,
        sync_status: 'pending',
        version_clock: Date.now()
      });
      toast.success("Variant deployed");
      setNewSize(""); setNewStock(""); setNewPrice(""); setCapturedFile(null); setSelectedProductId(null);
      setNewUnitsPerCombo("1");
    } catch { toast.error("Deployment failed"); } finally { setIsUploading(false); }
  };

  const handleDeleteMasterProduct = async (id: string, name: string) => {
    const hasVariants = variants.some(v => v.product_id === id && v.is_deleted === 0);
    if (hasVariants) {
      toast.error("Delete all sizes first!");
      return;
    }
    if (!confirm(`Delete master entry "${name}"?`)) return;
    await db.products.update(id, { is_deleted: 1, updated_at: new Date().toISOString() });
    toast.success("Master Product removed");
  };

  const filteredVariants = variants.map(v => {
    const p = products.find(prod => prod.id === v.product_id);
    return {
      ...v,
      productName: p?.name || "Unknown",
      category: p?.category || "General",
      parentImage: p?.image_url
    };
  }).filter(v => 
    v.productName.toLowerCase().includes(search.toLowerCase()) || 
    v.size.toLowerCase().includes(search.toLowerCase()) ||
    v.barcode?.includes(search)
  );

  const setPricingMode = (mode: 'standard' | 'bundle' | 'weight') => {
    if (mode === 'standard') { setNewUnit('pcs'); setNewPricingType('standard'); }
    else if (mode === 'bundle') { setNewUnit('pcs'); setNewPricingType('bundle'); }
    else if (mode === 'weight') { setNewUnit('kg'); setNewPricingType('standard'); }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-20 text-left px-4 md:px-0">
      <BulkImportModal isOpen={isImportOpen} onClose={() => setIsImportOpen(false)} />
      <BarcodeViewModal 
        variant={selectedBarcodeItem} 
        isOpen={!!selectedBarcodeItem} 
        onClose={() => setSelectedBarcodeItem(null)} 
      />
      
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="space-y-1">
          <h2 className="text-3xl font-black text-zinc-900 dark:text-white uppercase italic tracking-tighter">Inventory</h2>
          <p className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest opacity-60">Digital Catalog Management</p>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <Button variant="outline" onClick={() => setIsImportOpen(true)} className="flex-1 sm:flex-none h-11 rounded-xl font-bold uppercase text-[10px] tracking-widest border-zinc-200 dark:border-zinc-800 dark:text-white shadow-sm">Import</Button>
          <Dialog>
            <DialogTrigger>
              <div className="h-11 rounded-xl bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 font-bold uppercase text-[10px] tracking-widest px-6 flex items-center justify-center cursor-pointer shadow-xl transition-transform active:scale-95">
                 <Plus className="mr-2 h-4 w-4" /> Add Product
              </div>
            </DialogTrigger>
            <DialogContent className="rounded-[2rem] p-8 bg-white dark:bg-zinc-900 border-none shadow-2xl">
              <DialogHeader><DialogTitle className="text-2xl font-black italic uppercase tracking-tighter dark:text-white">New Master Entry</DialogTitle></DialogHeader>
              <div className="space-y-6 pt-6">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 ml-1">Brand/Product Name</Label>
                  <Input value={newProductName} onChange={e=>setNewProductName(e.target.value)} placeholder="e.g. MILTON BUCKET" className="h-14 rounded-2xl bg-zinc-50 dark:bg-zinc-800 dark:border-zinc-700 font-bold" />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 ml-1">Category</Label>
                  <Input value={newProductCategory} onChange={e=>setNewProductCategory(e.target.value)} placeholder="e.g. KITCHENWARE" className="h-14 rounded-2xl bg-zinc-50 dark:bg-zinc-800 dark:border-zinc-700 font-bold" />
                </div>
                <Button onClick={handleAddMasterProduct} className="w-full h-16 rounded-2xl bg-zinc-900 dark:bg-white dark:text-zinc-900 text-white font-black uppercase tracking-widest">Create Entry</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        {/* Master Product Management */}
        <Card className="border-zinc-200 dark:border-zinc-800 shadow-xl rounded-2xl p-6 bg-white dark:bg-zinc-900 overflow-hidden relative border">
           <div className="absolute top-0 right-0 p-4 opacity-5"><PackageOpen className="h-20 w-20 dark:text-white" /></div>
           <h4 className="text-[9px] font-black text-zinc-400 uppercase tracking-widest mb-4">Master Brands ({products.length})</h4>
           <ScrollArea className="h-24">
              <div className="space-y-2">
                 {products.map(p => (
                   <div key={p.id} className="flex justify-between items-center group">
                      <span className="text-[10px] font-black uppercase italic dark:text-white">{p.name}</span>
                      <button onClick={() => handleDeleteMasterProduct(p.id, p.name)} className="p-1.5 text-zinc-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100">
                         <Trash2 className="h-3 w-3" />
                      </button>
                   </div>
                 ))}
              </div>
           </ScrollArea>
        </Card>

        <Card className="border-none shadow-xl rounded-2xl overflow-hidden bg-zinc-900 dark:bg-zinc-800 text-white p-6 relative">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full blur-3xl -mr-16 -mt-16" />
          <h4 className="text-[9px] font-black text-zinc-500 uppercase tracking-widest mb-2 relative z-10">Inventory Worth</h4>
          <div className="text-4xl font-black italic tracking-tighter relative z-10 tabular-nums">
            ₹ {variants.reduce((a, b) => a + (b.cost_price * b.stock), 0).toLocaleString()}
          </div>
          <p className="text-[8px] font-bold text-emerald-400 mt-4 uppercase tracking-[0.2em] relative z-10">Active Stock Assets</p>
        </Card>

        <Card className="border-zinc-200 dark:border-zinc-800 shadow-xl rounded-2xl p-6 bg-white dark:bg-zinc-900 border">
           <h4 className="text-[9px] font-black text-zinc-400 uppercase tracking-widest mb-4">Stock Health</h4>
           <div className="space-y-4">
              <div className="space-y-1">
                 <div className="flex justify-between text-[8px] font-black uppercase">
                    <span className="dark:text-white">Critical Stock</span>
                    <span className="text-red-600 font-bold">{variants.filter(v=>v.stock < 5).length} SKU</span>
                 </div>
                 <Progress value={(variants.filter(v=>v.stock < 5).length / (variants.length || 1)) * 100} className="h-1 bg-red-100" />
              </div>
              <div className="space-y-1">
                 <div className="flex justify-between text-[8px] font-black uppercase">
                    <span className="dark:text-white">Healthy Stock</span>
                    <span className="text-emerald-600 font-bold">{variants.filter(v=>v.stock >= 5).length} SKU</span>
                 </div>
                 <Progress value={(variants.filter(v=>v.stock >= 5).length / (variants.length || 1)) * 100} className="h-1 bg-emerald-100" />
              </div>
           </div>
        </Card>
      </div>

      <div className="relative group">
        <Search className="absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5 text-zinc-400 group-focus-within:text-zinc-900 dark:group-focus-within:text-white transition-colors" />
        <Input placeholder="Search catalog by name, size or barcode..." className="pl-14 h-16 rounded-2xl bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 shadow-xl font-bold tracking-tight text-lg dark:text-white" value={search} onChange={e=>setSearch(e.target.value)} />
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6">
        {filteredVariants.map(v => (
          <div key={v.id} className="relative group">
            <ProductCard variant={v as any} onClick={() => setSelectedBarcodeItem(v)} />
            <button onClick={async (e) => { e.stopPropagation(); if(confirm("Purge variant?")) await db.variants.update(v.id, { is_deleted: 1 }); }} className="absolute top-2 right-2 p-2 bg-white/90 dark:bg-zinc-800/90 rounded-full text-red-500 opacity-0 group-hover:opacity-100 transition-all shadow-xl border border-zinc-100 dark:border-zinc-700">
               <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))}
        <Button variant="outline" className="h-full min-h-[200px] border-2 border-dashed rounded-[2.5rem] flex flex-col gap-3 dark:border-zinc-800 dark:text-zinc-500 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-all" onClick={() => setSelectedProductId(products[0]?.id || null)}>
           <div className="p-4 bg-zinc-100 dark:bg-zinc-800 rounded-full shadow-inner"><Plus className="h-8 w-8 text-zinc-400" /></div>
           <span className="text-[10px] font-black uppercase tracking-widest">New Variant</span>
        </Button>
      </div>

      <Dialog open={!!selectedProductId} onOpenChange={o => !o && setSelectedProductId(null)}>
        <DialogContent className="rounded-[2.5rem] p-10 max-w-md bg-white dark:bg-zinc-900 border-none shadow-2xl max-h-[90vh] overflow-y-auto">
           <DialogHeader>
              <DialogTitle className="text-2xl font-black italic uppercase dark:text-white leading-tight">
                DEPLOY VARIANT<br/>
                <span className="text-blue-600">
                  {products.find(p => p.id === selectedProductId)?.name || "SELECT BRAND"}
                </span>
              </DialogTitle>
           </DialogHeader>
           <div className="space-y-6 pt-6 text-left">
              <div className="space-y-2">
                 <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 ml-1">Parent Entity (Brand)</Label>
                 <Select onValueChange={(val: any) => setSelectedProductId(val)} value={selectedProductId || ""}>
                   <SelectTrigger className="h-14 rounded-2xl font-bold bg-zinc-50 dark:bg-zinc-800 dark:border-zinc-700 dark:text-white">
                     <SelectValue placeholder="Brand Name" />
                   </SelectTrigger>
                   <SelectContent className="bg-white dark:bg-zinc-800 z-[6000] border-zinc-100 dark:border-zinc-700">
                     {products.map(p => <SelectItem key={p.id} value={p.id} className="font-bold">{p.name}</SelectItem>)}
                   </SelectContent>
                 </Select>
              </div>

              <div className="space-y-2">
                 <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 ml-1">Pricing Strategy</Label>
                 <div className="grid grid-cols-3 gap-2">
                   {['standard', 'bundle', 'weight'].map(m => (
                     <button key={m} type="button" onClick={()=>setPricingMode(m as any)} className={cn("h-12 rounded-xl text-[8px] font-black uppercase tracking-tighter border transition-all", (newPricingType === m || (m === 'weight' && newUnit === 'kg')) ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 border-transparent shadow-lg scale-105" : "bg-zinc-50 dark:bg-zinc-800 text-zinc-400 dark:border-zinc-700")}>
                        {m === 'bundle' ? 'Combo' : m}
                     </button>
                   ))}
                 </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                 <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 ml-1">Size Details</Label>
                    <Input value={newSize} onChange={e=>setNewSize(e.target.value)} placeholder="e.g. 5 Litre" className="h-14 rounded-2xl bg-zinc-50 dark:bg-zinc-800 dark:border-zinc-700 font-bold dark:text-white" />
                 </div>
                 <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 ml-1">Units in Pack</Label>
                    <Input type="number" value={newUnitsPerCombo} onChange={e=>setNewUnitsPerCombo(e.target.value)} placeholder="1" className="h-14 rounded-2xl bg-zinc-50 dark:bg-zinc-800 dark:border-zinc-700 font-bold dark:text-white" />
                 </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                   <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 ml-1">Opening Stock</Label>
                   <Input type="number" value={newStock} onChange={e=>setNewStock(e.target.value)} placeholder="0" className="h-14 rounded-2xl bg-zinc-50 dark:bg-zinc-800 dark:border-zinc-700 font-bold dark:text-white" />
                </div>
                
                <div className="space-y-2">
                   {newPricingType === 'standard' ? (
                     <>
                       <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 ml-1">Retail Price ₹</Label>
                       <Input type="number" value={newPrice} onChange={e=>setNewPrice(e.target.value)} placeholder="₹" className="h-14 rounded-2xl bg-zinc-50 dark:bg-zinc-800 dark:border-zinc-700 font-black text-blue-600 dark:text-blue-400" />
                     </>
                   ) : (
                     <>
                       <Label className="text-[10px] font-black uppercase tracking-widest text-blue-600 ml-1">Combo Total ₹</Label>
                       <div className="flex flex-col gap-2">
                          <Input type="number" value={newBundlePrice} onChange={e=>setNewBundlePrice(e.target.value)} placeholder="Total Pack Price ₹" className="h-14 rounded-2xl bg-blue-50/50 dark:bg-blue-900/20 border-blue-100 dark:border-blue-900 font-black text-blue-600 dark:text-blue-400 shadow-inner" />
                          <Input type="number" value={newPrice} onChange={e=>setNewPrice(e.target.value)} placeholder="Loose Price ₹" className="h-10 rounded-xl bg-zinc-50 dark:bg-zinc-800 text-xs" />
                       </div>
                     </>
                   )}
                </div>
              </div>

              {newPricingType === 'bundle' && (
                <div className="space-y-2">
                   <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 ml-1">Combo Rules</Label>
                   <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-700 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                         <Info className="h-4 w-4 text-blue-500" />
                         <span className="text-[10px] font-bold dark:text-zinc-300 uppercase">Sell as a set of:</span>
                      </div>
                      <Input type="number" value={newBundleQty} onChange={e=>setNewBundleQty(e.target.value)} placeholder="Qty" className="w-20 h-10 rounded-xl bg-white dark:bg-zinc-900 font-black text-center" />
                   </div>
                </div>
              )}

              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 ml-1">Variant Identity</Label>
                <div className="border-2 border-dashed border-zinc-200 dark:border-zinc-700 rounded-2xl p-6 flex flex-col items-center gap-3 relative bg-zinc-50 dark:bg-zinc-800/50 group hover:border-zinc-300 dark:hover:border-zinc-600 transition-colors overflow-hidden text-center">
                   <input type="file" accept="image/*" className="absolute inset-0 opacity-0 cursor-pointer z-10" onChange={e=>setCapturedFile(e.target.files?.[0] || null)} />
                   {capturedFile ? (
                      <div className="relative w-full h-20">
                         <img src={URL.createObjectURL(capturedFile)} className="w-full h-full object-cover rounded-xl" />
                         <div className="absolute inset-0 bg-blue-600/10 animate-pulse rounded-xl" />
                      </div>
                   ) : (
                      <>
                        <Camera className="h-8 w-8 text-zinc-300 group-hover:text-zinc-500 transition-colors" />
                        <span className="text-[9px] font-black uppercase text-zinc-400 group-hover:text-zinc-500">Capture or Upload Media</span>
                      </>
                   )}
                </div>
              </div>

              <Button onClick={handleAddVariant} disabled={isUploading} className="w-full h-20 rounded-[2.5rem] bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 font-black uppercase tracking-[0.2em] text-xs shadow-2xl active:scale-95 transition-all">
                {isUploading ? <Loader2 className="h-6 w-6 animate-spin" /> : 'AUTHORISE DEPLOYMENT'}
              </Button>
           </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
