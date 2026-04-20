"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  ScanLine, Trash2, Minus, Plus, Tag, CreditCard,
  IndianRupee, QrCode, Users, Search, Percent, AlertTriangle,
  Package, ShoppingCart
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
          Loading Terminal...
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
        if (existing.qty + 1 > variant.stock) {
          toast.error("Insufficient stock!");
          return prev;
        }
        return prev.map(item => item.id === variant.id ? { ...item, qty: item.qty + 1 } : item);
      }
      if (variant.stock < 1) {
        toast.error("Out of stock!");
        return prev;
      }
      return [...prev, { ...variant, qty: 1 }];
    });
  };

  const updateQty = (id: string, delta: number) => {
    setCart(cart.map(item => {
      if (item.id === id) {
        const newQty = Math.max(1, item.qty + delta);
        if (newQty > item.stock) {
          toast.error("Insufficient stock!");
          return item;
        }
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
          id: saleId,
          total_amount: finalTotal,
          discount: actualDiscount,
          payment_method: paymentMode,
          date: now,
          updated_at: now,
          sync_status: 'pending',
          is_deleted: 0
        });

        for (const item of cart) {
          await db.sale_items.add({
            id: uuidv4(),
            sale_id: saleId,
            variant_id: item.id,
            quantity: item.qty,
            unit_price: item.base_price,
            subtotal: item.base_price * item.qty,
            updated_at: now,
            is_deleted: 0
          });
          
          const variant = await db.variants.get(item.id);
          if (variant) {
            await db.variants.update(item.id, { 
              stock: variant.stock - item.qty,
              updated_at: now 
            });
          }
        }
      });
      
      setLastSale({
        id: saleId,
        total: finalTotal,
        discount: actualDiscount,
        paymentMethod: paymentMode,
        date: now
      });
      setLastItems([...cart]);
      setShowReceipt(true);
      
      toast.success("Bill Generated Successfully!");
      setCart([]);
      setDiscount(0);
      setPaymentMode("cash");
    } catch (e) {
      toast.error("Failed to complete checkout");
    }
  };

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col lg:flex-row gap-8 max-w-[1600px] mx-auto pb-6">
      <ReceiptModal 
        isOpen={showReceipt} 
        onClose={() => setShowReceipt(false)} 
        saleData={lastSale || {}} 
        items={lastItems} 
        onGenerateGst={(items) => {
          setGstInitialItems(items);
          setIsGstModalOpen(true);
        }}
      />
      <GstInvoiceModal 
        isOpen={isGstModalOpen} 
        onClose={() => setIsGstModalOpen(false)} 
        initialItems={gstInitialItems}
      />
      <Card className="flex-1 flex flex-col min-h-0 border-none shadow-2xl shadow-zinc-200/50 bg-white/70 backdrop-blur-3xl rounded-[2.5rem] overflow-hidden">
        <div className="p-6 bg-zinc-50/50 border-b border-zinc-100 flex gap-4 items-center relative z-20">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-zinc-400" />
            <Input 
              placeholder="Search products or scan..." 
              className="pl-12 h-14 text-lg bg-white border-zinc-200 shadow-xl shadow-zinc-100/50 rounded-2xl focus-visible:ring-zinc-900 hidden md:block"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              autoFocus
            />

            {/* Mobile-Only Dropdown Trigger */}
            <div className="md:hidden">
              <DropdownMenu>
                <DropdownMenuTrigger render={
                  <Button variant="outline" className="w-full h-14 rounded-2xl border-zinc-200 bg-white shadow-xl flex justify-between px-4 font-black text-zinc-900 tracking-tight">
                    <div className="flex items-center gap-3">
                      <Search className="h-5 w-5 text-zinc-400" />
                      <span>BROWSE CATALOG...</span>
                    </div>
                  </Button>
                } />
                <DropdownMenuContent className="w-[calc(100vw-3rem)] max-h-[70vh] overflow-y-auto rounded-[2rem] p-3 shadow-2xl border-zinc-100 bg-white/95 backdrop-blur-3xl z-[500] flex flex-col gap-2">
                   <div className="sticky top-0 bg-white/50 backdrop-blur-sm p-1 z-10">
                     <Input 
                        placeholder="Search items..." 
                        className="h-12 rounded-xl border-zinc-100 bg-zinc-50 font-bold"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                     />
                   </div>
                   {filteredCatalog.map(item => (
                     <DropdownMenuItem 
                        key={item.id} 
                        onClick={() => addToCart(item)}
                        className="rounded-2xl p-3 flex items-center gap-4 hover:bg-zinc-50 transition-all cursor-pointer"
                     >
                       <div className="h-16 w-16 rounded-xl bg-zinc-100 shrink-0 overflow-hidden shadow-inner flex items-center justify-center">
                         {item.image ? (
                           <img src={item.image} className="w-full h-full object-cover mix-blend-multiply" />
                         ) : (
                           <Package className="h-6 w-6 text-zinc-300" />
                         )}
                       </div>
                       <div className="flex-1 min-w-0">
                         <div className="font-black text-zinc-900 truncate uppercase tracking-tight">{item.productName}</div>
                         <div className="text-[10px] font-black text-zinc-400 uppercase mt-0.5">{item.size} &bull; <span className="text-emerald-600">{item.stock} {item.unit?.toUpperCase() || 'PCS'} IN STOCK</span></div>
                         <div className="font-black text-zinc-900 mt-1">₹{item.base_price}</div>
                       </div>
                     </DropdownMenuItem>
                   ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            
            <AnimatePresence>
              {search.trim().length > 0 && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="fixed inset-x-0 bottom-0 top-[160px] z-[100] md:absolute md:inset-auto md:bottom-auto md:top-full md:left-0 md:right-0 md:mt-4 bg-white/95 md:bg-white/90 backdrop-blur-3xl md:backdrop-blur-2xl rounded-t-3xl md:rounded-3xl shadow-[0_-8px_32px_-12px_rgba(0,0,0,0.2)] md:shadow-[0_32px_64px_-12px_rgba(0,0,0,0.14)] border border-zinc-200 md:border-zinc-100 overflow-hidden flex flex-col md:max-h-[400px] md:z-50"
                >
                  <ScrollArea className="flex-1">
                    {filteredCatalog.length === 0 ? (
                      <div className="p-8 text-center text-zinc-400 font-bold uppercase tracking-widest text-[10px]">No matches found</div>
                    ) : (
                      filteredCatalog.map(item => (
                        <div 
                          key={item.id} 
                          onClick={() => {
                            addToCart(item);
                            setSearch("");
                          }}
                          className="p-4 hover:bg-zinc-50 border-b border-zinc-50 last:border-b-0 cursor-pointer flex items-center justify-between group transition-all"
                        >
                          <div className="flex items-center gap-4">
                            <div className="h-12 w-12 rounded-xl bg-zinc-100 overflow-hidden flex items-center justify-center shrink-0 shadow-inner">
                              {item.image ? (
                                <img src={item.image} className="w-full h-full object-cover mix-blend-multiply" />
                              ) : (
                                <Package className="h-5 w-5 text-zinc-300" />
                              )}
                            </div>
                            <div>
                              <div className="font-black text-zinc-900 group-hover:text-zinc-600 transition-colors text-lg tracking-tight">{item.productName}</div>
                              <div className="text-xs font-bold text-zinc-400 uppercase tracking-widest mt-1">{item.size} &bull; <span className="text-emerald-600">{item.stock} {item.unit?.toUpperCase() || 'PCS'} LEFT</span></div>
                            </div>
                          </div>
                          <div className="font-black text-zinc-900 text-xl tracking-tighter">₹{item.base_price}</div>
                        </div>
                      ))
                    )}
                  </ScrollArea>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          <Button size="icon" className="h-14 w-14 rounded-2xl bg-zinc-900 hover:bg-zinc-800 text-white shrink-0 shadow-xl shadow-zinc-900/20 active:scale-95 transition-all">
            <ScanLine className="h-6 w-6" />
          </Button>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
          <div className="px-6 pt-6">
            <TabsList className="bg-zinc-100/80 backdrop-blur-xl p-1.5 rounded-[1.25rem] w-full justify-start h-auto flex-wrap gap-2">
              <TabsTrigger value="all" className="rounded-xl px-6 py-2.5 font-black text-[10px] uppercase tracking-widest data-[state=active]:bg-white data-[state=active]:shadow-lg data-[state=active]:text-zinc-900 text-zinc-400">All Items</TabsTrigger>
              <TabsTrigger value="buckets" className="rounded-xl px-6 py-2.5 font-black text-[10px] uppercase tracking-widest data-[state=active]:bg-white data-[state=active]:shadow-lg data-[state=active]:text-zinc-900 text-zinc-400">Buckets</TabsTrigger>
              <TabsTrigger value="tiffins" className="rounded-xl px-6 py-2.5 font-black text-[10px] uppercase tracking-widest data-[state=active]:bg-white data-[state=active]:shadow-lg data-[state=active]:text-zinc-900 text-zinc-400">Tiffins</TabsTrigger>
              <TabsTrigger value="bottles" className="rounded-xl px-6 py-2.5 font-black text-[10px] uppercase tracking-widest data-[state=active]:bg-white data-[state=active]:shadow-lg data-[state=active]:text-zinc-900 text-zinc-400">Bottles</TabsTrigger>
            </TabsList>
          </div>
          
          <ScrollArea className="flex-1 p-6">
            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-6">
              {!catalogData ? <div className="p-4">Loading...</div> : 
               filteredCatalog.length === 0 ? <div className="p-12 text-center text-zinc-400 font-black uppercase tracking-widest text-xs col-span-full">Catalog empty</div> :
               filteredCatalog.map((v) => (
                <motion.div 
                  whileHover={{ y: -4 }}
                  whileTap={{ scale: 0.96 }}
                  key={v.id}
                  onClick={() => addToCart(v)}
                  className="bg-white border border-zinc-50 rounded-[2rem] overflow-hidden shadow-xl shadow-zinc-200/40 hover:shadow-2xl hover:shadow-zinc-300/50 cursor-pointer group flex flex-col transition-all duration-300"
                >
                  <div className="aspect-square relative overflow-hidden bg-zinc-50 shrink-0 shadow-inner">
                    {v.image ? (
                      <img src={v.image} alt={v.productName} className="w-full h-full object-cover mix-blend-multiply group-hover:scale-110 transition-transform duration-700" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-zinc-200">
                        <Package className="h-12 w-12 opacity-50" />
                      </div>
                    )}
                    <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-xl font-black px-3 py-1.5 rounded-xl text-sm shadow-xl tracking-tighter">
                      ₹{v.base_price}
                    </div>
                  </div>
                  <div className="p-5 flex-1 flex flex-col gap-1">
                    <h4 className="font-black text-zinc-900 leading-tight text-lg group-hover:text-blue-600 transition-colors">{v.productName}</h4>
                    <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">{v.size}</p>
                    <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mt-auto pt-2">{v.stock} {v.unit?.toUpperCase() || 'PCS'} IN STOCK</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </ScrollArea>
        </Tabs>
      </Card>

      <div className="w-full lg:w-[450px] flex flex-col gap-6">
        <Card className="flex-1 border-none shadow-2xl shadow-zinc-200/50 bg-white/70 backdrop-blur-3xl rounded-[2.5rem] flex flex-col min-h-[400px]">
          <div className="p-6 border-b border-zinc-50 bg-zinc-50/30 flex justify-between items-center rounded-t-[2.5rem]">
            <h3 className="font-black text-xl text-zinc-900 flex items-center gap-3 tracking-tight">
              <div className="p-2 bg-zinc-900 rounded-xl text-white"><ShoppingCart className="h-5 w-5" /></div> Current Order
            </h3>
            <Badge className="bg-zinc-900 text-white font-black px-4 py-2 text-xs rounded-xl shadow-xl">
              {cart.length} ITEMS
            </Badge>
          </div>
          
          <ScrollArea className="flex-1 p-6">
            <AnimatePresence mode="popLayout">
              {cart.length === 0 ? (
                <motion.div initial={{opacity:0}} animate={{opacity:1}} className="h-full flex flex-col items-center justify-center text-zinc-300 py-20 gap-4">
                  <div className="p-8 bg-zinc-50 rounded-full shadow-inner"><Package className="h-16 w-16 opacity-10" /></div>
                  <p className="font-black text-xs uppercase tracking-[0.2em] opacity-40">Cart is empty</p>
                </motion.div>
              ) : (
                <div className="space-y-4">
                  {cart.map(item => (
                    <motion.div 
                      key={item.id}
                      layout
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      className="bg-white/80 backdrop-blur-xl border border-zinc-50 rounded-3xl p-4 shadow-xl shadow-zinc-100 flex items-center gap-4 group"
                    >
                      <div className="h-14 w-14 rounded-2xl bg-zinc-50 shrink-0 shadow-inner flex items-center justify-center overflow-hidden">
                        {item.image ? (
                          <img src={item.image} className="object-cover mix-blend-multiply" />
                        ) : (
                          <Package className="h-5 w-5 text-zinc-200" />
                        )}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <h4 className="font-black text-zinc-900 text-sm truncate uppercase tracking-tight">{item.productName}</h4>
                        <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mt-0.5">{item.size} &bull; ₹{item.base_price} / {item.unit || 'pcs'}</div>
                      </div>
                      
                      <div className="flex flex-col items-end gap-2 shrink-0">
                        <div className="font-black text-zinc-900 tracking-tighter text-lg">₹{item.base_price * item.qty}</div>
                        <div className="flex items-center bg-zinc-100 p-1 rounded-xl shadow-inner h-9">
                          <button onClick={() => updateQty(item.id, -1)} className="w-8 h-full flex items-center justify-center hover:bg-white rounded-lg text-zinc-400 hover:text-zinc-900 transition-all active:scale-75"><Minus className="h-3 w-3" /></button>
                          <span className="w-12 text-center font-black text-xs text-zinc-900">{item.qty} {item.unit || 'pcs'}</span>
                          <button onClick={() => updateQty(item.id, 1)} className="w-8 h-full flex items-center justify-center hover:bg-white rounded-lg text-zinc-400 hover:text-zinc-900 transition-all active:scale-75"><Plus className="h-3 w-3" /></button>
                        </div>
                      </div>
                      
                      <button onClick={() => removeItem(item.id)} className="opacity-0 group-hover:opacity-100 p-2 text-zinc-300 hover:text-red-500 transition-all"><Trash2 className="h-4 w-4" /></button>
                    </motion.div>
                  ))}
                </div>
              )}
            </AnimatePresence>
          </ScrollArea>
        </Card>

        <Card className="border-none shadow-2xl shadow-zinc-300/50 bg-white rounded-[2.5rem] overflow-visible relative">
          <CardContent className="p-0">
            <div className="p-8 bg-zinc-900 text-white rounded-t-[2.5rem] border-b border-white/5 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full blur-3xl -mr-10 -mt-10" />
              <div className="flex justify-between items-center mb-6 relative z-10">
                <span className="text-zinc-400 font-black uppercase tracking-widest text-[10px]">Subtotal</span>
                <span className="font-black text-white text-xl tracking-tighter">₹{subtotal.toLocaleString()}</span>
              </div>
              
              <div className="space-y-6 relative z-10">
                <div className="flex justify-between items-center">
                  <span className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-blue-400">
                    <Tag className="h-3.5 w-3.5"/> Bargain Slider
                  </span>
                  <span className="text-sm font-black text-blue-400">- ₹{actualDiscount}</span>
                </div>
                
                <Slider
                  disabled={cart.length === 0}
                  value={[actualDiscount]}
                  max={subtotal}
                  step={10}
                  onValueChange={(vals) => setDiscount(Array.isArray(vals) ? vals[0] : (vals as number))}
                  className="py-2"
                />

                <AnimatePresence>
                  {isBelowMsp && cart.length > 0 && (
                    <motion.div 
                      initial={{ opacity: 0, y: -10, height: 0 }} animate={{ opacity: 1, y: 0, height: "auto" }} exit={{ opacity: 0, y: -10, height: 0 }}
                      className="bg-red-500/10 text-red-400 p-4 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center gap-3 border border-red-500/20"
                    >
                      <AlertTriangle className="h-5 w-5 shrink-0" />
                      Danger: Selling below MSP (₹{totalMsp})
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            <div className="p-8 space-y-8">
              <div className="flex justify-between items-end">
                <span className="text-zinc-400 font-black uppercase tracking-widest text-[10px] mb-2">Final Amount</span>
                <span className={`text-5xl font-black tracking-tighter ${isBelowMsp ? 'text-red-600' : 'text-zinc-900'}`}>
                  ₹{finalTotal.toLocaleString()}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {[
                  { id: 'upi', icon: QrCode, label: 'UPI / QR', color: 'purple' },
                  { id: 'cash', icon: IndianRupee, label: 'CASH', color: 'emerald' },
                  { id: 'split', icon: Percent, label: 'SPLIT', color: 'blue' },
                  { id: 'khata', icon: Users, label: 'KHATA', color: 'amber' }
                ].map(mode => (
                  <Button 
                    key={mode.id}
                    className={`h-16 rounded-[1.25rem] flex items-center justify-center gap-3 border-2 transition-all font-black text-[10px] uppercase tracking-widest ${paymentMode === mode.id ? `bg-zinc-900 border-zinc-900 text-white shadow-2xl` : 'bg-white border-zinc-100 text-zinc-400 hover:border-zinc-200'}`}
                    onClick={() => setPaymentMode(mode.id as any)}
                  >
                    <mode.icon className="h-5 w-5" />
                    {mode.label}
                  </Button>
                ))}
              </div>

              <Button 
                onClick={handleCheckout}
                className={`w-full h-20 text-xl font-black uppercase tracking-[0.2em] shadow-2xl rounded-[1.5rem] transition-all transform active:scale-[0.98] ${isBelowMsp ? 'bg-red-600 hover:bg-red-700 shadow-red-600/30' : 'bg-zinc-900 hover:bg-black shadow-zinc-900/40'} text-white`}
                disabled={cart.length === 0}
              >
                {isBelowMsp ? "Checkout Anyway" : "Generate Bill"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
