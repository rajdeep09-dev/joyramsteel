"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Plus, Search, PackageOpen, Tag, Barcode as BarcodeIcon, Camera, 
  UploadCloud, AlertTriangle, Truck, Trash2, Link as LinkIcon, 
  Loader2, Info, Edit2, LayoutGrid, List, CheckCircle2, X, Download,
  Settings2, Layers, CheckSquare, Square, FolderInput, Image as ImageIcon, FileText
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
import { BulkImportModal } from "@/components/BulkImportModal";
import { uploadCompressedToCloudinary } from "@/lib/cloudinary";
import { generateBarcode } from "@/lib/barcode";
import { cn } from "@/lib/utils";
import { ProductCard } from "@/components/ProductCard";
import { ScrollArea } from "@/components/ui/scroll-area";
import { BarcodeViewModal } from "@/components/BarcodeViewModal";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import Barcode from "react-barcode";
import { toJpeg } from "html-to-image";
import jsPDF from "jspdf";

/**
 * Department/Category Manager Component
 */
function CategoryManager({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) {
  const [newName, setNewName] = useState("");
  const categories = useLiveQuery(() => db.categories.where('is_deleted').equals(0).toArray()) || [];

  const handleAdd = async () => {
    if (!newName) return;
    const now = new Date().toISOString();
    await db.categories.add({
      id: uuidv4(),
      name: newName.toUpperCase(),
      updated_at: now,
      is_deleted: 0,
      sync_status: 'pending',
      version_clock: Date.now()
    });
    setNewName("");
    toast.success("New Department Created");
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this department?")) return;
    await db.categories.update(id, { is_deleted: 1, updated_at: new Date().toISOString() });
    toast.info("Department Removed");
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="rounded-[2rem] p-8 bg-white dark:bg-zinc-900 border-none shadow-2xl">
        <DialogHeader>
          <DialogTitle className="text-2xl font-black italic uppercase tracking-tighter dark:text-white flex items-center gap-3">
             <Layers className="h-6 w-6 text-blue-600" /> Manage Departments
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-6 pt-6 text-left">
           <div className="flex gap-2">
              <Input value={newName} onChange={e=>setNewName(e.target.value)} placeholder="e.g. NON-STICK" className="h-12 rounded-xl bg-zinc-50 border-zinc-100 font-bold dark:bg-zinc-800 dark:border-zinc-700" />
              <Button onClick={handleAdd} className="h-12 rounded-xl bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 font-bold px-6">Add</Button>
           </div>
           <ScrollArea className="h-48 border border-zinc-100 dark:border-zinc-800 rounded-2xl p-4">
              <div className="space-y-2">
                 {categories.map(c => (
                   <div key={c.id} className="flex justify-between items-center p-3 bg-zinc-50 dark:bg-zinc-800 rounded-xl">
                      <span className="text-[10px] font-black uppercase dark:text-white">{c.name}</span>
                      <button onClick={()=>handleDelete(c.id)} className="text-zinc-400 hover:text-red-500 transition-colors"><Trash2 className="h-3 w-3" /></button>
                   </div>
                 ))}
              </div>
           </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function Inventory() {
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [isExporting, setIsExporting] = useState(false);
  
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const isSelectionMode = selectedIds.length > 0;

  const [isMasterModalOpen, setIsMasterModalOpen] = useState(false);
  const [editingMaster, setEditingMaster] = useState<any>(null);
  const [newProductName, setNewProductName] = useState("");
  const [newProductCategory, setNewProductCategory] = useState("");
  const [isCategoryManagerOpen, setIsCategoryManagerOpen] = useState(false);
  
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [editingVariant, setEditingVariant] = useState<any>(null);
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
  const categories = useLiveQuery(() => db.categories.where('is_deleted').equals(0).toArray()) || [];

  const smartPurgeImage = async (url?: string) => {
    if (!url || !url.includes("supabase.co")) return;
    const variantCount = await db.variants.where('image_url').equals(url).filter(v => v.is_deleted === 0).count();
    const productCount = await db.products.where('image_url').equals(url).filter(p => p.is_deleted === 0).count();
    if ((variantCount + productCount) <= 1) {
      try {
        const filePath = url.split('product-images/')[1];
        if (filePath) await supabase.storage.from('product-images').remove([filePath]);
      } catch (e) { console.warn("Purge failed", e); }
    }
  };

  const handleOpenMasterModal = (p?: any) => {
    if (p) {
      setEditingMaster(p);
      setNewProductName(p.name);
      setNewProductCategory(p.category);
    } else {
      setEditingMaster(null);
      setNewProductName("");
      setNewProductCategory("");
    }
    setIsMasterModalOpen(true);
  };

  const handleSaveMasterProduct = async () => {
    if (!newProductName || !newProductCategory) return toast.error("Fill all fields");
    const now = new Date().toISOString();
    if (editingMaster) {
      await db.products.update(editingMaster.id, {
        name: newProductName.toUpperCase(),
        category: newProductCategory.toUpperCase(),
        updated_at: now,
        version_clock: (editingMaster.version_clock || 0) + 1,
        sync_status: 'pending'
      });
      toast.success("Master Record Updated");
    } else {
      await db.products.add({ 
        id: uuidv4(), name: newProductName.toUpperCase(), category: newProductCategory.toUpperCase(), 
        created_at: now, updated_at: now, is_deleted: 0, sync_status: 'pending', version_clock: Date.now() 
      });
      toast.success("New Product Brand Added");
    }
    setIsMasterModalOpen(false);
  };

  const handleOpenVariantModal = (v?: any) => {
    if (v) {
      setEditingVariant(v);
      setSelectedProductId(v.product_id);
      setNewSize(v.size);
      setNewStock(v.stock.toString());
      setNewPrice(v.base_price.toString());
      setNewMsp(v.msp?.toString() || "");
      setNewUnit(v.unit);
      setNewPricingType(v.pricing_type);
      setNewBundleQty(v.bundle_qty?.toString() || "");
      setNewBundlePrice(v.bundle_price?.toString() || "");
      setNewUnitsPerCombo(v.units_per_combo?.toString() || "1");
    } else {
      setEditingVariant(null);
      setSelectedProductId(products[0]?.id || null);
      setNewSize("");
      setNewStock("");
      setNewPrice("");
      setNewMsp("");
      setNewUnit("pcs");
      setNewPricingType('standard');
      setNewBundleQty("");
      setNewBundlePrice("");
      setNewUnitsPerCombo("1");
    }
    setCapturedFile(null);
  };

  const handleSaveVariant = async () => {
    if (!selectedProductId || !newSize || !newStock || !newPrice) {
      toast.error("Fill required fields: Brand, Size, Stock, Price");
      return;
    }
    setIsUploading(true);
    let url = editingVariant?.image_url;
    try {
      if (capturedFile) {
        toast.info("Uploading Media...", { id: 'v-save' });
        url = await uploadCompressedToCloudinary(capturedFile);
      }
      const now = new Date().toISOString();
      const payload: any = {
        product_id: selectedProductId,
        size: newSize.toUpperCase(),
        unit: newUnit as any,
        stock: parseInt(newStock),
        dented_stock: 0,
        cost_price: parseInt(newMsp || newPrice), 
        msp: parseInt(newMsp || newPrice), 
        base_price: parseInt(newPrice), 
        image_url: url,
        pricing_type: newPricingType, 
        bundle_qty: newPricingType === 'bundle' ? parseInt(newBundleQty) : undefined,
        bundle_price: newPricingType === 'bundle' ? parseInt(newBundlePrice) : undefined,
        units_per_combo: parseInt(newUnitsPerCombo) || 1,
        updated_at: now,
        sync_status: 'pending',
        version_clock: (editingVariant?.version_clock || 0) + 1
      };
      if (editingVariant) {
        await db.variants.update(editingVariant.id, payload);
        toast.success("Variant Updated", { id: 'v-save' });
      } else {
        await db.variants.add({ id: uuidv4(), ...payload, barcode: generateBarcode(), created_at: now, is_deleted: 0, version_clock: Date.now() });
        toast.success("Deployment Successful", { id: 'v-save' });
      }
      setEditingVariant(null);
      setSelectedProductId(null);
    } catch (e) {
      toast.error("Save Failed", { id: 'v-save' }); 
    } finally { 
      setIsUploading(false); 
    }
  };

  const handleDeleteVariant = async (v: any) => {
    if (!confirm(`Permanently remove ${v.size} variant?`)) return;
    await smartPurgeImage(v.image_url);
    await db.variants.update(v.id, { is_deleted: 1, updated_at: new Date().toISOString(), sync_status: 'pending' });
    toast.success("Item Purged");
  };

  const handleBulkDelete = async () => {
    if (!confirm(`Delete ${selectedIds.length} items?`)) return;
    const now = new Date().toISOString();
    for (const id of selectedIds) {
      const v = await db.variants.get(id);
      if (v) {
        await smartPurgeImage(v.image_url);
        await db.variants.update(id, { is_deleted: 1, updated_at: now, sync_status: 'pending' });
      }
    }
    setSelectedIds([]);
    toast.success("Bulk Deletion Complete");
  };

  const handleBulkCategory = async () => {
    const category = prompt("Enter Department Name (e.g. COOKWARE):");
    if (!category) return;
    const now = new Date().toISOString();
    const affectedProductIds = new Set<string>();
    for (const id of selectedIds) {
      const v = await db.variants.get(id);
      if (v) affectedProductIds.add(v.product_id);
    }
    for (const pId of affectedProductIds) {
      await db.products.update(pId, { category: category.toUpperCase(), updated_at: now, sync_status: 'pending' });
    }
    setSelectedIds([]);
    toast.success("Bulk Assignment Ready");
  };

  const handleExport = async (type: 'pdf' | 'img') => {
    if (variants.length === 0) return toast.error("Catalog is empty");
    setIsExporting(true);
    const id = toast.loading(`Generating HD ${type.toUpperCase()}...`);
    try {
      const element = document.getElementById('catalog-export-template');
      if (!element) throw new Error("Template not found");
      const dataUrl = await toJpeg(element, { pixelRatio: 3, quality: 0.95, backgroundColor: '#ffffff', cacheBust: true });
      if (type === 'img') {
        const link = document.createElement('a');
        link.download = `JRS_Catalog_${Date.now()}.jpg`;
        link.href = dataUrl;
        link.click();
        toast.success("HD Image Exported", { id });
      } else {
        const pdf = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4', compress: true });
        pdf.addImage(dataUrl, 'JPEG', 0, 0, 210, 297, undefined, 'SLOW');
        pdf.save(`JRS_Pro_Catalog_${new Date().toLocaleDateString()}.pdf`);
        toast.success("Pro PDF Exported", { id });
      }
    } catch (err) {
      toast.error("HD Export Failed", { id });
    } finally { setIsExporting(false); }
  };

  const filteredVariants = variants.map(v => ({
    ...v,
    productName: products.find(p => p.id === v.product_id)?.name || "Unknown",
    category: products.find(p => p.id === v.product_id)?.category || "General",
    parentImage: products.find(p => p.id === v.product_id)?.image_url
  })).filter(v => v.productName.toLowerCase().includes(search.toLowerCase()) || v.size.toLowerCase().includes(search.toLowerCase()) || v.barcode?.includes(search));

  const setPricingMode = (mode: 'standard' | 'bundle' | 'weight') => {
    if (mode === 'standard') { setNewUnit('pcs'); setNewPricingType('standard'); }
    else if (mode === 'bundle') { setNewUnit('pcs'); setNewPricingType('bundle'); }
    else if (mode === 'weight') { setNewUnit('kg'); setNewPricingType('standard'); }
  };

  const handleDeleteMasterProduct = async (id: string, name: string) => {
    const hasVariants = variants.some(v => v.product_id === id && v.is_deleted === 0);
    if (hasVariants) return toast.error("Delete all sizes first!");
    if (!confirm(`Delete master entry "${name}"?`)) return;
    await db.products.update(id, { is_deleted: 1, updated_at: new Date().toISOString() });
    toast.success("Master Product removed");
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-20 text-left px-4 md:px-0">
      <BulkImportModal isOpen={isImportOpen} onClose={() => setIsImportOpen(false)} />
      <CategoryManager isOpen={isCategoryManagerOpen} onClose={() => setIsCategoryManagerOpen(false)} />
      
      <div className="fixed -left-[9999px] top-0 pointer-events-none">
        <div id="catalog-export-template" className="w-[210mm] min-h-[297mm] bg-white p-10 text-black flex flex-col font-sans">
          <div className="flex justify-between items-end border-b-4 border-black pb-8 mb-10 text-left">
             <div className="flex items-center gap-4"><img src="/joyramlogo.png" className="w-16 h-16 rounded-full" /><h1 className="text-4xl font-black italic tracking-tighter uppercase leading-none">Joy Ram Steel</h1></div>
             <p className="font-black uppercase text-xs tracking-widest opacity-40">Stock Catalog</p>
          </div>
          <div className="grid grid-cols-3 gap-6">
            {filteredVariants.map(v => (
              <div key={v.id} className="border border-zinc-100 p-4 rounded-xl flex flex-col items-center gap-3 text-left">
                 <div className="h-24 w-24 bg-zinc-50 rounded-lg flex items-center justify-center overflow-hidden border border-zinc-100"><img src={v.image_url || v.parentImage || '/joyramlogo.png'} className="w-full h-full object-cover mix-blend-multiply" /></div>
                 <div className="text-center"><p className="font-black text-[10px] uppercase truncate w-40 leading-none mb-1">{v.productName}</p><p className="text-[8px] font-bold text-zinc-500 uppercase tracking-widest">{v.size}</p><p className="text-lg font-black tracking-tighter mt-1 italic">₹{(v.pricing_type === 'bundle' && v.bundle_price) ? v.bundle_price : v.base_price}</p></div>
                 <div className="scale-[0.6] origin-top h-14 overflow-hidden"><Barcode value={v.barcode || "000"} width={1} height={40} fontSize={10} background="transparent" /></div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <BarcodeViewModal variant={selectedBarcodeItem} isOpen={!!selectedBarcodeItem} onClose={() => setSelectedBarcodeItem(null)} />
      
      <Dialog open={isMasterModalOpen} onOpenChange={setIsMasterModalOpen}>
        <DialogContent className="rounded-[2rem] p-8 bg-white dark:bg-zinc-900 border-none shadow-2xl">
          <DialogHeader><DialogTitle className="text-2xl font-black italic uppercase dark:text-white leading-tight">{editingMaster ? "Modify Brand" : "New Master Entry"}</DialogTitle></DialogHeader>
          <div className="space-y-6 pt-6 text-left">
            <div className="space-y-2 text-left">
              <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Brand Name</Label>
              <Input value={newProductName} onChange={e=>setNewProductName(e.target.value)} className="h-14 rounded-2xl bg-zinc-50 dark:bg-zinc-800 dark:border-zinc-700 font-bold" />
            </div>
            <div className="space-y-2 text-left">
              <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Department</Label>
              <Select onValueChange={(val: string | null) => val && setNewProductCategory(val)} value={newProductCategory}>
                <SelectTrigger className="h-14 rounded-2xl font-bold bg-zinc-50 dark:bg-zinc-800 dark:border-zinc-700"><SelectValue placeholder="Choose Dept..." /></SelectTrigger>
                <SelectContent className="bg-white dark:bg-zinc-800 z-[6000]">
                   {categories.map(c => <SelectItem key={c.id} value={c.name} className="font-bold">{c.name}</SelectItem>)}
                   <div className="p-2 border-t border-zinc-100 dark:border-zinc-800 mt-2"><Button onClick={() => { setIsMasterModalOpen(false); setIsCategoryManagerOpen(true); }} variant="outline" className="w-full h-10 text-[9px] font-black uppercase"><Plus className="h-3 w-3 mr-2" /> New Dept</Button></div>
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleSaveMasterProduct} className="w-full h-16 rounded-2xl bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 font-black uppercase tracking-widest">{editingMaster ? "Update" : "Create"}</Button>
          </div>
        </DialogContent>
      </Dialog>

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="space-y-1 text-left">
          <h2 className="text-3xl font-black text-zinc-900 dark:text-white uppercase italic tracking-tighter">Inventory</h2>
          <p className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest opacity-60">Master Catalog</p>
        </div>
        <div className="flex flex-wrap gap-2 w-full sm:w-auto">
          <Button variant="outline" onClick={() => setIsCategoryManagerOpen(true)} className="h-11 rounded-xl font-black uppercase text-[9px] tracking-widest border-zinc-200 dark:border-zinc-800 dark:text-white shadow-sm flex gap-2"><Settings2 className="h-4 w-4" /> Depts</Button>
          
          <DropdownMenu>
            <DropdownMenuTrigger>
               <div className="h-11 rounded-xl font-black uppercase text-[9px] tracking-widest border border-zinc-200 dark:border-zinc-800 dark:text-white flex items-center justify-center px-4 cursor-pointer gap-2">
                  {isExporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />} Catalog
               </div>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="rounded-2xl p-2 bg-white dark:bg-zinc-900 border-none shadow-2xl min-w-[200px] z-[6000]">
               <DropdownMenuItem onClick={() => handleExport('img')} className="rounded-xl h-12 flex gap-3 font-black text-[10px] uppercase cursor-pointer">
                  <ImageIcon className="h-4 w-4 text-blue-500" /> Export HD Image
               </DropdownMenuItem>
               <DropdownMenuItem onClick={() => handleExport('pdf')} className="rounded-xl h-12 flex gap-3 font-black text-[10px] uppercase cursor-pointer">
                  <FileText className="h-4 w-4 text-red-500" /> Export Pro PDF
               </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button variant="outline" onClick={() => setIsImportOpen(true)} className="h-11 rounded-xl font-black uppercase text-[10px] tracking-widest border-zinc-200 dark:border-zinc-800 dark:text-white shadow-sm">Import</Button>
          <Button onClick={() => handleOpenMasterModal()} className="h-11 rounded-xl bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 font-black uppercase text-[10px] tracking-widest px-6 shadow-xl active:scale-95"><Plus className="mr-2 h-4 w-4" /> Add Product</Button>
        </div>
      </div>

      <AnimatePresence>
        {isSelectionMode && (
          <motion.div initial={{ y: 50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 50, opacity: 0 }} className="fixed bottom-28 left-1/2 -translate-x-1/2 z-[60] w-[90%] max-w-xl bg-blue-600 text-white rounded-3xl p-4 shadow-2xl flex items-center justify-between border border-blue-400">
             <div className="flex items-center gap-4 px-4"><CheckCircle2 className="h-5 w-5" /><span className="font-black uppercase text-xs tracking-widest">{selectedIds.length} SELECTED</span></div>
             <div className="flex gap-2"><Button onClick={handleBulkCategory} className="bg-white text-blue-600 hover:bg-blue-50 font-black uppercase text-[10px] tracking-widest h-11 rounded-xl px-6"><FolderInput className="h-4 w-4 mr-2" /> Assign Dept</Button><Button onClick={handleBulkDelete} className="bg-red-500 text-white hover:bg-red-600 font-black uppercase text-[10px] tracking-widest h-11 rounded-xl px-6"><Trash2 className="h-4 w-4 mr-2" /> Delete</Button><Button variant="ghost" onClick={() => setSelectedIds([])} className="h-11 w-11 rounded-xl text-white/50 hover:text-white"><X className="h-5 w-5" /></Button></div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex flex-col md:flex-row gap-4 items-center relative z-30">
        <div className="relative group flex-1 w-full"><Search className="absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5 text-zinc-400 group-focus-within:text-zinc-900 dark:group-focus-within:text-white" /><Input placeholder="Search catalog..." className="pl-14 h-16 rounded-2xl bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 shadow-xl font-bold tracking-tight text-lg dark:text-white" value={search} onChange={e=>setSearch(e.target.value)} /></div>
        <div className="flex bg-zinc-100 dark:bg-zinc-800 p-1.5 rounded-2xl shadow-inner gap-1 self-stretch md:self-auto"><button onClick={() => setViewMode('grid')} className={cn("px-4 h-11 rounded-xl flex items-center gap-2 font-black text-[9px] uppercase tracking-widest transition-all", viewMode === 'grid' ? "bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white shadow-sm" : "text-zinc-400")}><LayoutGrid className="h-4 w-4" /> Grid</button><button onClick={() => setViewMode('list')} className={cn("px-4 h-11 rounded-xl flex items-center gap-2 font-black text-[9px] uppercase tracking-widest transition-all", viewMode === 'list' ? "bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white shadow-sm" : "text-zinc-400")}><List className="h-4 w-4" /> List</button></div>
      </div>

      <div className="pb-10">
        {viewMode === 'grid' ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6">
            {filteredVariants.map(v => {
              const isSelected = selectedIds.includes(v.id);
              return (
                <div key={v.id} className="relative group">
                  <div className={cn("transition-all duration-300", isSelected && "scale-95 opacity-80")}><ProductCard variant={v as any} onClick={() => isSelectionMode ? setSelectedIds(prev => isSelected ? prev.filter(id=>id!==v.id) : [...prev, v.id]) : setSelectedBarcodeItem(v)} /></div>
                  <button onClick={(e) => { e.stopPropagation(); setSelectedIds(prev => isSelected ? prev.filter(id=>id!==v.id) : [...prev, v.id]); }} className={cn("absolute top-3 left-3 p-2 rounded-xl transition-all z-20 shadow-xl", isSelected ? "bg-blue-600 text-white" : "bg-white/80 dark:bg-zinc-800/80 text-zinc-400 opacity-0 group-hover:opacity-100 hover:text-blue-600")}>{isSelected ? <CheckSquare className="h-5 w-5" /> : <Square className="h-5 w-5" />}</button>
                  <div className="absolute top-2 right-2 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-all"><button onClick={(e) => { e.stopPropagation(); handleOpenVariantModal(v); }} className="p-2.5 bg-white dark:bg-zinc-800 rounded-full text-blue-600 shadow-xl border border-zinc-100 dark:border-zinc-700 hover:bg-blue-600 hover:text-white"><Edit2 className="h-4 w-4" /></button><button onClick={(e) => { e.stopPropagation(); handleDeleteVariant(v); }} className="p-2.5 bg-white dark:bg-zinc-800 rounded-full text-red-500 shadow-xl border border-zinc-100 dark:border-zinc-700 hover:bg-red-500 hover:text-white"><Trash2 className="h-4 w-4" /></button></div>
                </div>
              );
            })}
            <Button variant="outline" className="h-full min-h-[200px] border-2 border-dashed rounded-[2.5rem] flex flex-col gap-3 dark:border-zinc-800 dark:text-zinc-500 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-all w-full" onClick={() => handleOpenVariantModal()}><div className="p-4 bg-zinc-100 dark:bg-zinc-800 rounded-full shadow-inner"><Plus className="h-8 w-8 text-zinc-400" /></div><span className="text-[10px] font-black uppercase tracking-widest">New Variant</span></Button>
          </div>
        ) : (
          <Card className="border-zinc-200 dark:border-zinc-800 shadow-2xl rounded-[2.5rem] overflow-hidden bg-white dark:bg-zinc-900">
             <Table>
                <TableHeader className="bg-zinc-50 dark:bg-zinc-950/50"><TableRow className="h-16 border-none text-left"><TableHead className="w-12"></TableHead><TableHead className="pl-4 font-black uppercase text-[10px] tracking-widest">Brand/Variant</TableHead><TableHead className="font-black uppercase text-[10px] tracking-widest">Stock</TableHead><TableHead className="font-black uppercase text-[10px] tracking-widest text-right">Price</TableHead><TableHead className="pr-8 text-right font-black uppercase text-[10px] tracking-widest">Actions</TableHead></TableRow></TableHeader>
                <TableBody>
                   {filteredVariants.map(v => {
                     const isSelected = selectedIds.includes(v.id);
                     return (
                       <TableRow key={v.id} className={cn("h-20 border-zinc-50 dark:border-zinc-800 hover:bg-zinc-50/50 dark:hover:bg-zinc-800/30 transition-colors group text-left", isSelected && "bg-blue-50 dark:bg-blue-900/20")}>
                          <TableCell className="pl-6"><button onClick={() => setSelectedIds(prev => isSelected ? prev.filter(id=>id!==v.id) : [...prev, v.id])} className={cn("transition-colors", isSelected ? "text-blue-600" : "text-zinc-300")}>{isSelected ? <CheckSquare className="h-5 w-5" /> : <Square className="h-5 w-5" />}</button></TableCell>
                          <TableCell className="pl-4"><div className="font-black text-zinc-900 dark:text-white uppercase italic text-base leading-none mb-1">{v.productName}</div><div className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">{v.size} &bull; {v.barcode}</div></TableCell>
                          <TableCell><Badge className={cn("rounded-lg font-black text-[10px]", v.stock < 5 ? "bg-red-500" : "bg-emerald-500")}>{v.stock} {v.unit.toUpperCase()}</Badge></TableCell>
                          <TableCell className="text-right font-black text-xl tracking-tighter dark:text-white">₹{(v.pricing_type === 'bundle' && v.bundle_price) ? v.bundle_price : v.base_price}</TableCell>
                          <TableCell className="pr-8 text-right"><div className="flex gap-2 justify-end"><Button variant="ghost" size="icon" onClick={() => setSelectedBarcodeItem(v)} className="h-10 w-10 text-zinc-400"><BarcodeIcon className="h-4 w-4" /></Button><Button variant="ghost" size="icon" onClick={() => handleOpenVariantModal(v)} className="h-10 w-10 text-blue-500 hover:bg-blue-50"><Edit2 className="h-4 w-4" /></Button><Button variant="ghost" size="icon" onClick={() => handleDeleteVariant(v)} className="h-10 w-10 text-red-400 hover:bg-red-50"><Trash2 className="h-4 w-4" /></Button></div></TableCell>
                       </TableRow>
                     );
                   })}
                </TableBody>
             </Table>
          </Card>
        )}
      </div>

      <Dialog open={!!selectedProductId || !!editingVariant} onOpenChange={o => { if(!o) { setSelectedProductId(null); setEditingVariant(null); } }}>
        <DialogContent className="rounded-[2.5rem] p-10 max-w-md bg-white dark:bg-zinc-900 border-none shadow-2xl max-h-[90vh] overflow-y-auto">
           <DialogHeader><DialogTitle className="text-2xl font-black italic uppercase dark:text-white leading-tight">{editingVariant ? "MODIFY VARIANT" : "DEPLOY VARIANT"}<br/><span className="text-blue-600">{products.find(p => p.id === selectedProductId)?.name || "SELECT BRAND"}</span></DialogTitle></DialogHeader>
           <div className="space-y-6 pt-6 text-left">
              {!editingVariant && (
                <div className="space-y-2"><Label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 ml-1">Parent Entity (Brand)</Label><Select onValueChange={(val: any) => setSelectedProductId(val)} value={selectedProductId || ""}><SelectTrigger className="h-14 rounded-2xl font-bold bg-zinc-50 dark:bg-zinc-800 dark:border-zinc-700 dark:text-white"><SelectValue>{products.find(p => p.id === selectedProductId)?.name || "Select Brand"}</SelectValue></SelectTrigger><SelectContent className="bg-white dark:bg-zinc-800 z-[6000] border-zinc-100 dark:border-zinc-700">{products.map(p => <SelectItem key={p.id} value={p.id} className="font-bold">{p.name}</SelectItem>)}</SelectContent></Select></div>
              )}
              <div className="space-y-2"><Label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 ml-1">Pricing Strategy</Label><div className="grid grid-cols-3 gap-2">{['standard', 'bundle', 'weight'].map(m => (<button key={m} type="button" onClick={()=>setPricingMode(m as any)} className={cn("h-12 rounded-xl text-[8px] font-black uppercase tracking-tighter border transition-all", (newPricingType === m || (m === 'weight' && newUnit === 'kg')) ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 border-transparent shadow-lg scale-105" : "bg-zinc-50 dark:bg-zinc-800 text-zinc-400 dark:border-zinc-700")}>{m === 'bundle' ? 'Combo' : m}</button>))}</div></div>
              <div className="grid grid-cols-2 gap-4"><div className="space-y-2"><Label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 ml-1">Size Details</Label><Input value={newSize} onChange={e=>setNewSize(e.target.value)} placeholder="e.g. 5 Litre" className="h-14 rounded-2xl bg-zinc-50 dark:bg-zinc-800 dark:border-zinc-700 font-bold dark:text-white" /></div><div className="space-y-2"><Label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 ml-1">Units in Pack</Label><Input type="number" value={newUnitsPerCombo} onChange={e=>setNewUnitsPerCombo(e.target.value)} placeholder="1" className="h-14 rounded-2xl bg-zinc-50 dark:bg-zinc-800 dark:border-zinc-700 font-bold dark:text-white" /></div></div>
              <div className="grid grid-cols-2 gap-4"><div className="space-y-2"><Label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 ml-1">Opening Stock</Label><Input type="number" value={newStock} onChange={e=>setNewStock(e.target.value)} placeholder="0" className="h-14 rounded-2xl bg-zinc-50 dark:bg-zinc-800 dark:border-zinc-700 font-bold dark:text-white" /></div><div className="space-y-2">{newPricingType === 'standard' ? (<><Label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 ml-1">Retail Price ₹</Label><Input type="number" value={newPrice} onChange={e=>setNewPrice(e.target.value)} placeholder="₹" className="h-14 rounded-2xl bg-zinc-50 dark:bg-zinc-800 dark:border-zinc-700 font-black text-blue-600 dark:text-blue-400" /></>) : (<><Label className="text-[10px] font-black uppercase tracking-widest text-blue-600 ml-1">Combo Total ₹</Label><div className="flex flex-col gap-2"><Input type="number" value={newBundlePrice} onChange={e=>setNewBundlePrice(e.target.value)} placeholder="Total Price ₹" className="h-14 rounded-2xl bg-blue-50/50 dark:bg-blue-900/20 border-blue-100 dark:border-blue-900 font-black text-blue-600 dark:text-blue-400 shadow-inner" /><Input type="number" value={newPrice} onChange={e=>setNewPrice(e.target.value)} placeholder="Loose Price ₹" className="h-10 rounded-xl bg-zinc-50 dark:bg-zinc-800 text-xs" /></div></>)}</div></div>
              <div className="space-y-2"><Label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 ml-1">Variant Identity</Label><div className="border-2 border-dashed border-zinc-200 dark:border-zinc-700 rounded-2xl p-6 flex flex-col items-center gap-3 relative bg-zinc-50 dark:bg-zinc-800/50 group hover:border-zinc-300 dark:hover:border-zinc-600 transition-colors overflow-hidden text-center text-zinc-400 font-bold uppercase text-[9px]"><input type="file" accept="image/*" className="absolute inset-0 opacity-0 cursor-pointer z-10" onChange={e=>setCapturedFile(e.target.files?.[0] || null)} />{capturedFile ? (<div className="relative w-full h-20"><img src={URL.createObjectURL(capturedFile)} className="w-full h-full object-cover rounded-xl" /><div className="absolute inset-0 bg-blue-600/10 animate-pulse rounded-xl" /></div>) : (<><Camera className="h-8 w-8 text-zinc-300" />Update Media</>)}</div></div>
              <Button onClick={handleSaveVariant} disabled={isUploading} className="w-full h-20 rounded-[2.5rem] bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 font-black uppercase tracking-[0.2em] text-xs shadow-2xl active:scale-95 transition-all">{isUploading ? <Loader2 className="h-6 w-6 animate-spin" /> : (editingVariant ? 'UPDATE DEPLOYMENT' : 'AUTHORISE DEPLOYMENT')}</Button>
           </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
