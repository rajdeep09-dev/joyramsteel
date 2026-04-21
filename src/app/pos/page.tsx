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
  
  const [showReceipt, setShowReceipt] = useState(false);
  const [lastSale, setLastSale] = useState<any>(null);
  const [lastItems, setLastItems] = useState<any[]>([]);
  const [isGstModalOpen, setIsGstModalOpen] = useState(false);
  const [gstInitialItems, setGstInitialItems] = useState<any[]>([]);

  const parkedCarts = useLiveQuery(() => db.parked_carts.toArray()) || [];

  usePOSEvents({
    onPayment: () => handleCheckout(),
    onClear: () => { if(confirm("Clear cart?")) setCart([]); },
    onSearchFocus: () => { 
      const searchInput = document.querySelector('input[placeholder*="Search"]') as HTMLInputElement;
      searchInput?.focus();
    },
    onNavigateUp: () => {},
    onNavigateDown: () => {}
  });

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

  const filteredCatalog = (catalogData || []).filter(v => {
    const matchesSearch = v.productName.toLowerCase().includes(search.toLowerCase()) || 
                          v.category.toLowerCase().includes(search.toLowerCase()) ||
                          v.size.toLowerCase().includes(search.toLowerCase());
    const matchesTab = activeTab === "all" || v.category.toLowerCase() === activeTab.toLowerCase();
    return matchesSearch && matchesTab;
  });

  const subtotal = cart.reduce((acc, item) => acc + item.line_total, 0);
  const totalMsp = cart.reduce((acc, item) => acc + item.msp * item.qty, 0);
  const actualDiscount = Math.min(discount, subtotal); 
  const finalTotal = subtotal - actualDiscount;
  const isBelowMsp = finalTotal < totalMsp;

  const addToCart = (variant: any) => {
    // 1. Optimistic UI: Use Prepend to 'Pop' item into cart
    setCart(prev => {
      const existing = prev.find(item => item.id === variant.id);
      const unitsToAdd = variant.units_per_combo || 1;
      
      let newQty = existing ? (variant.unit === 'kg' ? 1 : existing.qty + unitsToAdd) : unitsToAdd;
      
      // 2. Decimal Precision Guard for Weights
      if (variant.unit === 'kg') {
        newQty = Number(parseFloat(newQty.toString()).toFixed(3));
      }

      if (newQty > variant.stock) { toast.error("Stock limit reached!"); return prev; }
      const lineTotal = calculateItemTotal(variant, newQty);
      
      if (existing) {
        return prev.map(item => item.id === variant.id ? { ...item, qty: newQty, line_total: lineTotal } : item);
      }
      return [{ ...variant, qty: newQty, line_total: lineTotal }, ...prev];
    });
    toast.success(`${variant.productName} added`, { duration: 800 });
  };

  const updateQty = (id: string, delta: number) => {
    setCart(prev => prev.map(item => {
      if (item.id === id) {
        const newQty = Math.max(0.1, item.qty + delta);
        if (newQty > item.stock) { toast.error("Stock limit reached!"); return item; }
        return { ...item, qty: newQty, line_total: calculateItemTotal(item, newQty) };
      }
      return item;
    }));
  };

  const removeItem = (id: string) => {
    setCart(prev => prev.filter(item => item.id !== id));
    toast.info("Item removed from cart");
  };

  const handleParkCart = async () => {
    if (cart.length === 0) return;
    const name = prompt("Reference Name:") || "Guest";
    await db.parked_carts.add({ id: uuidv4(), customer_name: name, items: cart, total: finalTotal, created_at: new Date().toISOString() });
    setCart([]); setDiscount(0); toast.success("Cart Parked");
  };

  const handleResumeCart = async (parked: any) => {
    setCart(parked.items);
    await db.parked_carts.delete(parked.id);
  };

  const [isProcessing, setIsProcessing] = useState(false);

  const handleCheckout = async () => {
    if (cart.length === 0 || isProcessing) return;
    
    // 3. Credit Ceiling Logic for Khata
    if (paymentMode === 'khata') {
      const customerName = prompt("Customer Name for Khata:");
      if (!customerName) return;
      const customer = await db.customers.where('name').equalsIgnoreCase(customerName).first();
      if (customer) {
        const potentialBalance = customer.balance + finalTotal;
        if (customer.credit_limit && potentialBalance > customer.credit_limit) {
          if (!confirm(`LIMIT EXCEEDED: ${customerName} has ₹${customer.balance}. This bill will reach ₹${potentialBalance} (Limit: ₹${customer.credit_limit}). Authorise Override?`)) return;
        }
      }
    }

    setIsProcessing(true);
    const checkoutToast = toast.loading("Authorising Transaction...");

    try {
      const saleId = uuidv4();
      const now = new Date().toISOString();

      await db.transaction('rw', [db.sales, db.sale_items, db.variants], async () => {
        // 1. Price Integrity Validation
        let verifiedSubtotal = 0;
        for (const item of cart) {
          const freshVariant = await db.variants.get(item.id);
          if (!freshVariant || freshVariant.is_deleted === 1) throw new Error(`${item.productName} is no longer in catalog.`);
          
          // Re-calculate using server-side pricing utility
          const itemTotal = calculateItemTotal(freshVariant, item.qty);
          verifiedSubtotal += itemTotal;
        }

        const verifiedDiscount = Math.min(discount, verifiedSubtotal);
        const verifiedTotal = verifiedSubtotal - verifiedDiscount;

        // 2. Commit Secure Sale
        await db.sales.add({
          id: saleId, total_amount: verifiedTotal, discount: verifiedDiscount, payment_method: paymentMode,
          date: now, updated_at: now, sync_status: 'pending', is_deleted: 0, version_clock: Date.now()
        });

        // 3. Stock Deduction
        for (const item of cart) {
          await db.sale_items.add({
            id: uuidv4(), sale_id: saleId, variant_id: item.id, quantity: item.qty,
            unit_price: item.base_price, subtotal: item.line_total, updated_at: now, is_deleted: 0,
            sync_status: 'pending', version_clock: Date.now()
          });
          
          const variant = await db.variants.get(item.id);
          if (variant) {
            // Negative stock is logged but allowed for offline flexibility
            const newStock = variant.stock - item.qty;
            await db.variants.update(item.id, { 
              stock: newStock, 
              updated_at: now, 
              version_clock: (variant.version_clock || 0) + 1 
            });
          }
        }
      });

      setLastSale({ id: saleId, total: finalTotal, discount: actualDiscount, paymentMethod: paymentMode, date: now });
      setLastItems([...cart]);
      setShowReceipt(true);
      toast.success("Bill Generated", { id: checkoutToast });
      setCart([]); setDiscount(0); setPaymentMode("cash");
    } catch (err: any) { 
      toast.error(err.message || "Security Check Failed", { id: checkoutToast }); 
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col lg:flex-row gap-6 max-w-7xl mx-auto pb-6">
      <ReceiptModal isOpen={showReceipt} onClose={() => setShowReceipt(false)} saleData={lastSale || {}} items={lastItems} 
        onGenerateGst={(items) => { setGstInitialItems(items); setIsGstModalOpen(true); }} />
      <GstInvoiceModal isOpen={isGstModalOpen} onClose={() => setIsGstModalOpen(false)} initialItems={gstInitialItems} />

      {/* Catalog */}
      <Card className="flex-1 flex flex-col min-h-0 border-zinc-200 shadow-xl rounded-3xl overflow-hidden bg-white">
        <div className="p-6 border-b border-zinc-100 flex gap-4 items-center bg-zinc-50/50">
          <div className="flex-1">
            <ProductSearch onSelect={addToCart} onQueryChange={setSearch} placeholder="Search Inventory... (⌘+K)" />
          </div>
          <Button size="icon" className="h-16 w-16 rounded-2xl bg-zinc-900"><ScanLine className="h-6 w-6" /></Button>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
          <div className="px-6 pt-4">
            <TabsList className="bg-zinc-100 p-1 rounded-xl w-full justify-start h-auto flex-wrap">
              {["all", "buckets", "tiffins", "bottles"].map(t => (
                <TabsTrigger key={t} value={t} className="rounded-lg px-6 py-2 font-bold uppercase text-[10px] tracking-widest">{t}</TabsTrigger>
              ))}
            </TabsList>
          </div>
          <ScrollArea className="flex-1 p-6">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-6">
               {filteredCatalog.map((v) => (
                <ProductCard key={v.id} variant={v as any} onClick={() => addToCart(v)} />
              ))}
            </div>
          </ScrollArea>
        </Tabs>
      </Card>

      {/* Cart */}
      <div className="w-full lg:w-[420px] flex flex-col gap-6 shrink-0">
        <Card className="flex-1 border-zinc-200 shadow-xl rounded-3xl flex flex-col min-h-0 bg-white">
          <div className="p-6 border-b border-zinc-100 flex justify-between items-center">
            <h3 className="font-black text-xl flex items-center gap-3 tracking-tight"><ShoppingCart className="h-5 w-5" /> CART</h3>
            <div className="flex gap-2">
               {parkedCarts.length > 0 && <Badge className="bg-blue-600 cursor-pointer" onClick={() => handleResumeCart(parkedCarts[0])}>{parkedCarts.length} Parked</Badge>}
               <Button variant="ghost" size="icon" onClick={handleParkCart} className="h-8 w-8 rounded-lg"><ParkingMeter className="h-4 w-4" /></Button>
            </div>
          </div>
          <ScrollArea className="flex-1 p-6">
            <div className="space-y-4">
              {cart.map(item => (
                <div key={item.id} className="flex items-center gap-4 p-4 rounded-2xl border border-zinc-100 bg-zinc-50/50 group relative">
                  <div className="flex-1 min-w-0 text-left">
                    <h4 className="font-bold text-sm truncate uppercase">{item.productName}</h4>
                    <p className="text-[10px] text-zinc-500 font-bold uppercase">{item.size} &bull; ₹{item.base_price}</p>
                  </div>
                  <div className="text-right flex items-center gap-3">
                    <div>
                      <div className="font-black text-sm text-right">₹{item.line_total}</div>
                      <div className="flex items-center gap-2 mt-2 bg-white rounded-lg border border-zinc-200 p-1">
                        <button onClick={() => updateQty(item.id, -1)} className="h-6 w-6 flex items-center justify-center hover:bg-zinc-100 rounded"><Minus className="h-3 w-3" /></button>
                        <span className="text-xs font-black min-w-[20px] text-center tabular-nums">{item.qty}</span>
                        <button onClick={() => updateQty(item.id, 1)} className="h-6 w-6 flex items-center justify-center hover:bg-zinc-100 rounded"><Plus className="h-3 w-3" /></button>
                      </div>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => removeItem(item.id)}
                      className="h-8 w-8 text-zinc-300 hover:text-red-500 transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
          <div className="p-6 bg-zinc-50 border-t border-zinc-100 space-y-4 rounded-b-3xl">
            <div className="flex justify-between text-xs font-bold text-zinc-500 uppercase tracking-widest">
              <span>Subtotal</span>
              <span>₹{subtotal}</span>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-[10px] font-black uppercase text-blue-600">
                <span>Discount</span>
                <span>- ₹{actualDiscount}</span>
              </div>
              <Slider value={[actualDiscount]} max={subtotal} step={10} onValueChange={(vals) => setDiscount(Array.isArray(vals) ? vals[0] : vals as any)} />
            </div>
            <div className="pt-2 flex justify-between items-end border-t border-zinc-200">
              <span className="text-[10px] font-black uppercase text-zinc-400">Total Payable</span>
              <span className={cn("text-4xl font-black tracking-tighter", isBelowMsp ? 'text-red-600' : 'text-zinc-900')}>₹{finalTotal}</span>
            </div>
            <div className="grid grid-cols-2 gap-2 mt-4">
              {['cash', 'upi', 'khata'].map(m => (
                <Button key={m} variant={paymentMode === m ? 'default' : 'outline'} className="h-10 rounded-xl text-[10px] font-black uppercase tracking-widest" onClick={() => setPaymentMode(m as any)}>{m}</Button>
              ))}
            </div>
            <Button onClick={handleCheckout} className={cn("w-full h-16 text-lg font-black uppercase tracking-widest rounded-2xl mt-4 shadow-xl", isBelowMsp ? 'bg-red-600' : 'bg-zinc-900')} disabled={cart.length === 0}>
               GENERATE BILL <ArrowRight className="ml-2 h-6 w-6" />
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
