"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { calculateItemTotal } from "@/lib/pricing";
import { 
  ScanLine, Trash2, Minus, Plus, Tag, CreditCard,
  IndianRupee, QrCode, Users, Search, Percent, AlertTriangle,
  Package, ShoppingCart, ArrowRight, CheckCircle2, ChevronRight,
  Zap, Command, Info, ParkingMeter, PlayCircle
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
import { ProductSearch } from "@/components/ProductSearch";
import { usePOSEvents } from "@/hooks/usePOSEvents";
import { ProductCard } from "@/components/ProductCard";
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
  line_total: number;
}

export default function POS() {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [discount, setDiscount] = useState(0);
  const [paymentMode, setPaymentMode] = useState<"cash" | "upi" | "split" | "khata">("cash");
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  
  // Module 4: Integrated Keyboard Shortcuts
  usePOSEvents({
    onPayment: () => handleCheckout(),
    onClear: () => { if(confirm("Clear cart?")) setCart([]); },
    onSearchFocus: () => { 
      const searchInput = document.querySelector('input[placeholder*="Search"]') as HTMLInputElement;
      searchInput?.focus();
    },
    onNavigateUp: () => { /* Future: Navigate results */ },
    onNavigateDown: () => { /* Future: Navigate results */ }
  });
  
  const [showReceipt, setShowReceipt] = useState(false);
  const [lastSale, setLastSale] = useState<any>(null);
  const [lastItems, setLastItems] = useState<any[]>([]);

  const [isGstModalOpen, setIsGstModalOpen] = useState(false);
  const [gstInitialItems, setGstInitialItems] = useState<any[]>([]);

  // Park & Resume state
  const parkedCarts = useLiveQuery(() => db.parked_carts.toArray());

  const handleParkCart = async () => {
    if (cart.length === 0) return;
    const customerName = prompt("Enter customer name or reference:") || "Guest";
    await db.parked_carts.add({
      id: uuidv4(),
      customer_name: customerName,
      items: cart,
      total: finalTotal,
      created_at: new Date().toISOString()
    });
    setCart([]);
    setDiscount(0);
    toast.success("Cart Parked");
  };

  const handleResumeCart = async (parked: any) => {
    if (cart.length > 0) {
      if (!confirm("Your current cart will be replaced. Continue?")) return;
    }
    setCart(parked.items);
    await db.parked_carts.delete(parked.id);
    toast.success(`Resumed: ${parked.customer_name}`);
  };

  const catalogData = useLiveQuery(async () => {
    const prods = await db.products.where('is_deleted').equals(0).toArray();
    const vars = await db.variants.where('is_deleted').equals(0).toArray();
    
    return vars.map(v => {
      const p = prods.find(p => p.id === v.product_id);
      return {
        ...v,
        productName: p?.name || "Unknown Product",
        category: p?.category || "Uncategorized",
        image: v.image_url || p?.image_url,
        parentImage: p?.image_url
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

  const subtotal = cart.reduce((acc, item) => acc + item.line_total, 0);
  const totalMsp = cart.reduce((acc, item) => acc + item.msp * item.qty, 0);
  const actualDiscount = Math.min(discount, subtotal); 
  const finalTotal = subtotal - actualDiscount;
  const isBelowMsp = finalTotal < totalMsp;

  const addToCart = (variant: any) => {
    setCart(prev => {
      const existing = prev.find(item => item.id === variant.id);
      
      let newQty = 1;
      if (existing) {
        // Task 3: If unit is 'kg', replace quantity. If 'pcs', increment.
        newQty = variant.unit === 'kg' ? 1 : existing.qty + 1;
      }

      if (newQty > variant.stock) {
        toast.error("Stock limit reached!");
        return prev;
      }

      const lineTotal = calculateItemTotal(variant, newQty);

      if (existing) {
        return prev.map(item => item.id === variant.id ? { ...item, qty: newQty, line_total: lineTotal } : item);
      }

      if (variant.stock < 0.1) { toast.error("Out of stock!"); return prev; }
      return [...prev, { ...variant, qty: newQty, line_total: lineTotal }];
    });
    toast.success(`${variant.productName} added`);
  };

  const updateQty = (id: string, delta: number) => {
    setCart(prev => prev.map(item => {
      if (item.id === id) {
        const newQty = Math.max(0.1, item.qty + delta);
        if (newQty > item.stock) { toast.error("Stock limit reached!"); return item; }
        return { 
          ...item, 
          qty: newQty, 
          line_total: calculateItemTotal(item, newQty) 
        };
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
          date: now, updated_at: now, sync_status: 'pending', is_deleted: 0,
          version_clock: Date.now() // Simple logical clock
        });
        for (const item of cart) {
          await db.sale_items.add({
            id: uuidv4(), sale_id: saleId, variant_id: item.id, quantity: item.qty,
            unit_price: item.base_price, subtotal: item.line_total, updated_at: now, is_deleted: 0,
            sync_status: 'pending', version_clock: Date.now()
          });
          const variant = await db.variants.get(item.id);
          // Task 4: Deduct exact literal qty from stock
          if (variant) await db.variants.update(item.id, { 
            stock: variant.stock - item.qty, 
            updated_at: now,
            version_clock: (variant.version_clock || 0) + 1 
          });
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
        <div className="p-6 md:p-10 bg-zinc-50/50 border-b border-zinc-100 flex flex-col md:flex-row gap-6 items-stretch md:items-center relative z-20">
          <div className="flex-1">
            <ProductSearch 
              onSelect={(item) => addToCart(item)} 
              onQueryChange={setSearch}
              placeholder="Scan Barcode or Type Product Name... (⌘+K)"
            />
            {/* Mobile Dropdown Integration Restored */}
            <div className="md:hidden mt-4">
               <DropdownMenu>
                  <DropdownMenuTrigger>
                    <div className="w-full h-14 rounded-2xl border border-zinc-200 bg-white shadow-xl flex justify-between items-center px-6 font-black text-zinc-900 tracking-tight uppercase italic cursor-pointer">
                      <div className="flex items-center gap-3"><Search className="h-5 w-5 text-zinc-400" /> Browse Catalog...</div>
                      <ChevronRight className="h-4 w-4" />
                    </div>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-[calc(100vw-2rem)] max-h-[75vh] overflow-y-auto rounded-[2.5rem] p-4 shadow-[0_40px_80px_rgba(0,0,0,0.3)] border-zinc-100 bg-white/95 backdrop-blur-3xl z-[1000] flex flex-col gap-3">
                     <div className="sticky top-0 bg-white/50 backdrop-blur-sm p-1 z-10">
                        <Input placeholder="Type to filter..." className="h-14 rounded-2xl border-zinc-100 bg-zinc-50 font-bold" value={search} onChange={e=>setSearch(e.target.value)} />
                     </div>
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
          <Button size="icon" className="h-20 w-20 rounded-[2rem] bg-zinc-900 hover:bg-black text-white shrink-0 shadow-2xl shadow-zinc-900/40 active:scale-90 transition-all border-none hidden md:flex items-center justify-center">
            <ScanLine className="h-8 w-8 text-blue-400" />
          </Button>
          
          {/* Mobile Scan Indicator */}
          <div className="md:hidden flex items-center justify-between">
             <div className="flex items-center gap-3 px-5 py-3 bg-blue-500/10 rounded-2xl border border-blue-500/20">
                <Zap className="h-4 w-4 text-blue-600 fill-blue-600 animate-pulse" />
                <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest">Auto-Scanner Active</span>
             </div>
             <div className="flex items-center gap-2 text-[10px] font-black text-zinc-400 uppercase tracking-widest italic">
                {filteredCatalog.length} Items in View
             </div>
          </div>
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
                <ProductCard 
                  key={v.id} 
                  variant={v} 
                  onClick={() => addToCart(v)} 
                />
              ))}
            </div>
          </ScrollArea>
        </Tabs>
      </Card>

      {/* Cart & Checkout Panel */}
      <div className="w-full lg:w-[520px] flex flex-col gap-6 shrink-0 h-full">
        {/* Main Cart Container */}
        <Card className="flex-1 border-none shadow-[0_50px_100px_-20px_rgba(0,0,0,0.12)] bg-white/80 backdrop-blur-3xl rounded-[3.5rem] flex flex-col min-h-0 overflow-hidden border border-white/40">
          {/* Cart Header */}
          <div className="p-8 pb-6 flex justify-between items-center relative z-10">
            <div className="space-y-1">
              <h3 className="font-black text-3xl text-zinc-900 flex items-center gap-3 tracking-tighter italic">
                <ShoppingCart className="h-8 w-8 text-zinc-900" /> ACTIVE ORDER
              </h3>
              <p className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em] pl-1">Joy Ram Steel Terminal</p>
            </div>
            <div className="flex items-center gap-3">
              <motion.button 
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleParkCart}
                disabled={cart.length === 0}
                className="h-12 w-12 rounded-2xl bg-blue-500/10 text-blue-600 hover:bg-blue-600 hover:text-white transition-all flex items-center justify-center shadow-inner disabled:opacity-20"
              >
                <ParkingMeter className="h-6 w-6" />
              </motion.button>
              <div className="bg-zinc-900 text-white font-black px-6 py-3 text-sm rounded-[1.25rem] shadow-2xl border-none italic tracking-tighter">
                {cart.length} ITEMS
              </div>
            </div>
          </div>
          
          {/* Parked Carts List (Elite Horizontal) */}
          <AnimatePresence>
            {parkedCarts && parkedCarts.length > 0 && (
              <motion.div 
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="px-8 py-4 bg-zinc-900/5 border-y border-zinc-100 flex gap-4 overflow-x-auto scrollbar-hide shrink-0 items-center"
              >
                <span className="text-[9px] font-black uppercase text-zinc-400 rotate-180 [writing-mode:vertical-lr] shrink-0">PARKED</span>
                {parkedCarts.map(p => (
                  <motion.button 
                    layout
                    key={p.id} 
                    onClick={() => handleResumeCart(p)}
                    whileHover={{ x: 4 }}
                    className="shrink-0 flex items-center gap-4 bg-white border border-zinc-200 px-5 py-3 rounded-2xl shadow-sm hover:shadow-xl hover:border-zinc-900 transition-all group"
                  >
                    <div className="h-10 w-10 rounded-xl bg-zinc-900 flex items-center justify-center text-white shadow-lg">
                      <PlayCircle className="h-5 w-5" />
                    </div>
                    <div className="text-left">
                      <div className="text-[11px] font-black uppercase text-zinc-900 tracking-tight leading-none italic">{p.customer_name}</div>
                      <div className="text-[9px] font-bold text-blue-600 uppercase mt-1">₹{p.total.toLocaleString()}</div>
                    </div>
                  </motion.button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
          
          {/* Cart Scroll Area (Elite List) */}
          <ScrollArea className="flex-1 px-8 py-4">
            <AnimatePresence mode="popLayout" initial={false}>
              {cart.length === 0 ? (
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="h-full flex flex-col items-center justify-center text-zinc-300 py-32 gap-6 opacity-40"
                >
                  <div className="relative">
                    <div className="absolute inset-0 bg-zinc-200 rounded-full blur-3xl opacity-20 animate-pulse" />
                    <div className="p-12 bg-white rounded-full shadow-inner relative z-10 border border-zinc-50"><ShoppingCart className="h-24 w-24" /></div>
                  </div>
                  <div className="text-center space-y-1">
                    <p className="font-black text-lg uppercase tracking-[0.2em] text-zinc-400">Cart is Empty</p>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-300">Scan an item to begin billing</p>
                  </div>
                </motion.div>
              ) : (
                <div className="space-y-4 pb-10">
                  {cart.map((item, idx) => (
                    <motion.div 
                      key={item.id} 
                      layout 
                      initial={{ opacity: 0, x: 20 }} 
                      animate={{ opacity: 1, x: 0 }} 
                      transition={{ delay: idx * 0.05 }}
                      exit={{ opacity: 0, scale: 0.9 }} 
                      className="bg-white border border-zinc-100/50 rounded-[2.25rem] p-5 shadow-xl shadow-zinc-100/20 flex items-center gap-5 group relative transition-all hover:shadow-2xl hover:border-zinc-200"
                    >
                      <div className="h-20 w-20 rounded-[1.5rem] bg-zinc-50 shrink-0 shadow-inner flex items-center justify-center overflow-hidden border border-zinc-100 group-hover:scale-105 transition-transform duration-500">
                        {item.image ? <img src={item.image} className="object-cover mix-blend-multiply w-full h-full" /> : <Package className="h-8 w-8 text-zinc-200" />}
                      </div>
                      
                      <div className="flex-1 min-w-0 text-left">
                        <h4 className="font-black text-zinc-900 text-lg truncate uppercase tracking-tight italic leading-tight">{item.productName}</h4>
                        <div className="flex flex-wrap items-center gap-2 mt-1.5">
                          <Badge variant="outline" className="text-[9px] font-black uppercase tracking-widest bg-zinc-50 text-zinc-500 border-zinc-100 px-2 rounded-lg">
                            {item.size}
                          </Badge>
                          <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">₹{item.base_price}/{item.unit || 'pcs'}</span>
                          {item.pricing_type === 'bundle' && (
                            <Badge className="bg-blue-500/10 text-blue-600 border-none text-[8px] font-black h-4 px-1.5 uppercase tracking-widest">
                              Bundle Price Applied
                            </Badge>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-col items-end gap-3 shrink-0">
                        <div className="font-black text-zinc-900 tracking-tighter text-2xl italic leading-none">₹{(item.line_total).toLocaleString()}</div>
                        <div className="flex items-center bg-zinc-900 text-white p-1 rounded-2xl shadow-2xl h-12 border border-zinc-800">
                          <button onClick={() => updateQty(item.id, -1)} className="w-10 h-full flex items-center justify-center hover:bg-white/10 rounded-xl transition-all active:scale-75"><Minus className="h-4 w-4" /></button>
                          {item.unit === 'kg' ? (
                            <input 
                              type="number" 
                              value={item.qty} 
                              onChange={(e) => { 
                                const val = parseFloat(e.target.value); 
                                if (!isNaN(val)) setCart(cart.map(c => c.id === item.id ? { ...c, qty: val, line_total: calculateItemTotal(c, val) } : c)); 
                              }} 
                              className="w-16 text-center font-black text-sm bg-transparent border-none focus:ring-0 outline-none p-0 text-white" 
                              step="0.1" 
                            />
                          ) : (
                            <span className="w-10 text-center font-black text-sm">{item.qty}</span>
                          )}
                          <button onClick={() => updateQty(item.id, 1)} className="w-10 h-full flex items-center justify-center hover:bg-white/10 rounded-xl transition-all active:scale-75"><Plus className="h-4 w-4" /></button>
                        </div>
                      </div>
                      
                      <button onClick={() => removeItem(item.id)} className="absolute -top-2 -right-2 p-3 text-red-500 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-all bg-white shadow-2xl rounded-full border border-zinc-100 scale-75 group-hover:scale-100">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </motion.div>
                  ))}
                </div>
              )}
            </AnimatePresence>
          </ScrollArea>
        </Card>

        {/* Dynamic Checkout Console (The Elite 1000x Upgrade) */}
        <div className="relative group mt-auto">
          {/* Decorative Backdrops */}
          <div className="absolute -inset-4 bg-zinc-900 rounded-[4.5rem] blur-3xl opacity-[0.03] group-hover:opacity-[0.08] transition-opacity duration-1000" />
          
          <Card className="border-none shadow-[0_50px_100px_-20px_rgba(0,0,0,0.2)] bg-zinc-900 rounded-[4rem] overflow-hidden relative border-t border-white/10">
            <CardContent className="p-0">
              {/* Summary Strip */}
              <div className="px-12 py-10 space-y-8 relative z-10 overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full blur-[80px] -mr-32 -mt-32" />
                
                <div className="flex justify-between items-end relative z-10">
                  <div className="space-y-1">
                    <p className="text-zinc-500 font-black uppercase tracking-[0.4em] text-[10px]">PAYABLE TOTAL</p>
                    <div className="flex items-baseline gap-2">
                       <span className="text-zinc-400 text-2xl font-black italic tracking-tighter opacity-50 uppercase">INR</span>
                       <motion.span 
                         key={finalTotal}
                         initial={{ y: 20, opacity: 0 }}
                         animate={{ y: 0, opacity: 1 }}
                         className={cn("text-7xl font-black tracking-tighter italic leading-none transition-colors duration-500", isBelowMsp ? 'text-red-500' : 'text-white')}
                       >
                         {finalTotal.toLocaleString()}
                       </motion.span>
                    </div>
                  </div>
                  <div className="text-right">
                     <p className="text-zinc-500 font-black uppercase tracking-[0.4em] text-[10px] mb-1">SUB: {subtotal.toLocaleString()}</p>
                     <div className="px-4 py-1.5 bg-emerald-500/10 text-emerald-400 rounded-xl text-[10px] font-black uppercase tracking-widest border border-emerald-500/20">
                        SAVING ₹{actualDiscount}
                     </div>
                  </div>
                </div>

                {/* Interactive Bargain Engine */}
                <div className="space-y-6 pt-2">
                  <div className="flex justify-between items-center px-1">
                    <span className="flex items-center gap-3 text-[10px] font-black uppercase tracking-[0.3em] text-zinc-500 hover:text-zinc-400 cursor-help transition-colors">
                      <Tag className="h-4 w-4"/> BARGAIN CONSOLE
                    </span>
                    <Badge className="bg-zinc-800 text-zinc-400 border-zinc-700 h-6 px-3 rounded-lg text-[9px] font-black italic shadow-inner">
                      LIMIT: ₹{subtotal}
                    </Badge>
                  </div>
                  <Slider 
                    disabled={cart.length === 0} 
                    value={[actualDiscount]} 
                    max={subtotal} 
                    step={10} 
                    onValueChange={(vals) => setDiscount(Array.isArray(vals) ? vals[0] : vals)} 
                    className="py-2" 
                  />
                  
                  <AnimatePresence>
                    {isBelowMsp && cart.length > 0 && (
                      <motion.div 
                        initial={{ opacity: 0, scale: 0.95 }} 
                        animate={{ opacity: 1, scale: 1 }} 
                        className="bg-red-500/10 text-red-400 p-6 rounded-[2rem] text-[10px] font-black uppercase tracking-widest flex items-center gap-5 border border-red-500/20 shadow-[0_20px_40px_rgba(239,68,68,0.15)] relative overflow-hidden"
                      >
                        <div className="absolute inset-0 bg-red-500/5 animate-pulse" />
                        <AlertTriangle className="h-8 w-8 shrink-0 animate-bounce" />
                        <div className="relative z-10 leading-relaxed">
                           WARNING: Selling below MSP limit (₹{totalMsp})<br/>
                           <span className="opacity-60 text-[8px]">Proprietor approval required for this transaction</span>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>

              {/* Action Area */}
              <div className="p-10 pt-2 space-y-8 bg-white rounded-t-[4.5rem] shadow-[0_-20px_50px_rgba(0,0,0,0.05)] relative z-20">
                <div className="grid grid-cols-2 gap-4">
                  {[
                    { id: 'upi', icon: QrCode, label: 'UPI / QR', color: 'blue' },
                    { id: 'cash', icon: IndianRupee, label: 'CASH PAYMENT', color: 'zinc' },
                    { id: 'split', icon: Percent, label: 'SPLIT BILL', color: 'zinc' },
                    { id: 'khata', icon: Users, label: 'DIGITAL KHATA', color: 'amber' }
                  ].map(mode => (
                    <motion.button 
                      key={mode.id} 
                      whileHover={{ y: -2 }}
                      whileTap={{ scale: 0.97 }}
                      className={cn(
                        "h-20 rounded-[1.75rem] flex flex-col items-center justify-center gap-2 border-2 transition-all font-black text-[9px] uppercase tracking-[0.2em] relative overflow-hidden group shadow-sm",
                        paymentMode === mode.id 
                          ? "bg-zinc-900 border-zinc-900 text-white shadow-2xl" 
                          : "bg-zinc-50/50 border-zinc-100 text-zinc-400 hover:border-zinc-300 hover:bg-white"
                      )} 
                      onClick={() => setPaymentMode(mode.id as any)}
                    >
                      {paymentMode === mode.id && (
                        <motion.div layoutId="mode-bg" className="absolute inset-0 bg-zinc-900 -z-10" />
                      )}
                      <mode.icon className={cn("h-6 w-6 transition-transform duration-500 group-hover:scale-110", paymentMode === mode.id ? 'text-white' : 'text-zinc-400')} /> 
                      {mode.label}
                    </motion.button>
                  ))}
                </div>

                <motion.button 
                  whileHover={{ y: -4, boxShadow: "0 40px 60px -15px rgba(0,0,0,0.3)" }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleCheckout} 
                  disabled={cart.length === 0}
                  className={cn(
                    "w-full h-28 text-2xl font-black uppercase tracking-[0.3em] rounded-[2.5rem] transition-all transform border-none italic flex items-center justify-center gap-6 group shadow-2xl shadow-zinc-900/40",
                    isBelowMsp ? 'bg-red-600 hover:bg-red-700 text-white' : 'bg-zinc-900 hover:bg-black text-white'
                  )} 
                >
                  <span className="pl-6">{isBelowMsp ? "OVERRIDE & PAY" : "AUTHORISE & BILL"}</span>
                  <div className="h-14 w-14 rounded-full bg-white/10 flex items-center justify-center group-hover:translate-x-3 transition-transform duration-500">
                    <ArrowRight className="h-8 w-8" />
                  </div>
                </motion.button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
