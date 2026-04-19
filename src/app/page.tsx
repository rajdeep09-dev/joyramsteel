"use client";

import { motion } from "framer-motion";
import { 
  IndianRupee, TrendingUp, Package, AlertTriangle,
  QrCode, ShoppingCart, Banknote, MessageCircle, Truck
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import Link from "next/link";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.1 } }
};

const item = {
  hidden: { y: 20, opacity: 0 },
  show: { y: 0, opacity: 1 }
};

export default function Dashboard() {
  const sales = useLiveQuery(() => db.sales.toArray(), []);
  const saleItems = useLiveQuery(() => db.sale_items.toArray(), []);
  const variants = useLiveQuery(() => db.variants.toArray(), []);
  const products = useLiveQuery(() => db.products.toArray(), []);
  const customers = useLiveQuery(() => db.customers.toArray(), []);

  const isDataLoading = sales === undefined || saleItems === undefined || variants === undefined || products === undefined || customers === undefined;

  if (isDataLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-zinc-400 font-black uppercase tracking-[0.3em] animate-pulse text-xs">
          Initialising Systems...
        </div>
      </div>
    );
  }

  // Fallback to empty arrays if data has loaded but is empty
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
  const todaySplit = todaysSales.filter(s => s.payment_method === 'split').reduce((acc, s) => acc + s.total_amount, 0); 
  
  const totalReceived = todayCash + todayUpi + todaySplit;
  const cashPercentage = totalReceived > 0 ? Math.round(((todayCash + todaySplit/2) / totalReceived) * 100) : 0;
  const upiPercentage = totalReceived > 0 ? 100 - cashPercentage : 0;

  const lowStock = allVariants.filter(v => v.stock < 10).map(v => {
    const p = allProducts.find(p => p.id === v.product_id);
    return {
      id: v.id,
      name: p?.name || "Unknown",
      size: v.size,
      stock: v.stock,
      status: v.stock < 5 ? "Critical" : "Low"
    };
  });

  const stats = [
    {
      title: "Total Revenue Today",
      value: `₹ ${todayRevenue.toLocaleString()}`,
      change: "Live updates",
      trend: "neutral",
      icon: IndianRupee,
      color: "text-zinc-900",
      bg: "bg-zinc-100",
      gradient: "from-zinc-500/5 to-zinc-500/10"
    },
    {
      title: "Items Sold Today",
      value: `${itemsSoldToday} Units`,
      change: "Live updates",
      trend: "neutral",
      icon: Package,
      color: "text-zinc-900",
      bg: "bg-zinc-100",
      gradient: "from-zinc-500/5 to-zinc-500/10"
    },
    {
      title: "Pending Udhar (Khata)",
      value: `₹ ${pendingKhata.toLocaleString()}`,
      change: `${khataFollowups.length} follow-ups needed`,
      trend: "neutral",
      icon: AlertTriangle,
      color: "text-zinc-900",
      bg: "bg-zinc-100",
      gradient: "from-zinc-500/5 to-zinc-500/10"
    },
  ];

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-10">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h2 className="text-4xl font-black tracking-tight text-zinc-900">Good Evening, Suraj! 👋</h2>
          <p className="text-zinc-500 mt-1 text-lg font-medium tracking-tight uppercase tracking-widest text-xs font-black opacity-60">Joy Ram Steel &bull; End of Day (EOD) summary</p>
        </div>
        <div className="flex gap-4">
          <Link href="/pos">
            <Button size="lg" className="bg-zinc-900 hover:bg-zinc-800 text-white shadow-2xl shadow-zinc-900/20 rounded-2xl h-14 px-8 font-black transition-all active:scale-95">
              <ShoppingCart className="mr-2 h-5 w-5" />
              Open POS
            </Button>
          </Link>
          <Link href="/inventory">
            <Button size="lg" variant="outline" className="bg-white/50 backdrop-blur-xl hover:bg-white border-zinc-200 text-zinc-700 shadow-sm rounded-2xl h-14 px-8 font-black transition-all active:scale-95">
              <Truck className="mr-2 h-5 w-5" />
              Receive Stock
            </Button>
          </Link>
        </div>
      </div>

      <motion.div 
        variants={container}
        initial="hidden"
        animate="show"
        className="grid gap-6 md:grid-cols-3"
      >
        {stats.map((stat, i) => (
          <motion.div key={i} variants={item}>
            <Card className={`border-none shadow-2xl shadow-zinc-200/50 bg-gradient-to-br ${stat.gradient} backdrop-blur-3xl relative overflow-hidden group rounded-[2rem]`}>
              <div className="absolute inset-0 bg-white/40 group-hover:bg-white/30 transition-colors" />
              <CardContent className="p-8 relative z-10">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-xs font-black text-zinc-400 uppercase tracking-widest mb-1">{stat.title}</p>
                    <h3 className="text-4xl font-black text-zinc-900 tracking-tighter">{stat.value}</h3>
                  </div>
                  <div className={`p-4 rounded-2xl bg-white shadow-xl shadow-zinc-200/50`}>
                    <stat.icon className={`h-6 w-6 ${stat.color}`} />
                  </div>
                </div>
                <div className="mt-6 flex items-center text-xs font-black uppercase tracking-wider text-zinc-500">
                  {stat.change}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </motion.div>

      <div className="grid gap-8 md:grid-cols-12 pb-10">
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
          className="md:col-span-8 space-y-8"
        >
          {/* EOD Cash vs UPI Reconciliation */}
          <Card className="border-none shadow-2xl shadow-zinc-200/50 bg-white/70 backdrop-blur-3xl rounded-[2.5rem] overflow-hidden">
            <CardHeader className="p-8 pb-4">
              <CardTitle className="text-2xl font-black flex items-center gap-3">
                <div className="p-2 bg-emerald-50 rounded-xl"><Banknote className="h-6 w-6 text-emerald-600" /></div> EOD Till Reconciliation
              </CardTitle>
              <CardDescription className="text-lg font-medium text-zinc-500">Check your physical cash drawer against digital sales.</CardDescription>
            </CardHeader>
            <CardContent className="p-8 pt-0">
              <div className="space-y-8">
                <div>
                  <div className="flex justify-between text-xs font-black uppercase tracking-widest mb-3">
                    <span className="text-zinc-400 flex items-center gap-2"><QrCode className="h-4 w-4 text-purple-500"/> UPI (Digital)</span>
                    <span className="text-zinc-900 font-black">₹ {Math.round(totalReceived * (upiPercentage/100)).toLocaleString()} ({upiPercentage}%)</span>
                  </div>
                  <Progress value={upiPercentage} className="h-4 bg-zinc-100 rounded-full" />
                </div>
                <div>
                  <div className="flex justify-between text-xs font-black uppercase tracking-widest mb-3">
                    <span className="text-zinc-400 flex items-center gap-2"><Banknote className="h-4 w-4 text-emerald-500"/> Cash (Drawer)</span>
                    <span className="text-zinc-900 font-black">₹ {Math.round(totalReceived * (cashPercentage/100)).toLocaleString()} ({cashPercentage}%)</span>
                  </div>
                  <Progress value={cashPercentage} className="h-4 bg-zinc-100 rounded-full" />
                </div>
                <div className="pt-6 border-t border-zinc-100 flex flex-col sm:flex-row gap-6 justify-between items-center text-center sm:text-left">
                  <p className="text-base text-zinc-500 font-medium leading-relaxed">Count the physical cash in your drawer.<br/>It should be exactly <strong className="text-zinc-900 font-black">₹ {Math.round(totalReceived * (cashPercentage/100)).toLocaleString()}</strong>.</p>
                  <Button variant="outline" className="rounded-2xl border-emerald-200 text-emerald-700 bg-emerald-50/50 backdrop-blur-xl hover:bg-emerald-50 h-14 px-8 font-black transition-all active:scale-95 shadow-xl shadow-emerald-200/20">Match Verified</Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Low Stock Alerts */}
          <Card className="border-none shadow-2xl shadow-zinc-200/50 bg-white/70 backdrop-blur-3xl rounded-[2.5rem]">
            <CardHeader className="p-8 pb-4 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-2xl font-black flex items-center gap-3">
                  <div className="p-2 bg-amber-50 rounded-xl"><AlertTriangle className="h-6 w-6 text-amber-500" /></div> Low Stock Radar
                </CardTitle>
                <CardDescription className="text-lg font-medium text-zinc-500">Items running out. Update your order list.</CardDescription>
              </div>
              <Badge className="bg-zinc-900 text-white font-black px-4 py-2 text-sm rounded-xl shadow-xl">{lowStock.length} Items</Badge>
            </CardHeader>
            <CardContent className="p-0 pb-8 px-4">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent border-none">
                    <TableHead className="pl-4 h-12 font-black uppercase text-[10px] tracking-[0.2em] text-zinc-400">Product</TableHead>
                    <TableHead className="h-12 font-black uppercase text-[10px] tracking-[0.2em] text-zinc-400">Variant</TableHead>
                    <TableHead className="text-right h-12 font-black uppercase text-[10px] tracking-[0.2em] text-zinc-400">Stock</TableHead>
                    <TableHead className="text-right pr-4 h-12 font-black uppercase text-[10px] tracking-[0.2em] text-zinc-400">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lowStock.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-12 text-zinc-400 font-bold uppercase tracking-widest text-[10px]">All stock levels are healthy.</TableCell>
                    </TableRow>
                  ) : lowStock.map((item) => (
                    <TableRow key={item.id} className="hover:bg-zinc-50/50 transition-colors border-none group">
                      <TableCell className="font-bold text-zinc-900 pl-4 py-6">{item.name}</TableCell>
                      <TableCell className="text-zinc-500 font-medium py-6">{item.size}</TableCell>
                      <TableCell className="text-right text-zinc-900 font-black py-6">
                        {item.stock}
                      </TableCell>
                      <TableCell className="text-right pr-4 py-6">
                        <Badge 
                          variant="outline"
                          className={item.status === "Critical" ? "bg-red-50 text-red-700 border-red-100 shadow-none font-black px-3 py-1 rounded-lg" : "bg-amber-50 text-amber-700 border-amber-100 shadow-none font-black px-3 py-1 rounded-lg"}
                        >
                          {item.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.4 }}
          className="md:col-span-4"
        >
          <Card className="border-none shadow-2xl shadow-zinc-200/50 bg-zinc-900 text-white rounded-[2.5rem] h-full flex flex-col overflow-hidden relative">
            <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.05),transparent)] pointer-events-none" />
            <CardHeader className="p-8 pb-4 relative z-10">
              <CardTitle className="text-2xl font-black flex items-center gap-3">
                <div className="p-2 bg-white/10 rounded-xl"><MessageCircle className="h-6 w-6 text-green-400" /></div> Khata Follow-ups
              </CardTitle>
              <CardDescription className="text-zinc-400 text-lg font-medium leading-tight">Customers with overdue payments.</CardDescription>
            </CardHeader>
            <CardContent className="p-8 flex-1 flex flex-col gap-8 relative z-10">
              {khataFollowups.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center text-zinc-500 gap-4">
                  <div className="p-6 bg-white/5 rounded-full shadow-inner"><Package className="h-12 w-12 opacity-20" /></div>
                  <p className="font-bold uppercase tracking-widest text-[10px]">No overdue payments!</p>
                </div>
              ) : khataFollowups.slice(0,3).map(customer => (
                <div key={customer.id} className="bg-white/5 rounded-[2rem] p-6 flex flex-col gap-4 border border-white/5 backdrop-blur-xl group hover:bg-white/10 transition-all shadow-xl">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-black text-xl tracking-tight group-hover:text-blue-400 transition-colors">{customer.name}</h4>
                      <p className="text-zinc-500 font-bold text-[10px] mt-1 uppercase tracking-[0.2em]">Last TX: {customer.last_tx}</p>
                    </div>
                    <span className="text-red-400 font-black text-2xl tracking-tighter">₹{customer.balance.toLocaleString()}</span>
                  </div>
                  <Button 
                    onClick={() => {
                      const text = encodeURIComponent(`Hello ${customer.name}, this is a gentle reminder from Joy Ram Steel. Your pending Khata balance is ₹${customer.balance}. Please settle it at your earliest convenience.`);
                      window.open(`https://wa.me/${customer.phone.replace(/[^0-9]/g, '')}?text=${text}`, '_blank');
                    }}
                    className="w-full bg-white text-zinc-900 hover:bg-zinc-100 font-black border-none rounded-2xl h-12 shadow-2xl active:scale-95 transition-all text-xs tracking-widest uppercase"
                  >
                    <MessageCircle className="mr-2 h-4 w-4" /> Send Reminder
                  </Button>
                </div>
              ))}
              
              <Link href="/khata" className="mt-auto">
                <Button variant="ghost" className="w-full text-zinc-400 hover:text-white hover:bg-white/5 rounded-2xl font-black h-14 tracking-widest text-xs uppercase transition-all">
                  VIEW ALL CUSTOMERS &rarr;
                </Button>
              </Link>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}