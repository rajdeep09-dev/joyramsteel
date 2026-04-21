"use client";

import { motion, AnimatePresence } from "framer-motion";
import { 
  IndianRupee, TrendingUp, Package, AlertTriangle,
  QrCode, ShoppingCart, Banknote, MessageCircle, Truck, 
  History as HistoryIcon, Zap, LayoutDashboard,
  ShieldCheck, ArrowRight, User, MousePointer2,
  Clock, CheckCircle2, ChevronRight, Activity, 
  PackageSearch,
  ShoppingCartIcon
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import Link from "next/link";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.1 } }
};

const item = {
  hidden: { y: 20, opacity: 0 },
  show: { y: 0, opacity: 1 }
};

export default function Dashboard() {
  const [isTimedOut, setIsTimedOut] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setIsTimedOut(true), 2000);
    return () => clearTimeout(timer);
  }, []);

  const sales = useLiveQuery(() => db.sales.where('is_deleted').equals(0).toArray(), []);
  const saleItems = useLiveQuery(() => db.sale_items.where('is_deleted').equals(0).toArray(), []);
  const variants = useLiveQuery(() => db.variants.where('is_deleted').equals(0).toArray(), []);
  const products = useLiveQuery(() => db.products.where('is_deleted').equals(0).toArray(), []);
  const customers = useLiveQuery(() => db.customers.where('is_deleted').equals(0).toArray(), []);
  const parkedCarts = useLiveQuery(() => db.parked_carts.toArray()) || [];

  const isDataLoading = !isTimedOut && (sales === undefined || saleItems === undefined || variants === undefined || products === undefined || customers === undefined);

  if (isDataLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-6">
        <div className="text-zinc-400 font-black uppercase tracking-[0.3em] animate-pulse text-xs">Initialising...</div>
      </div>
    );
  }

  const allSales = sales || [];
  const allSaleItems = saleItems || [];
  const allVariants = variants || [];
  const allProducts = products || [];

  const todayStr = new Date().toISOString().split('T')[0];
  const todaysSales = allSales.filter(s => s.date.startsWith(todayStr));
  const todayRevenue = todaysSales.reduce((acc, sale) => acc + sale.total_amount, 0);

  const lowStock = allVariants.filter(v => v.stock < 10).map(v => {
    const p = allProducts.find(p => p.id === v.product_id);
    return { ...v, productName: p?.name || "Unknown" };
  }).sort((a, b) => a.stock - b.stock);

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-20 text-left">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="h-16 w-16 rounded-2xl overflow-hidden border-2 border-white dark:border-zinc-800 shadow-xl shrink-0 p-1 bg-white dark:bg-zinc-900">
            <img src="/joyramlogo.png" alt="Logo" className="w-full h-full object-cover rounded-xl" />
          </div>
          <div>
            <h2 className="text-3xl font-black tracking-tight text-zinc-900 dark:text-white uppercase italic">System Console</h2>
            <p className="text-zinc-500 font-bold uppercase tracking-widest text-[10px] opacity-60">JRS TERMINAL 09-DEV</p>
          </div>
        </div>
        <div className="flex gap-3">
          <Link href="/pos"><Button className="bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 h-12 rounded-xl font-black uppercase text-[10px] tracking-widest px-8 shadow-xl">POS terminal</Button></Link>
          <Link href="/history"><Button variant="outline" className="h-12 rounded-xl font-black uppercase text-[10px] tracking-widest px-8 border-zinc-200 dark:border-zinc-800">Archives</Button></Link>
        </div>
      </div>

      <motion.div variants={container} initial="hidden" animate="show" className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Today's Revenue", val: `₹${todayRevenue.toLocaleString()}`, icon: IndianRupee, color: "text-blue-600" },
          { label: "Low Stock Items", val: lowStock.length, icon: PackageSearch, color: "text-red-600" },
          { label: "Parked Carts", val: parkedCarts.length, icon: MousePointer2, color: "text-amber-600" },
          { label: "Total Products", val: allVariants.length, icon: Package, color: "text-zinc-900 dark:text-white" }
        ].map((s, i) => (
          <motion.div key={i} variants={item}>
            <Card className="border-zinc-100 dark:border-zinc-800 shadow-lg rounded-3xl overflow-hidden bg-white dark:bg-zinc-900/50 backdrop-blur-xl">
              <CardContent className="p-6 flex justify-between items-center">
                <div className="text-left">
                  <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-1">{s.label}</p>
                  <h3 className="text-3xl font-black text-zinc-900 dark:text-white tracking-tighter italic">{s.val}</h3>
                </div>
                <div className="p-4 bg-zinc-50 dark:bg-zinc-800 rounded-2xl border border-zinc-100 dark:border-zinc-700 shadow-inner">
                  <s.icon className={cn("h-6 w-6", s.color)} />
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </motion.div>

      <div className="grid gap-8 md:grid-cols-12">
        {/* Module: Low Stock Items */}
        <div className="md:col-span-4 space-y-6">
          <Card className="border-zinc-200 dark:border-zinc-800 shadow-xl rounded-[2.5rem] bg-white dark:bg-zinc-900/50 backdrop-blur-xl h-full flex flex-col overflow-hidden">
             <CardHeader className="p-8 pb-4 border-b border-zinc-50 dark:border-zinc-800">
                <CardTitle className="text-sm font-black uppercase tracking-[0.2em] flex items-center gap-3 italic">
                   <Zap className="h-4 w-4 text-red-500 fill-red-500 animate-pulse" /> Low Stock Radar
                </CardTitle>
             </CardHeader>
             <CardContent className="p-0 flex-1">
                <ScrollArea className="h-[400px]">
                   <div className="p-4 space-y-3">
                      {lowStock.length === 0 ? (
                        <div className="py-20 text-center opacity-30 text-[10px] font-black uppercase">All Stock Healthy</div>
                      ) : lowStock.map(v => (
                        <div key={v.id} className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-100 dark:border-zinc-800 flex justify-between items-center group hover:border-red-200 dark:hover:border-red-900/50 transition-all">
                           <div className="text-left overflow-hidden mr-2">
                              <p className="font-black text-xs uppercase italic truncate dark:text-white">{v.productName}</p>
                              <p className="text-[9px] font-bold text-zinc-400 uppercase mt-1">{v.size}</p>
                           </div>
                           <Badge className={cn("rounded-lg font-black text-[10px]", v.stock < 5 ? "bg-red-500" : "bg-amber-500")}>{v.stock} LEFT</Badge>
                        </div>
                      ))}
                   </div>
                </ScrollArea>
             </CardContent>
             <Link href="/inventory" className="p-4 bg-zinc-50 dark:bg-zinc-800/50 border-t border-zinc-100 dark:border-zinc-800">
                <Button variant="ghost" className="w-full text-[9px] font-black uppercase tracking-widest gap-2">Inventory Management <ArrowRight className="h-3 w-3" /></Button>
             </Link>
          </Card>
        </div>

        {/* Module: Recent Sold Items */}
        <div className="md:col-span-8 space-y-6">
          <Card className="border-zinc-200 dark:border-zinc-800 shadow-xl rounded-[2.5rem] bg-white dark:bg-zinc-900/50 backdrop-blur-xl h-full flex flex-col overflow-hidden">
             <CardHeader className="p-8 pb-4 border-b border-zinc-50 dark:border-zinc-800">
                <CardTitle className="text-sm font-black uppercase tracking-[0.2em] flex items-center gap-3 italic text-zinc-900 dark:text-white">
                   <ShoppingCartIcon className="h-4 w-4 text-blue-600" /> Recent Sales Movement
                </CardTitle>
             </CardHeader>
             <CardContent className="p-0 flex-1">
                <Table>
                   <TableHeader className="bg-zinc-50 dark:bg-zinc-800/50">
                      <TableRow className="border-none h-12">
                         <TableHead className="pl-8 font-black uppercase text-[9px] tracking-widest text-zinc-400">Entry</TableHead>
                         <TableHead className="font-black uppercase text-[9px] tracking-widest text-zinc-400">Qty Delta</TableHead>
                         <TableHead className="font-black uppercase text-[9px] tracking-widest text-zinc-400 text-right pr-8">Time-Log</TableHead>
                      </TableRow>
                   </TableHeader>
                   <TableBody>
                      {allSaleItems.slice().reverse().slice(0, 7).map(si => {
                        const v = allVariants.find(v => v.id === si.variant_id);
                        const p = allProducts.find(p => p.id === v?.product_id);
                        const s = allSales.find(s => s.id === si.sale_id);
                        return (
                          <TableRow key={si.id} className="border-zinc-50 dark:border-zinc-800 hover:bg-zinc-50/50 dark:hover:bg-zinc-800/30 transition-colors h-16">
                             <TableCell className="pl-8">
                                <div className="font-black text-zinc-900 dark:text-white uppercase italic text-[11px]">{p?.name || "Unknown"}</div>
                                <div className="text-[9px] font-bold text-zinc-400 uppercase mt-0.5">{v?.size}</div>
                             </TableCell>
                             <TableCell>
                                <Badge className="bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 font-black text-[9px] px-2 py-0.5">-{si.quantity} {v?.unit?.toUpperCase() || 'PCS'}</Badge>
                             </TableCell>
                             <TableCell className="text-right pr-8">
                                <div className="text-[10px] font-black text-zinc-500 uppercase tracking-tighter flex items-center justify-end gap-2">
                                   <Clock className="h-3 w-3" /> {s ? new Date(s.date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : "N/A"}
                                </div>
                             </TableCell>
                          </TableRow>
                        );
                      })}
                   </TableBody>
                </Table>
             </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
