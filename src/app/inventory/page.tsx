"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Search, ChevronDown, PackageOpen, Tag, Barcode, Camera, UploadCloud, AlertTriangle, Truck, Trash2, Link as LinkIcon, Image as ImageIcon, LayoutGrid, List } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
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
import { BulkImportModal } from "@/components/BulkImportModal";
import { cn } from "@/lib/utils";

export default function Inventory() {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState<"catalog" | "list">("catalog");
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [capturedFile, setCapturedFile] = useState<File | null>(null);
  
  const [isBulkImportOpen, setIsBulkImportOpen] = useState(false);
  
  const [newSize, setNewSize] = useState("");
  const [newStock, setNewStock] = useState("");
  const [newPrice, setNewPrice] = useState("");
  const [newMsp, setNewMsp] = useState("");
  const [newImageUrl, setNewImageUrl] = useState("");
  const [newUnit, setNewUnit] = useState<"pcs" | "kg">("pcs");
  const [newProductName, setNewProductName] = useState("");
  const [newProductCategory, setNewProductCategory] = useState("Buckets");

  const productsData = useLiveQuery(async () => {
    // Production Fix: Filter out deleted items
    const prods = await db.products.where('is_deleted').equals(0).toArray();
    const vars = await db.variants.where('is_deleted').equals(0).toArray();
    
    return prods.map(p => ({
      ...p,
      variants: vars.filter(v => v.product_id === p.id)
    }));
  }, []);

  if (!productsData) {
    return (
      <div className="flex items-center justify-center h-full py-20">
        <div className="text-zinc-400 font-black uppercase tracking-[0.3em] animate-pulse text-xs">
          Syncing Catalog...
        </div>
      </div>
    );
  }

  const handleImageCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const imageUrl = URL.createObjectURL(file);
      setCapturedImage(imageUrl);
      setCapturedFile(file);
      setNewImageUrl(""); 
    }
  };

  const handleDeleteProduct = async (product: any, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm(`Are you sure you want to delete ${product.name} and all its variants?`)) return;
    
    try {
      const now = new Date().toISOString();
      await db.transaction('rw', db.products, db.variants, async () => {
        // Production logic: Soft delete so it syncs deletion to other devices
        await db.products.update(product.id, { is_deleted: 1, updated_at: now });
        
        const vars = await db.variants.where({ product_id: product.id }).toArray();
        for (const v of vars) {
           await db.variants.update(v.id, { is_deleted: 1, updated_at: now });
        }
      });
      toast.success("Product deleted successfully");
    } catch (e) {
      toast.error("Failed to delete product");
    }
  };

  const handleDeleteVariant = async (variant: any) => {
    if (!confirm(`Are you sure you want to delete variant: ${variant.size}?`)) return;
    
    try {
      // Soft delete for sync reliability
      await db.variants.update(variant.id, { is_deleted: 1, updated_at: new Date().toISOString() });
      toast.success("Variant deleted successfully");
    } catch (e) {
      toast.error("Failed to delete variant");
    }
  };

  const handleAddVariant = async (productId: string) => {
    if (!newSize || !newStock || !newPrice || !newMsp) {
      toast.error("Please fill all variant fields");
      return;
    }
    
    let finalImageUrl = newImageUrl || undefined;

    if (capturedFile) {
      toast.info("Compressing & Uploading image...", { id: 'upload' });
      try {
        const options = { maxSizeMB: 0.1, maxWidthOrHeight: 1024, useWebWorker: true };
        const compressedFile = await imageCompression(capturedFile, options);

        const fileExt = capturedFile.name.split('.').pop() || 'jpg';
        const fileName = `${uuidv4()}.${fileExt}`;
        const { error } = await supabase.storage.from('product-images').upload(`variants/${fileName}`, compressedFile);
          
        if (!error) {
          const { data: publicUrlData } = supabase.storage.from('product-images').getPublicUrl(`variants/${fileName}`);
          finalImageUrl = publicUrlData.publicUrl;
          toast.success("Image compressed & uploaded!", { id: 'upload' });
          
          const prod = await db.products.get(productId);
          if (prod && !prod.image_url) {
            await db.products.update(productId, { image_url: finalImageUrl, updated_at: new Date().toISOString() });
          }
        }
      } catch (e) { console.error(e); }
    }
    
    try {
      const now = new Date().toISOString();
      await db.variants.add({
        id: uuidv4(),
        product_id: productId,
        size: newSize,
        unit: newUnit,
        stock: parseInt(newStock),
        dented_stock: 0,
        cost_price: parseInt(newMsp),
        msp: parseInt(newMsp),
        base_price: parseInt(newPrice),
        image_url: finalImageUrl,
        created_at: now,
        updated_at: now,
        is_deleted: 0,
        sync_status: 'pending'
      });
      toast.success("Variant added!");
      setNewSize(""); setNewStock(""); setNewPrice(""); setNewMsp(""); setNewImageUrl(""); setNewUnit("pcs");
      setCapturedImage(null); setCapturedFile(null);
    } catch (e) {
      toast.error("Database error");
    }
  };

  const handleAddStock = async (variantId: string, currentStock: number) => {
    const qty = prompt("How many units received?");
    if (qty && !isNaN(Number(qty))) {
      await db.variants.update(variantId, { 
        stock: currentStock + Number(qty),
        updated_at: new Date().toISOString()
      });
      toast.success("Stock updated");
    }
  };

  const handleMarkDamaged = async (variantId: string, currentStock: number, currentDented: number) => {
    const qty = prompt("How many units damaged?");
    if (qty && !isNaN(Number(qty))) {
      const num = Number(qty);
      if (num > currentStock) { toast.error("Too much!"); return; }
      await db.variants.update(variantId, { 
        stock: currentStock - num, 
        dented_stock: currentDented + num,
        updated_at: new Date().toISOString()
      });
      toast.success("Marked damaged");
    }
  };

  const handleAddMasterProduct = async () => {
    if (!newProductName) { toast.error("Enter product name"); return; }
    const now = new Date().toISOString();
    await db.products.add({ 
      id: uuidv4(), 
      name: newProductName, 
      category: newProductCategory, 
      created_at: now,
      updated_at: now,
      is_deleted: 0,
      sync_status: 'pending'
    });
    toast.success("Master Product added!");
    setNewProductName("");
  };

  const filteredProducts = productsData?.filter(p => 
    p.name.toLowerCase().includes(search.toLowerCase()) || 
    p.category.toLowerCase().includes(search.toLowerCase())
  ) || [];

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <BulkImportModal isOpen={isBulkImportOpen} onClose={() => setIsBulkImportOpen(false)} />
      <div className="flex flex-col sm:flex-row gap-4 justify-between sm:items-end">
        <div className="flex gap-2 p-1 bg-zinc-100 rounded-2xl w-fit text-left">
          <Button variant="ghost" className={`rounded-xl h-10 px-4 flex gap-2 font-black text-[10px] uppercase tracking-widest ${viewMode === 'catalog' ? 'bg-white shadow-sm text-zinc-900' : 'text-zinc-400'}`} onClick={() => setViewMode('catalog')}><LayoutGrid className="h-4 w-4" /> Catalog</Button>
          <Button variant="ghost" className={`rounded-xl h-10 px-4 flex gap-2 font-black text-[10px] uppercase tracking-widest ${viewMode === 'list' ? 'bg-white shadow-sm text-zinc-900' : 'text-zinc-400'}`} onClick={() => setViewMode('list')}><List className="h-4 w-4" /> Flat List</Button>
        </div>
        <div className="flex gap-3">
          <Button onClick={() => setIsBulkImportOpen(true)} className="bg-zinc-900 hover:bg-black text-white shadow-2xl rounded-2xl h-14 px-8 font-black transition-all active:scale-95"><Plus className="mr-2 h-5 w-5" /> Bulk Import</Button>
          <Dialog>
            <DialogTrigger render={<Button size="lg" className="bg-white border-2 border-zinc-900 hover:bg-zinc-50 text-zinc-900 shadow-2xl rounded-2xl h-14 px-8 font-black transition-all active:scale-95" />} >
              <Plus className="mr-2 h-5 w-5" /> Add Master Product
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px] rounded-[2.5rem] border-none shadow-2xl bg-white/90 backdrop-blur-2xl">
              <DialogHeader><DialogTitle className="text-2xl font-black text-zinc-900 text-left">Add Master Product</DialogTitle></DialogHeader>
              <div className="grid gap-6 py-6 text-left">
                <div className="space-y-2">
                  <Label className="font-black text-[10px] uppercase tracking-widest text-zinc-400">Product Name</Label>
                  <Input value={newProductName} onChange={e => setNewProductName(e.target.value)} placeholder="e.g. Royal Steel Thali" className="h-14 rounded-2xl" />
                </div>
                <div className="space-y-2">
                  <Label className="font-black text-[10px] uppercase tracking-widest text-zinc-400">Category</Label>
                  <Input value={newProductCategory} onChange={e => setNewProductCategory(e.target.value)} placeholder="e.g. Plates" className="h-14 rounded-2xl" />
                </div>
              </div>
              <Button onClick={handleAddMasterProduct} className="w-full h-16 text-lg rounded-2xl bg-zinc-900 text-white font-black uppercase tracking-widest">Save Product</Button>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5 text-zinc-400" />
        <Input placeholder="Search catalog..." className="pl-14 h-16 text-lg bg-white/70 backdrop-blur-3xl border-zinc-100 shadow-2xl rounded-2xl" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      <div className="grid gap-6">
        {!productsData ? <div className="text-center py-20 text-zinc-400 font-black uppercase tracking-widest animate-pulse">Loading...</div> : 
         viewMode === 'catalog' ? (
          filteredProducts.map((product) => (
            <Card key={product.id} className="overflow-hidden border-none shadow-2xl bg-white/70 backdrop-blur-3xl rounded-[2.5rem]">
              <div className="p-6 sm:p-8 flex flex-col sm:flex-row items-start sm:items-center justify-between cursor-pointer hover:bg-zinc-50/50 transition-all gap-6" onClick={() => setExpandedId(expandedId === product.id ? null : product.id)}>
                <div className="flex items-center gap-6 w-full sm:w-auto text-left">
                  <Avatar className="h-24 w-24 rounded-3xl bg-white shrink-0 shadow-xl border border-zinc-50"><AvatarImage src={product.image_url} className="object-cover mix-blend-multiply" /><AvatarFallback className="rounded-3xl bg-zinc-50"><PackageOpen className="h-10 w-10 text-zinc-300" /></AvatarFallback></Avatar>
                  <div className="flex-1 text-left">
                    <h3 className="font-black text-2xl text-zinc-900 uppercase italic">{product.name}</h3>
                    <div className="flex flex-wrap items-center gap-2 mt-2">
                      <Badge className="bg-zinc-900 text-white font-black px-3 py-1 text-[10px] uppercase tracking-widest">{product.category}</Badge>
                      <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest border px-2 py-1 rounded-lg shadow-sm bg-white">{product.variants.length} SIZES</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-between w-full sm:w-auto border-t sm:border-t-0 pt-4 sm:pt-0 border-zinc-100">
                  <Button variant="ghost" size="icon" className="text-zinc-300 hover:text-red-500 mr-4 h-12 w-12" onClick={(e) => handleDeleteProduct(product, e)}><Trash2 className="h-6 w-6" /></Button>
                  <motion.div animate={{ rotate: expandedId === product.id ? 180 : 0 }} transition={{ duration: 0.3 }}><ChevronDown className="h-8 w-8 text-zinc-300" /></motion.div>
                </div>
              </div>

              <AnimatePresence>
                {expandedId === product.id && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="border-t border-zinc-100 bg-zinc-50/30 overflow-hidden text-left">
                    <CardContent className="p-8">
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {product.variants.map(variant => (
                          <div key={variant.id} className="bg-white border border-zinc-100 rounded-[2rem] p-6 shadow-xl relative overflow-hidden group">
                            <div className="flex justify-between items-start mb-6">
                              <Badge className="bg-blue-50 text-blue-700 font-black px-4 py-1.5 rounded-xl text-[10px] uppercase tracking-widest">{variant.size}</Badge>
                              <div className="flex gap-2"><Button variant="ghost" size="icon" className="h-10 w-10 text-zinc-300 hover:text-red-500" onClick={() => handleDeleteVariant(variant)}><Trash2 className="h-5 w-5" /></Button><Button variant="ghost" size="icon" className="h-10 w-10 text-zinc-300 hover:text-blue-600"><Barcode className="h-5 w-5" /></Button></div>
                            </div>
                            <div className="space-y-5">
                              <div className="flex justify-between items-center bg-zinc-100/50 p-4 rounded-2xl shadow-inner"><span className="text-zinc-500 font-black text-[10px] uppercase tracking-widest">Fresh Stock</span><span className="font-black text-zinc-900 text-2xl tracking-tighter">{variant.stock} <small className="text-xs text-zinc-400">PCS</small></span></div>
                              <div className="flex gap-3"><Button variant="outline" className="flex-1 rounded-[1.25rem] font-black uppercase text-[10px] h-12" onClick={() => handleAddStock(variant.id, variant.stock)}><Truck className="mr-2 h-4 w-4 text-emerald-500" /> Stock In</Button><Button variant="outline" className="flex-1 rounded-[1.25rem] font-black uppercase text-[10px] h-12" onClick={() => handleMarkDamaged(variant.id, variant.stock, variant.dented_stock)}><AlertTriangle className="mr-2 h-4 w-4 text-amber-500" /> Damage</Button></div>
                              {variant.dented_stock > 0 && <div className="flex justify-between items-center px-2 py-3 bg-amber-50/50 rounded-xl"><span className="text-amber-700 font-black text-[10px] uppercase tracking-widest flex items-center gap-2"><AlertTriangle className="h-4 w-4" /> Clearance</span><span className="font-black text-amber-700 text-lg">{variant.dented_stock} PCS</span></div>}
                              <div className="pt-6 border-t border-zinc-100 space-y-3"><div className="flex justify-between items-center"><span className="text-zinc-400 font-black text-[10px] uppercase tracking-widest">Display MRP</span><span className="font-black text-zinc-900 text-xl tracking-tighter">₹{variant.base_price}</span></div><div className="flex justify-between items-center"><span className="text-zinc-400 font-black text-[10px] uppercase tracking-widest">Bottom (MSP)</span><span className="font-black text-red-500 text-xl tracking-tighter">₹{variant.msp}</span></div></div>
                            </div>
                          </div>
                        ))}
                        <Dialog onOpenChange={(isOpen) => { if(!isOpen) { setCapturedImage(null); setCapturedFile(null); setNewImageUrl(""); } }}>
                          <DialogTrigger render={<button className="border-4 border-dashed border-zinc-200 rounded-[2rem] p-6 flex flex-col items-center justify-center text-zinc-400 hover:text-zinc-900 hover:border-zinc-900 transition-all min-h-[300px] group" />} ><div className="p-6 bg-zinc-50 shadow-inner rounded-full mb-4 group-hover:bg-white transition-all"><Plus className="h-10 w-10 text-zinc-300 group-hover:text-zinc-900" /></div><span className="font-black text-sm uppercase tracking-widest">New Size / Variant</span></DialogTrigger>
                          <DialogContent className="sm:max-w-[500px] rounded-[2.5rem] border-none shadow-2xl bg-white/90 backdrop-blur-2xl">
                            <DialogHeader><DialogTitle className="text-2xl font-black text-zinc-900 text-left">Add New Variant</DialogTitle></DialogHeader>
                            <div className="grid gap-6 py-4">
                              <Tabs defaultValue="camera" className="w-full">
                                <TabsList className="grid w-full grid-cols-3 bg-zinc-100 rounded-2xl p-1 h-14"><TabsTrigger value="camera" className="rounded-xl font-black text-[10px] uppercase tracking-widest"><Camera className="h-4 w-4 mr-2" /> Camera</TabsTrigger><TabsTrigger value="file" className="rounded-xl font-black text-[10px] uppercase tracking-widest"><ImageIcon className="h-4 w-4 mr-2" /> File</TabsTrigger><TabsTrigger value="url" className="rounded-xl font-black text-[10px] uppercase tracking-widest"><LinkIcon className="h-4 w-4 mr-2" /> URL</TabsTrigger></TabsList>
                                <TabsContent value="camera" className="mt-4"><div className="relative overflow-hidden border-4 border-dashed border-zinc-100 rounded-3xl flex flex-col items-center justify-center bg-zinc-50 h-64 shadow-inner"><input type="file" accept="image/*" capture="environment" className="absolute inset-0 w-full h-full opacity-0 z-10 cursor-pointer" onChange={handleImageCapture} />{capturedImage ? <img src={capturedImage} className="absolute inset-0 w-full h-full object-cover" /> : <div className="text-center text-zinc-400 font-black text-[10px] uppercase tracking-widest"><Camera className="h-12 w-12 mx-auto mb-2 opacity-20" /> Open Camera</div>}</div></TabsContent>
                                <TabsContent value="file" className="mt-4"><div className="relative overflow-hidden border-4 border-dashed border-zinc-100 rounded-3xl flex flex-col items-center justify-center bg-zinc-50 h-64 shadow-inner"><input type="file" accept="image/*" className="absolute inset-0 w-full h-full opacity-0 z-10 cursor-pointer" onChange={handleImageCapture} />{capturedImage ? <img src={capturedImage} className="absolute inset-0 w-full h-full object-cover" /> : <div className="text-center text-zinc-400 font-black text-[10px] uppercase tracking-widest"><UploadCloud className="h-12 w-12 mx-auto mb-2 opacity-20" /> Pick Photo</div>}</div></TabsContent>
                                <TabsContent value="url" className="mt-4 text-left"><div className="border-4 border-dashed border-zinc-100 rounded-3xl p-6 bg-zinc-50 h-64 flex flex-col justify-center gap-4 shadow-inner"><Label className="font-black text-[10px] uppercase tracking-widest text-zinc-400">Image URL</Label><Input value={newImageUrl} onChange={e => { setNewImageUrl(e.target.value); setCapturedImage(e.target.value); setCapturedFile(null); }} placeholder="https://..." className="h-14 rounded-xl shadow-lg border-none" /></div></TabsContent>
                              </Tabs>
                              <div className="grid grid-cols-2 gap-6 text-left">
                                <div className="space-y-2"><Label className="font-black text-[10px] uppercase tracking-widest text-zinc-400">Size / Label</Label><Input value={newSize} onChange={e => setNewSize(e.target.value)} placeholder="e.g. Size 20" className="h-14 rounded-2xl" /></div>
                                <div className="space-y-2">
                                  <Label className="font-black text-[10px] uppercase tracking-widest text-zinc-400">Unit</Label>
                                  <div className="grid grid-cols-2 gap-2 p-1 bg-zinc-100 rounded-xl h-14">
                                    <Button variant="ghost" className={cn("rounded-lg h-full font-black text-[10px] uppercase transition-all", newUnit === 'pcs' ? "bg-white shadow-sm text-zinc-900" : "text-zinc-400 hover:text-zinc-600")} onClick={() => setNewUnit('pcs')}>PCS</Button>
                                    <Button variant="ghost" className={cn("rounded-lg h-full font-black text-[10px] uppercase transition-all", newUnit === 'kg' ? "bg-white shadow-sm text-zinc-900" : "text-zinc-400 hover:text-zinc-600")} onClick={() => setNewUnit('kg')}>KG</Button>
                                  </div>
                                </div>
                                <div className="space-y-2"><Label className="font-black text-[10px] uppercase tracking-widest text-zinc-400">Stock</Label><Input type="number" value={newStock} onChange={e => setNewStock(e.target.value)} placeholder="0" className="h-14 rounded-2xl" /></div>
                                <div className="space-y-2"><Label className="font-black text-[10px] uppercase tracking-widest text-zinc-400">Price (₹)</Label><Input type="number" value={newPrice} onChange={e => setNewPrice(e.target.value)} className="h-14 rounded-2xl text-blue-600 font-black" /></div>
                                <div className="space-y-2 col-span-2"><Label className="font-black text-[10px] uppercase tracking-widest text-zinc-400">Bottom (₹)</Label><Input type="number" value={newMsp} onChange={e => setNewMsp(e.target.value)} className="h-14 rounded-2xl text-red-500 font-black" /></div>
                              </div>
                            </div>
                            <Button onClick={() => handleAddVariant(product.id)} className="w-full h-20 text-xl rounded-[1.5rem] bg-zinc-900 text-white font-black uppercase tracking-widest">Save Variant</Button>
                          </DialogContent>
                        </Dialog>
                      </div>
                    </CardContent>
                  </motion.div>
                )}
              </AnimatePresence>
            </Card>
          ))
        ) : (
          <Card className="border-none shadow-2xl bg-white/70 backdrop-blur-3xl rounded-[2.5rem] overflow-hidden">
            <CardContent className="p-0">
              <Table>
                <TableHeader className="bg-zinc-100/50 border-none"><TableRow className="border-none h-16 text-left"><TableHead className="pl-8 font-black uppercase text-[10px] tracking-widest text-zinc-400">Product</TableHead><TableHead className="font-black uppercase text-[10px] tracking-widest text-zinc-400">Category</TableHead><TableHead className="text-right font-black uppercase text-[10px] tracking-widest text-zinc-400">Stock</TableHead><TableHead className="text-right pr-8 font-black uppercase text-[10px] tracking-widest text-zinc-400">MRP</TableHead></TableRow></TableHeader>
                <TableBody>
                  {productsData.flatMap(p => p.variants.map(v => ({ ...v, productName: p.name, category: p.category })))
                    .filter(v => v.productName.toLowerCase().includes(search.toLowerCase()) || v.size.toLowerCase().includes(search.toLowerCase()))
                    .map(item => (
                      <TableRow key={item.id} className="hover:bg-zinc-50 border-none transition-all text-left">
                        <TableCell className="pl-8 py-6"><div className="font-black text-zinc-900 uppercase tracking-tight italic">{item.productName}</div><div className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mt-1">{item.size}</div></TableCell>
                        <TableCell><Badge className="bg-zinc-100 text-zinc-400 font-black text-[9px] uppercase shadow-none border-none">{item.category}</Badge></TableCell>
                        <TableCell className="text-right"><span className={`font-black text-xl tracking-tighter ${item.stock < 5 ? 'text-red-500' : 'text-zinc-900'}`}>{item.stock} <small className="text-[10px] text-zinc-400 uppercase">{item.unit || 'pcs'}</small></span></TableCell>
                        <TableCell className="text-right pr-8 font-black text-zinc-900 text-xl tracking-tighter">₹{item.base_price}</TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
