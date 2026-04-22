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

  const isDataLoading = !isTimedOut && (sales === undefined || saleItems === undefined || variants === undefined || products === undefined || customers === undefined);

  if (isDataLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-6">
        <div className="text-zinc-400 font-black uppercase tracking-[0.3em] animate-pulse text-xs text-left">Initialising...</div>
      </div>
    );
  }

  const allSales = sales || [];
  const allSaleItems = saleItems || [];
  const allVariants = variants || [];
  const allProducts = products || [];

  const todayStr = new Date().toISOString().split('T')[0];
  const todaysSales = allSales.filter(s => s.date.startsWith(todayStr) && s.is_returned !== 1);
  const todayRevenue = todaysSales.reduce((acc, sale) => acc + sale.total_amount, 0);

  const lowStock = allVariants.filter(v => v.stock < 10).map(v => {
    const p = allProducts.find(p => p.id === v.product_id);
    return { ...v, productName: p?.name || "Unknown" };
  }).sort((a, b) => a.stock - b.stock);

  const recentMovements = allSaleItems
    .filter(si => {
      const parentSale = allSales.find(s => s.id === si.sale_id);
      return parentSale && parentSale.is_returned !== 1;
    })
    .slice().reverse().slice(0, 7);

  return (
    <div className="space-y-6 md:space-y-8 max-w-7xl mx-auto pb-24 md:pb-20 text-left px-4 md:px-0">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="flex items-center gap-3 md:gap-4">
          <div className="h-14 w-14 md:h-16 md:w-16 rounded-2xl overflow-hidden border-2 border-white dark:border-zinc-800 shadow-xl shrink-0 p-1 bg-white dark:bg-zinc-900">
            <img src="/joyramlogo.png" alt="Logo" className="w-full h-full object-cover rounded-xl" />
          </div>
          <div>
            <h2 className="text-2xl md:text-3xl font-black tracking-tight text-zinc-900 dark:text-white uppercase italic leading-none">System Console</h2>
            <p className="text-zinc-500 font-bold uppercase tracking-widest text-[8px] md:text-[10px] opacity-60 mt-1">JRS TERMINAL 09-DEV</p>
          </div>
        </div>
        <div className="flex gap-2 md:gap-3">
          <Link href="/pos" className="flex-1 md:flex-none"><Button className="w-full bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 h-12 md:h-14 rounded-xl font-black uppercase text-[10px] tracking-widest px-6 md:px-8 shadow-xl">POS terminal</Button></Link>
          <Link href="/history" className="flex-1 md:flex-none"><Button variant="outline" className="w-full h-12 md:h-14 rounded-xl font-black uppercase text-[10px] tracking-widest px-6 md:px-8 border-zinc-200 dark:border-zinc-800 dark:text-white">Archives</Button></Link>
        </div>
      </div>

      <motion.div variants={container} initial="hidden" animate="show" className="grid gap-4 md:gap-6 grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Today's Revenue", val: `₹${todayRevenue.toLocaleString()}`, icon: IndianRupee, color: "text-blue-600" },
          { label: "Low Stock Items", val: lowStock.length, icon: PackageSearch, color: "text-red-600" },
          { label: "Total Units Sold", val: recentMovements.reduce((acc, si) => acc + si.quantity, 0), icon: ShoppingCartIcon, color: "text-emerald-600" },
          { label: "Total Products", val: allVariants.length, icon: Package, color: "text-zinc-900 dark:text-white" }
        ].map((s, i) => (
          <motion.div key={i} variants={item}>
            <Card className="border-zinc-100 dark:border-zinc-800 shadow-lg rounded-2xl md:rounded-3xl overflow-hidden bg-white dark:bg-zinc-900/50 backdrop-blur-xl">
              <CardContent className="p-4 md:p-6 flex justify-between items-center">
                <div className="text-left overflow-hidden">
                  <p className="text-[7px] md:text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-1 truncate">{s.label}</p>
                  <h3 className="text-xl md:text-3xl font-black text-zinc-900 dark:text-white tracking-tighter italic tabular-nums">{s.val}</h3>
                </div>
                <div className="p-3 md:p-4 bg-zinc-50 dark:bg-zinc-800 rounded-xl md:rounded-2xl border border-zinc-100 dark:border-zinc-700 shadow-inner shrink-0 ml-2">
                  <s.icon className={cn("h-4 w-4 md:h-6 md:w-6", s.color)} />
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </motion.div>

      <div className="grid gap-6 md:gap-8 grid-cols-1 md:grid-cols-12">
        {/* Module: Low Stock Items */}
        <div className="md:col-span-4 space-y-6 order-2 md:order-1">
          <Card className="border-zinc-200 dark:border-zinc-800 shadow-xl rounded-[2rem] md:rounded-[2.5rem] bg-white dark:bg-zinc-900/50 backdrop-blur-xl h-full flex flex-col overflow-hidden">
             <CardHeader className="p-6 md:p-8 pb-4 border-b border-zinc-50 dark:border-zinc-800">
                <CardTitle className="text-xs md:text-sm font-black uppercase tracking-[0.2em] flex items-center gap-3 italic dark:text-white">
                   <Zap className="h-4 w-4 text-red-500 fill-red-500 animate-pulse" /> Low Stock Radar
                </CardTitle>
             </CardHeader>
             <CardContent className="p-0 flex-1">
                <ScrollArea className="h-[300px] md:h-[400px]">
                   <div className="p-4 space-y-2 md:space-y-3">
                      {lowStock.length === 0 ? (
                        <div className="py-20 text-center opacity-30 text-[10px] font-black uppercase dark:text-white">All Stock Healthy</div>
                      ) : lowStock.map(v => (
                        <div key={v.id} className="p-3 md:p-4 rounded-xl md:rounded-2xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-100 dark:border-zinc-800 flex justify-between items-center group transition-all">
                           <div className="text-left overflow-hidden mr-2">
                              <p className="font-black text-[10px] md:text-xs uppercase italic truncate dark:text-white">{v.productName}</p>
                              <p className="text-[8px] md:text-[9px] font-bold text-zinc-400 uppercase mt-0.5">{v.size}</p>
                           </div>
                           <Badge className={cn("rounded-lg font-black text-[8px] md:text-[10px] shrink-0", v.stock < 5 ? "bg-red-500" : "bg-amber-500")}>{v.stock} LEFT</Badge>
                        </div>
                      ))}
                   </div>
                </ScrollArea>
             </CardContent>
             <Link href="/inventory" className="p-4 bg-zinc-50 dark:bg-zinc-800/50 border-t border-zinc-100 dark:border-zinc-800">
                <Button variant="ghost" className="w-full text-[8px] md:text-[9px] font-black uppercase tracking-widest gap-2 dark:text-white">Inventory Management <ArrowRight className="h-3 w-3" /></Button>
             </Link>
          </Card>
        </div>

        {/* Module: Recent Sales Movement */}
        <div className="md:col-span-8 space-y-6 order-1 md:order-2">
          <Card className="border-zinc-200 dark:border-zinc-800 shadow-xl rounded-[2rem] md:rounded-[2.5rem] bg-white dark:bg-zinc-900/50 backdrop-blur-xl h-full flex flex-col overflow-hidden text-left">
             <CardHeader className="p-6 md:p-8 pb-4 border-b border-zinc-50 dark:border-zinc-800">
                <CardTitle className="text-xs md:text-sm font-black uppercase tracking-[0.2em] flex items-center gap-3 italic text-zinc-900 dark:text-white">
                   <ShoppingCartIcon className="h-4 w-4 text-blue-600" /> Recent Sales Movement
                </CardTitle>
             </CardHeader>
             <CardContent className="p-0 flex-1 overflow-x-auto">
                <Table>
                   <TableHeader className="bg-zinc-50 dark:bg-zinc-800/50">
                      <TableRow className="border-none h-12 text-left">
                         <TableHead className="pl-6 md:pl-8 font-black uppercase text-[8px] md:text-[9px] tracking-widest text-zinc-400">Entry</TableHead>
                         <TableHead className="font-black uppercase text-[8px] md:text-[9px] tracking-widest text-zinc-400">Qty Delta</TableHead>
                         <TableHead className="font-black uppercase text-[8px] md:text-[9px] tracking-widest text-zinc-400 text-right pr-6 md:pr-8">Time-Log</TableHead>
                      </TableRow>
                   </TableHeader>
                   <TableBody>
                      {recentMovements.map(si => {
                        const v = allVariants.find(v => v.id === si.variant_id);
                        const p = allProducts.find(p => p.id === v?.product_id);
                        const s = allSales.find(s => s.id === si.sale_id);
                        return (
                          <TableRow key={si.id} className="border-zinc-50 dark:border-zinc-800 hover:bg-zinc-50/50 dark:hover:bg-zinc-800/30 transition-colors h-14 md:h-16 text-left">
                             <TableCell className="pl-6 md:pl-8">
                                <div className="font-black text-zinc-900 dark:text-white uppercase italic text-[10px] md:text-[11px] leading-tight truncate max-w-[100px] md:max-w-none">{p?.name || "Unknown"}</div>
                                <div className="text-[8px] md:text-[9px] font-bold text-zinc-400 uppercase mt-0.5">{v?.size}</div>
                             </TableCell>
                             <TableCell>
                                <Badge className="bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 font-black text-[8px] md:text-[9px] px-2 py-0.5 whitespace-nowrap">-{si.quantity} {v?.unit?.toUpperCase() || 'PCS'}</Badge>
                             </TableCell>
                             <TableCell className="text-right pr-6 md:pr-8">
                                <div className="text-[9px] md:text-[10px] font-black text-zinc-500 uppercase tracking-tighter flex items-center justify-end gap-1 md:gap-2">
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
