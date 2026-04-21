"use client";

import { motion } from "framer-motion";
import { 
  IndianRupee, TrendingUp, Package, AlertTriangle,
  QrCode, ShoppingCart, Banknote, MessageCircle, Truck, History as HistoryIcon
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
        <div className="text-zinc-400 font-black uppercase tracking-[0.3em] animate-pulse text-xs">
          Initialising Systems...
        </div>
      </div>
    );
  }

  const allSales = sales || [];
  const allSaleItems = saleItems || [];
  const allVariants = variants || [];
  const allProducts = products || [];
  const allCustomers = customers || [];

  const todayStr = new Date().toISOString().split('T')[0];
  const todaysSales = allSales.filter(s => s.date.startsWith(todayStr));
  
  const todayRevenue = todaysSales.reduce((acc, sale) => acc + sale.total_amount, 0);
  const itemsSoldToday = allSaleItems.filter(si => todaysSales.find(s => s.id === si.sale_id))
                                  .reduce((acc, curr) => acc + curr.quantity, 0);
  
  const pendingKhata = allCustomers.reduce((acc, curr) => acc + curr.balance, 0);
  const khataFollowups = allCustomers.filter(c => c.status === "Overdue" && c.balance > 0);

  const todayCash = todaysSales.filter(s => s.payment_method === 'cash').reduce((acc, s) => acc + s.total_amount, 0);
  const todayUpi = todaysSales.filter(s => s.payment_method === 'upi').reduce((acc, s) => acc + s.total_amount, 0);
  
  const totalReceived = todayCash + todayUpi;
  const cashPercentage = totalReceived > 0 ? Math.round((todayCash / totalReceived) * 100) : 0;
  const upiPercentage = totalReceived > 0 ? 100 - cashPercentage : 0;

  const stats = [
    { title: "Revenue Today", value: `₹ ${todayRevenue.toLocaleString()}`, icon: IndianRupee, color: "text-zinc-900" },
    { title: "Items Sold", value: `${itemsSoldToday} Units`, icon: Package, color: "text-zinc-900" },
    { title: "Pending Khata", value: `₹ ${pendingKhata.toLocaleString()}`, icon: AlertTriangle, color: "text-red-600" },
  ];

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-20">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="h-16 w-16 rounded-full overflow-hidden border-2 border-white shadow-xl shrink-0">
            <img src="/joyramlogo.png" alt="Logo" className="w-full h-full object-cover" />
          </div>
          <div>
            <h2 className="text-3xl font-black tracking-tight text-zinc-900 uppercase italic">Good Evening! 👋</h2>
            <p className="text-zinc-500 font-bold uppercase tracking-widest text-xs opacity-60">End of Day summary</p>
          </div>
        </div>
        <div className="flex gap-4">
          <Link href="/pos"><Button size="lg" className="bg-zinc-900 h-12 rounded-xl font-bold uppercase text-xs tracking-widest px-8">Open POS</Button></Link>
          <Link href="/history"><Button size="lg" variant="outline" className="h-12 rounded-xl font-bold uppercase text-xs tracking-widest px-8 border-zinc-200">Archives</Button></Link>
        </div>
      </div>

      <motion.div variants={container} initial="hidden" animate="show" className="grid gap-6 md:grid-cols-3">
        {stats.map((stat, i) => (
          <motion.div key={i} variants={item}>
            <Card className="border-zinc-200 shadow-xl rounded-2xl overflow-hidden group hover:border-zinc-900 transition-colors">
              <CardContent className="p-6 flex justify-between items-start">
                <div>
                  <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-1">{stat.title}</p>
                  <h3 className="text-3xl font-black text-zinc-900 tracking-tighter italic">{stat.value}</h3>
                </div>
                <div className="p-3 bg-zinc-50 rounded-xl border border-zinc-100 group-hover:bg-zinc-900 group-hover:text-white transition-all"><stat.icon className={`h-5 w-5 ${stat.color} group-hover:text-white`} /></div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </motion.div>

      {/* NEW: KITCHEN PULSE (Category Performance) */}
      <div className="grid gap-8 md:grid-cols-3">
         <Card className="border-zinc-200 shadow-xl rounded-2xl md:col-span-1 overflow-hidden bg-white">
            <CardHeader className="p-6 pb-2 border-b border-zinc-50 bg-zinc-50/50">
               <CardTitle className="text-sm font-black uppercase tracking-[0.2em] flex items-center gap-2 italic">
                  <TrendingUp className="h-4 w-4 text-blue-600" /> Category Pulse
               </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
               {[
                 { label: "Steel Cookware", val: 75, color: "bg-zinc-900" },
                 { label: "Kitchen Combos", val: 45, color: "bg-blue-600" },
                 { label: "Storage & Tiffins", val: 90, color: "bg-emerald-600" }
               ].map(cat => (
                 <div key={cat.label} className="space-y-2">
                    <div className="flex justify-between text-[9px] font-black uppercase tracking-widest">
                       <span>{cat.label}</span>
                       <span className="text-zinc-400">{cat.val}% of target</span>
                    </div>
                    <Progress value={cat.val} className={cn("h-1.5", cat.color)} />
                 </div>
               ))}
            </CardContent>
         </Card>

         <Card className="border-none shadow-xl rounded-2xl md:col-span-2 overflow-hidden bg-zinc-900 text-white relative">
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-[80px] -mr-32 -mt-32" />
            <div className="p-8 flex flex-col h-full justify-between relative z-10">
               <div className="space-y-1">
                  <p className="text-zinc-500 font-black text-[9px] uppercase tracking-[0.4em]">EOD GROWTH INTELLIGENCE</p>
                  <h3 className="text-4xl font-black italic tracking-tighter uppercase">Kitchen Pro Suite</h3>
               </div>
               <div className="flex gap-10 mt-8">
                  <div className="space-y-1">
                     <p className="text-zinc-500 font-bold text-[8px] uppercase tracking-widest">Profit (Est.)</p>
                     <p className="text-2xl font-black text-emerald-400 italic">₹ {(todayRevenue * 0.15).toLocaleString()}</p>
                  </div>
                  <div className="space-y-1">
                     <p className="text-zinc-500 font-bold text-[8px] uppercase tracking-widest">Avg Bill Value</p>
                     <p className="text-2xl font-black text-white italic">₹ {(todaysSales.length > 0 ? (todayRevenue / todaysSales.length) : 0).toLocaleString()}</p>
                  </div>
                  <div className="space-y-1">
                     <p className="text-zinc-500 font-bold text-[8px] uppercase tracking-widest">New Customers</p>
                     <p className="text-2xl font-black text-blue-400 italic">+{allCustomers.filter(c => c.updated_at.startsWith(todayStr)).length}</p>
                  </div>
               </div>
            </div>
         </Card>
      </div>

      <div className="grid gap-8 md:grid-cols-12">
        <div className="md:col-span-8 space-y-8">
          <Card className="border-zinc-200 shadow-xl rounded-2xl overflow-hidden">
            <CardHeader className="p-6 pb-2">
              <CardTitle className="text-xl font-black uppercase italic tracking-tight">EOD Reconciliation</CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-[10px] font-black uppercase mb-2">
                    <span className="text-zinc-400">UPI (Digital)</span>
                    <span>₹ {todayUpi.toLocaleString()}</span>
                  </div>
                  <Progress value={upiPercentage} className="h-2" />
                </div>
                <div>
                  <div className="flex justify-between text-[10px] font-black uppercase mb-2">
                    <span className="text-zinc-400">Cash (Drawer)</span>
                    <span>₹ {todayCash.toLocaleString()}</span>
                  </div>
                  <Progress value={cashPercentage} className="h-2" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="md:col-span-4">
          <Card className="border-zinc-200 shadow-xl rounded-2xl bg-zinc-900 text-white h-full">
            <CardHeader className="p-6 pb-2">
              <CardTitle className="text-xl font-black uppercase italic tracking-tight">Khata Follow-ups</CardTitle>
            </CardHeader>
            <CardContent className="p-6 flex flex-col gap-4">
              {khataFollowups.length === 0 ? (
                <div className="py-20 text-center opacity-40 text-xs font-bold uppercase tracking-widest">No overdue payments</div>
              ) : khataFollowups.slice(0, 3).map(customer => (
                <div key={customer.id} className="p-4 rounded-xl bg-white/5 border border-white/5 flex justify-between items-center">
                  <div className="text-left">
                    <p className="font-bold text-sm uppercase">{customer.name}</p>
                    <p className="text-[10px] text-zinc-500 font-bold uppercase mt-1">₹{customer.balance.toLocaleString()}</p>
                  </div>
                  <Button size="icon" variant="ghost" className="h-8 w-8 text-zinc-400 hover:text-white" onClick={() => {
                    const text = encodeURIComponent(`Reminder: ₹${customer.balance} pending at Joy Ram Steel.`);
                    window.open(`https://wa.me/${customer.phone.replace(/[^0-9]/g, '')}?text=${text}`, '_blank');
                  }}><MessageCircle className="h-4 w-4" /></Button>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
