"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  ScanLine, Trash2, Minus, Plus, Tag, CreditCard,
  IndianRupee, QrCode, Users, Search, Percent, AlertTriangle,
  Package, ShoppingCart, ArrowRight, CheckCircle2, ChevronRight
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useLiveQuery } from "dexie-react-hooks";
import { db, Variant, Product } from "@/lib/db";
import { toast } from "sonner";
import { v4 as uuidv4 } from "uuid";
import { ReceiptModal } from "@/components/ReceiptModal";
import { GstInvoiceModal } from "@/components/GstInvoiceModal";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

interface CartItem extends Variant {
  qty: number;
  productName: string;
  image?: string;
}

export default function POS() {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [discount, setDiscount] = useState(0);
  const [paymentMode, setPaymentMode] = useState<"cash" | "upi" | "split" | "khata">("cash");
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  
  const [showReceipt, setShowReceipt] = useState(false);
  const [lastSale, setLastSale] = useState<any>(null);
  const [lastItems, setLastItems] = useState<any[]>([]);

  const [isGstModalOpen, setIsGstModalOpen] = useState(false);
  const [gstInitialItems, setGstInitialItems] = useState<any[]>([]);

  const catalogData = useLiveQuery(async () => {
    const prods = await db.products.where('is_deleted').equals(0).toArray();
    const vars = await db.variants.where('is_deleted').equals(0).toArray();
    
    return vars.map(v => {
      const p = prods.find(p => p.id === v.product_id);
      return {
        ...v,
        productName: p?.name || "Unknown Product",
        category: p?.category || "Uncategorized",
        image: v.image_url || p?.image_url
      };
    }).filter(v => v.productName !== "Unknown Product");
  }, []);

  if (!catalogData) {
    return (
      <div className="flex items-center justify-center h-full py-20">
        <div className="text-zinc-400 font-black uppercase tracking-[0.3em] animate-pulse text-xs">
          Initialising Terminal...
        </div>
      </div>
    );
  }

  const filteredCatalog = catalogData?.filter(v => {
    const matchesSearch = v.productName.toLowerCase().includes(search.toLowerCase()) || 
                          v.category.toLowerCase().includes(search.toLowerCase()) ||
                          v.size.toLowerCase().includes(search.toLowerCase());
    const matchesTab = activeTab === "all" || v.category.toLowerCase() === activeTab.toLowerCase();
    return matchesSearch && matchesTab;
  }) || [];

  const subtotal = cart.reduce((acc, item) => acc + item.base_price * item.qty, 0);
  const totalMsp = cart.reduce((acc, item) => acc + item.msp * item.qty, 0);
  const actualDiscount = Math.min(discount, subtotal); 
  const finalTotal = subtotal - actualDiscount;
  const isBelowMsp = finalTotal < totalMsp;

  const addToCart = (variant: any) => {
    setCart(prev => {
      const existing = prev.find(item => item.id === variant.id);
      if (existing) {
        if (existing.qty + 1 > variant.stock) { toast.error("Stock limit reached!"); return prev; }
        return prev.map(item => item.id === variant.id ? { ...item, qty: item.qty + 1 } : item);
      }
      if (variant.stock < 0.1) { toast.error("Out of stock!"); return prev; }
      return [...prev, { ...variant, qty: 1 }];
    });
    toast.success(`${variant.productName} added`);
  };

  const updateQty = (id: string, delta: number) => {
    setCart(cart.map(item => {
      if (item.id === id) {
        const newQty = Math.max(1, item.qty + delta);
        if (newQty > item.stock) { toast.error("Stock limit reached!"); return item; }
        return { ...item, qty: newQty };
      }
      return item;
    }));
  };

  const removeItem = (id: string) => setCart(cart.filter(item => item.id !== id));

  const handleCheckout = async () => {
    if (cart.length === 0) return;
    try {
      const saleId = uuidv4();
      const now = new Date().toISOString();
      await db.transaction('rw', db.sales, db.sale_items, db.variants, async () => {
        await db.sales.add({
          id: saleId, total_amount: finalTotal, discount: actualDiscount, payment_method: paymentMode,
          date: now, updated_at: now, sync_status: 'pending', is_deleted: 0
        });
        for (const item of cart) {
          await db.sale_items.add({
            id: uuidv4(), sale_id: saleId, variant_id: item.id, quantity: item.qty,
            unit_price: item.base_price, subtotal: item.base_price * item.qty, updated_at: now, is_deleted: 0,
            sync_status: 'pending'
          });
          const variant = await db.variants.get(item.id);
          if (variant) await db.variants.update(item.id, { stock: variant.stock - item.qty, updated_at: now });
        }
      });
      setLastSale({ id: saleId, total: finalTotal, discount: actualDiscount, paymentMethod: paymentMode, date: now });
      setLastItems([...cart]);
      setShowReceipt(true);
      toast.success("Transaction Complete");
      setCart([]); setDiscount(0); setPaymentMode("cash");
    } catch { toast.error("Checkout Failed"); }
  };

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col lg:flex-row gap-8 max-w-[1600px] mx-auto pb-6">
      <ReceiptModal isOpen={showReceipt} onClose={() => setShowReceipt(false)} saleData={lastSale || {}} items={lastItems} 
        onGenerateGst={(items) => { setGstInitialItems(items); setIsGstModalOpen(true); }} />
      <GstInvoiceModal isOpen={isGstModalOpen} onClose={() => setIsGstModalOpen(false)} initialItems={gstInitialItems} />

      {/* Catalog Panel */}
      <Card className="flex-1 flex flex-col min-h-0 border-none shadow-2xl bg-white/70 backdrop-blur-3xl rounded-[3rem] overflow-hidden">
        <div className="p-8 bg-zinc-50/50 border-b border-zinc-100 flex gap-6 items-center relative z-20">
          <div className="relative flex-1 group">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 h-6 w-6 text-zinc-400 group-focus-within:text-zinc-900 transition-colors" />
            <Input 
              placeholder="Scan Barcode or Search Inventory..." 
              className="pl-14 h-16 text-lg bg-white border-zinc-200 shadow-2xl shadow-zinc-200/50 rounded-[1.5rem] focus-visible:ring-zinc-900 focus-visible:ring-offset-0 border-none"
              value={search} onChange={(e) => setSearch(e.target.value)} autoFocus
            />
            {/* Mobile Dropdown Integration */}
            <div className="md:hidden mt-4">
               <DropdownMenu>
                  <DropdownMenuTrigger render={<Button variant="outline" className="w-full h-14 rounded-2xl border-zinc-200 bg-white shadow-xl flex justify-between px-6 font-black text-zinc-900 tracking-tight uppercase italic"><div className="flex items-center gap-3"><Search className="h-5 w-5 text-zinc-400" /> Browse Catalog...</div><ChevronRight className="h-4 w-4" /></Button>} />
                  <DropdownMenuContent className="w-[calc(100vw-2rem)] max-h-[75vh] overflow-y-auto rounded-[2.5rem] p-4 shadow-[0_40px_80px_rgba(0,0,0,0.3)] border-zinc-100 bg-white/95 backdrop-blur-3xl z-[1000] flex flex-col gap-3">
                     <div className="sticky top-0 bg-white/50 backdrop-blur-sm p-1 z-10"><Input placeholder="Type to filter..." className="h-14 rounded-2xl border-zinc-100 bg-zinc-50 font-bold" value={search} onChange={e=>setSearch(e.target.value)} /></div>
                     {filteredCatalog.map(item => (
                       <DropdownMenuItem key={item.id} onClick={()=>addToCart(item)} className="rounded-2xl p-4 flex items-center gap-5 hover:bg-zinc-50 transition-all cursor-pointer">
                         <div className="h-20 w-20 rounded-2xl bg-zinc-100 shrink-0 overflow-hidden shadow-inner flex items-center justify-center">
                           {item.image ? <img src={item.image} className="w-full h-full object-cover mix-blend-multiply" /> : <Package className="h-8 w-8 text-zinc-300" />}
                         </div>
                         <div className="flex-1 min-w-0 text-left">
                           <div className="font-black text-zinc-900 truncate uppercase tracking-tight text-lg italic">{item.productName}</div>
                           <div className="text-[10px] font-black text-zinc-400 uppercase mt-1 tracking-widest">{item.size} &bull; <span className="text-blue-600">{item.stock} {item.unit?.toUpperCase() || 'PCS'}</span></div>
                           <div className="font-black text-zinc-900 mt-2 text-xl tracking-tighter">₹{item.base_price.toLocaleString()}</div>
                         </div>
                       </DropdownMenuItem>
                     ))}
                  </DropdownMenuContent>
               </DropdownMenu>
            </div>
          </div>
          <Button size="icon" className="h-16 w-16 rounded-[1.5rem] bg-zinc-900 hover:bg-black text-white shrink-0 shadow-2xl shadow-zinc-900/40 active:scale-90 transition-all border-none">
            <ScanLine className="h-7 w-7" />
          </Button>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
          <div className="px-8 pt-8">
            <TabsList className="bg-zinc-100/50 p-2 rounded-3xl w-full justify-start h-auto flex-wrap gap-3 border-none">
              {["all", "buckets", "tiffins", "bottles"].map(t => (
                <TabsTrigger key={t} value={t} className="rounded-2xl px-8 py-3.5 font-black text-[10px] uppercase tracking-[0.2em] data-[state=active]:bg-white data-[state=active]:shadow-2xl data-[state=active]:text-zinc-900 text-zinc-400 transition-all">
                  {t}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>
          
          <ScrollArea className="flex-1 p-8">
            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-8">
               {filteredCatalog.map((v) => (
                <motion.div whileHover={{ y: -6, scale: 1.02 }} whileTap={{ scale: 0.96 }} key={v.id} onClick={() => addToCart(v)} className="bg-white border border-zinc-50 rounded-[2.5rem] overflow-hidden shadow-2xl shadow-zinc-200/50 hover:shadow-zinc-300/80 cursor-pointer group flex flex-col transition-all duration-500">
                  <div className="aspect-square relative overflow-hidden bg-zinc-50 shrink-0 shadow-inner">
                    {v.image ? <img src={v.image} className="w-full h-full object-cover mix-blend-multiply group-hover:scale-110 transition-transform duration-1000" /> : <div className="w-full h-full flex items-center justify-center text-zinc-200"><Package className="h-16 w-16 opacity-30" /></div>}
                    <div className="absolute top-5 right-5 bg-white/95 backdrop-blur-xl font-black px-4 py-2 rounded-2xl text-base shadow-2xl tracking-tighter border border-white/20">₹{v.base_price}</div>
                  </div>
                  <div className="p-6 flex-1 flex flex-col gap-1 text-left">
                    <h4 className="font-black text-zinc-900 leading-none text-xl group-hover:text-blue-600 transition-colors uppercase italic truncate">{v.productName}</h4>
                    <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mt-1">{v.size}</p>
                    <div className="mt-auto pt-4 flex items-center justify-between">
                       <span className={cn("text-[9px] font-black px-3 py-1 rounded-lg uppercase tracking-widest", v.stock < 5 ? "bg-red-50 text-red-500" : "bg-emerald-50 text-emerald-600")}>{v.stock} {v.unit?.toUpperCase() || 'PCS'} LEFT</span>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </ScrollArea>
        </Tabs>
      </Card>

      {/* Cart Panel */}
      <div className="w-full lg:w-[480px] flex flex-col gap-8 shrink-0">
        <Card className="flex-1 border-none shadow-2xl bg-white/70 backdrop-blur-3xl rounded-[3rem] flex flex-col min-h-[450px]">
          <div className="p-8 border-b border-zinc-50 bg-zinc-50/20 flex justify-between items-center rounded-t-[3rem]">
            <h3 className="font-black text-2xl text-zinc-900 flex items-center gap-4 tracking-tighter italic">
              <div className="p-3 bg-zinc-900 rounded-2xl text-white shadow-xl shadow-zinc-900/20"><ShoppingCart className="h-6 w-6" /></div> MY CART
            </h3>
            <Badge className="bg-zinc-900 text-white font-black px-5 py-2.5 text-xs rounded-2xl shadow-2xl border-none">{cart.length} ITEMS</Badge>
          </div>
          
          <ScrollArea className="flex-1 p-8">
            <AnimatePresence mode="popLayout">
              {cart.length === 0 ? (
                <motion.div initial={{opacity:0}} animate={{opacity:1}} className="h-full flex flex-col items-center justify-center text-zinc-300 py-32 gap-6 opacity-30">
                  <div className="p-10 bg-zinc-50 rounded-full shadow-inner"><ShoppingCart className="h-20 w-20" /></div>
                  <p className="font-black text-sm uppercase tracking-[0.3em]">The cart is hungry</p>
                </motion.div>
              ) : (
                <div className="space-y-6">
                  {cart.map(item => (
                    <motion.div key={item.id} layout initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="bg-white/80 backdrop-blur-xl border border-zinc-50 rounded-[2rem] p-5 shadow-2xl shadow-zinc-100/50 flex items-center gap-5 group relative overflow-hidden">
                      <div className="h-16 w-16 rounded-2xl bg-zinc-50 shrink-0 shadow-inner flex items-center justify-center overflow-hidden">
                        {item.image ? <img src={item.image} className="object-cover mix-blend-multiply" /> : <Package className="h-6 w-6 text-zinc-200" />}
                      </div>
                      <div className="flex-1 min-w-0 text-left">
                        <h4 className="font-black text-zinc-900 text-base truncate uppercase tracking-tight italic">{item.productName}</h4>
                        <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mt-1">{item.size} &bull; ₹{item.base_price} / {item.unit || 'pcs'}</div>
                      </div>
                      <div className="flex flex-col items-end gap-3 shrink-0">
                        <div className="font-black text-zinc-900 tracking-tighter text-xl italic">₹{(item.base_price * item.qty).toLocaleString()}</div>
                        <div className="flex items-center bg-zinc-100/80 p-1.5 rounded-2xl shadow-inner h-11 border border-white/50">
                          <button onClick={() => updateQty(item.id, -1)} className="w-10 h-full flex items-center justify-center hover:bg-white rounded-xl text-zinc-400 hover:text-zinc-900 transition-all active:scale-75"><Minus className="h-4 w-4" /></button>
                          {item.unit === 'kg' ? (
                            <input type="number" value={item.qty} onChange={(e) => { const val = parseFloat(e.target.value); if (!isNaN(val)) setCart(cart.map(c => c.id === item.id ? { ...c, qty: val } : c)); }} className="w-16 text-center font-black text-sm text-zinc-900 bg-transparent border-none focus:ring-0 outline-none p-0" step="0.1" />
                          ) : (
                            <span className="w-10 text-center font-black text-sm text-zinc-900">{item.qty}</span>
                          )}
                          <span className="text-[9px] font-black text-zinc-400 uppercase pr-2">{item.unit || 'pcs'}</span>
                          <button onClick={() => updateQty(item.id, 1)} className="w-10 h-full flex items-center justify-center hover:bg-white rounded-xl text-zinc-400 hover:text-zinc-900 transition-all active:scale-75"><Plus className="h-4 w-4" /></button>
                        </div>
                      </div>
                      <button onClick={() => removeItem(item.id)} className="absolute -top-1 -right-1 p-3 text-zinc-200 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all bg-white shadow-xl rounded-full border border-zinc-100"><Trash2 className="h-4 w-4" /></button>
                    </motion.div>
                  ))}
                </div>
              )}
            </AnimatePresence>
          </ScrollArea>
        </Card>

        {/* Checkout Card */}
        <Card className="border-none shadow-[0_50px_100px_-20px_rgba(0,0,0,0.15)] bg-white rounded-[3rem] overflow-visible relative">
          <CardContent className="p-0">
            <div className="p-10 bg-zinc-900 text-white rounded-t-[3rem] border-b border-white/5 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-40 h-40 bg-white/5 rounded-full blur-3xl -mr-16 -mt-16" />
              <div className="flex justify-between items-center mb-8 relative z-10">
                <span className="text-zinc-500 font-black uppercase tracking-[0.3em] text-[10px]">SUBTOTAL AMOUNT</span>
                <span className="font-black text-white text-3xl tracking-tighter italic">₹{subtotal.toLocaleString()}</span>
              </div>
              <div className="space-y-8 relative z-10">
                <div className="flex justify-between items-center">
                  <span className="flex items-center gap-3 text-[10px] font-black uppercase tracking-[0.3em] text-blue-400"><Tag className="h-4 w-4"/> BARGAIN SLIDER</span>
                  <span className="text-lg font-black text-blue-400 italic">- ₹{actualDiscount}</span>
                </div>
                <Slider disabled={cart.length === 0} value={[actualDiscount]} max={subtotal} step={10} onValueChange={(vals) => setDiscount(Array.isArray(vals) ? vals[0] : (vals as number))} className="py-2" />
                <AnimatePresence>
                  {isBelowMsp && cart.length > 0 && (
                    <motion.div initial={{ opacity: 0, y: -10, height: 0 }} animate={{ opacity: 1, y: 0, height: "auto" }} exit={{ opacity: 0, y: -10, height: 0 }} className="bg-red-500/10 text-red-400 p-5 rounded-[1.5rem] text-[10px] font-black uppercase tracking-widest flex items-center gap-4 border border-red-500/20 shadow-2xl">
                      <AlertTriangle className="h-6 w-6 shrink-0" />
                      Danger: Selling below MSP limit (₹{totalMsp})
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            <div className="p-10 space-y-10 bg-white rounded-b-[3rem]">
              <div className="flex justify-between items-end">
                <span className="text-zinc-400 font-black uppercase tracking-[0.3em] text-[10px] mb-3">FINAL PAYABLE</span>
                <span className={cn("text-6xl font-black tracking-tighter italic leading-none", isBelowMsp ? 'text-red-600' : 'text-zinc-900')}>₹{finalTotal.toLocaleString()}</span>
              </div>
              <div className="grid grid-cols-2 gap-5">
                {[
                  { id: 'upi', icon: QrCode, label: 'UPI / QR' },
                  { id: 'cash', icon: IndianRupee, label: 'CASH' },
                  { id: 'split', icon: Percent, label: 'SPLIT' },
                  { id: 'khata', icon: Users, label: 'KHATA' }
                ].map(mode => (
                  <Button key={mode.id} className={cn("h-16 rounded-2xl flex items-center justify-center gap-3 border-2 transition-all font-black text-[10px] uppercase tracking-[0.2em] shadow-sm active:scale-95", paymentMode === mode.id ? `bg-zinc-900 border-zinc-900 text-white shadow-2xl` : 'bg-white border-zinc-100 text-zinc-400 hover:border-zinc-200')} onClick={() => setPaymentMode(mode.id as any)}>
                    <mode.icon className="h-5 w-5" /> {mode.label}
                  </Button>
                ))}
              </div>
              <Button onClick={handleCheckout} className={cn("w-full h-24 text-2xl font-black uppercase tracking-[0.3em] shadow-[0_20px_50px_rgba(0,0,0,0.2)] rounded-[2rem] transition-all transform active:scale-[0.98] border-none italic", isBelowMsp ? 'bg-red-600 hover:bg-red-700 shadow-red-600/30' : 'bg-zinc-900 hover:bg-black shadow-zinc-900/40', "text-white")} disabled={cart.length === 0}>
                {isBelowMsp ? "Checkout Anyway" : "Generate Bill"} <ArrowRight className="ml-4 h-8 w-8" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
