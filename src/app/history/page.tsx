"use client";

import { useState } from "react";
import { 
  History as HistoryIcon, Search, Calendar, Filter, 
  ArrowRight, Download, Package, User, CreditCard,
  IndianRupee, TrendingUp, ChevronRight, Clock
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import { motion, AnimatePresence } from "framer-motion";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

export default function SalesHistory() {
  const [search, setSearch] = useState("");
  const [dateFilter, setDateFilter] = useState("all");

  const sales = useLiveQuery(() => db.sales.orderBy('date').reverse().toArray(), []) || [];
  const saleItems = useLiveQuery(() => db.sale_items.toArray(), []) || [];
  const variants = useLiveQuery(() => db.variants.toArray(), []) || [];
  const products = useLiveQuery(() => db.products.toArray(), []) || [];
  const customers = useLiveQuery(() => db.customers.toArray(), []) || [];

  const getFilteredSales = () => {
    let filtered = sales;
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    
    if (dateFilter === "today") {
      filtered = sales.filter(s => new Date(s.date).getTime() >= today);
    } else if (dateFilter === "yesterday") {
      const yesterday = today - 86400000;
      filtered = sales.filter(s => {
        const d = new Date(s.date).getTime();
        return d >= yesterday && d < today;
      });
    } else if (dateFilter === "month") {
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
      filtered = sales.filter(s => new Date(s.date).getTime() >= firstDay);
    }

    if (search) {
      filtered = filtered.filter(s => 
        s.id.toLowerCase().includes(search.toLowerCase()) ||
        customers.find(c => c.id === s.customer_id)?.name.toLowerCase().includes(search.toLowerCase())
      );
    }
    return filtered;
  };

  const filteredSales = getFilteredSales();

  const getRecentItemsSold = () => {
    const items = [];
    // Take last 20 sale items
    const recentSaleIds = sales.slice(0, 10).map(s => s.id);
    const recentItems = saleItems.filter(si => recentSaleIds.includes(si.sale_id));
    
    return recentItems.map(si => {
      const v = variants.find(v => v.id === si.variant_id);
      const p = products.find(p => p.id === v?.product_id);
      const s = sales.find(s => s.id === si.sale_id);
      return {
        ...si,
        productName: p?.name || "Unknown",
        size: v?.size || "N/A",
        unit: v?.unit || "pcs",
        date: s?.date || ""
      };
    });
  };

  const recentItemsSold = getRecentItemsSold();

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-20">
      <div className="flex flex-col sm:flex-row gap-6 justify-between sm:items-end">
        <div>
          <h2 className="text-4xl font-black tracking-tight text-zinc-900 flex items-center gap-3">
             <HistoryIcon className="h-10 w-10 text-blue-600" /> Sales Archive
          </h2>
          <p className="text-zinc-500 mt-1 text-lg font-medium leading-tight">View past transactions, filter by date, and track performance.</p>
        </div>
        <div className="flex gap-2 p-1 bg-zinc-100 rounded-2xl shrink-0 h-14 items-center px-2 shadow-inner">
          <Button variant="ghost" onClick={() => setDateFilter("all")} className={cn("rounded-xl h-10 px-4 font-black text-[10px] uppercase tracking-widest", dateFilter === 'all' ? "bg-white shadow-sm text-zinc-900" : "text-zinc-400")}>All Time</Button>
          <Button variant="ghost" onClick={() => setDateFilter("today")} className={cn("rounded-xl h-10 px-4 font-black text-[10px] uppercase tracking-widest", dateFilter === 'today' ? "bg-white shadow-sm text-zinc-900" : "text-zinc-400")}>Today</Button>
          <Button variant="ghost" onClick={() => setDateFilter("yesterday")} className={cn("rounded-xl h-10 px-4 font-black text-[10px] uppercase tracking-widest", dateFilter === 'yesterday' ? "bg-white shadow-sm text-zinc-900" : "text-zinc-400")}>Yesterday</Button>
          <Button variant="ghost" onClick={() => setDateFilter("month")} className={cn("rounded-xl h-10 px-4 font-black text-[10px] uppercase tracking-widest", dateFilter === 'month' ? "bg-white shadow-sm text-zinc-900" : "text-zinc-400")}>This Month</Button>
        </div>
      </div>

      <Tabs defaultValue="sales" className="w-full">
        <TabsList className="bg-transparent border-b border-zinc-100 w-full justify-start rounded-none h-auto p-0 gap-8">
          <TabsTrigger value="sales" className="border-b-2 border-transparent data-[state=active]:border-blue-600 data-[state=active]:bg-transparent rounded-none px-0 pb-4 font-black text-xs uppercase tracking-widest text-zinc-400 data-[state=active]:text-zinc-900">
            All Transactions
          </TabsTrigger>
          <TabsTrigger value="items" className="border-b-2 border-transparent data-[state=active]:border-blue-600 data-[state=active]:bg-transparent rounded-none px-0 pb-4 font-black text-xs uppercase tracking-widest text-zinc-400 data-[state=active]:text-zinc-900">
            Recently Sold Items
          </TabsTrigger>
        </TabsList>

        <TabsContent value="sales" className="pt-8 space-y-6">
          <div className="relative">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5 text-zinc-400" />
            <Input 
              placeholder="Search by Bill ID or Customer name..." 
              className="pl-14 h-16 text-lg bg-white border-zinc-100 shadow-2xl rounded-2xl"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <Card className="border-none shadow-2xl bg-white/70 backdrop-blur-3xl rounded-[2.5rem] overflow-hidden">
            <CardContent className="p-0">
              <Table>
                <TableHeader className="bg-zinc-50/50 border-none">
                  <TableRow className="border-none h-16">
                    <TableHead className="pl-8 font-black uppercase text-[10px] tracking-widest text-zinc-400">Bill ID</TableHead>
                    <TableHead className="font-black uppercase text-[10px] tracking-widest text-zinc-400">Date & Time</TableHead>
                    <TableHead className="font-black uppercase text-[10px] tracking-widest text-zinc-400">Customer</TableHead>
                    <TableHead className="text-center font-black uppercase text-[10px] tracking-widest text-zinc-400">Method</TableHead>
                    <TableHead className="text-right pr-8 font-black uppercase text-[10px] tracking-widest text-zinc-400">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSales.map((sale) => {
                    const customer = customers.find(c => c.id === sale.customer_id);
                    return (
                      <TableRow key={sale.id} className="hover:bg-zinc-50 border-none transition-all cursor-pointer group">
                        <TableCell className="pl-8 py-6 font-black text-zinc-900 uppercase italic tracking-tighter">#{sale.id.slice(0,8)}</TableCell>
                        <TableCell className="py-6">
                           <div className="font-bold text-zinc-900 text-sm">
                             {new Date(sale.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                           </div>
                           <div className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mt-1">
                             {new Date(sale.date).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                           </div>
                        </TableCell>
                        <TableCell className="py-6">
                           <div className="flex items-center gap-2">
                             <User className="h-4 w-4 text-zinc-300" />
                             <span className="font-black text-zinc-900 uppercase text-sm tracking-tight">{customer?.name || "Walk-in"}</span>
                           </div>
                        </TableCell>
                        <TableCell className="py-6 text-center">
                          <Badge className={cn(
                            "font-black px-3 py-1 text-[9px] uppercase tracking-widest rounded-lg shadow-none",
                            sale.payment_method === 'cash' ? "bg-emerald-50 text-emerald-600" : 
                            sale.payment_method === 'upi' ? "bg-purple-50 text-purple-600" : "bg-blue-50 text-blue-600"
                          )}>
                            {sale.payment_method}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right pr-8 py-6">
                           <span className="font-black text-zinc-900 text-2xl tracking-tighter">₹{sale.total_amount.toLocaleString()}</span>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {filteredSales.length === 0 && (
                    <TableRow><TableCell colSpan={5} className="py-20 text-center text-zinc-400 font-black uppercase tracking-widest text-xs">No records found for this period</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="items" className="pt-8">
           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {recentItemsSold.map((item, idx) => (
                <Card key={idx} className="border-none shadow-xl bg-white/70 backdrop-blur-3xl rounded-3xl overflow-hidden hover:shadow-2xl transition-all">
                  <CardContent className="p-6 flex items-center gap-4">
                    <div className="h-16 w-16 rounded-2xl bg-zinc-100 flex items-center justify-center shrink-0 shadow-inner">
                      <Package className="h-8 w-8 text-zinc-300" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-black text-zinc-900 truncate uppercase tracking-tight">{item.productName}</h4>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">{item.size}</span>
                        <span className="h-1 w-1 rounded-full bg-zinc-300" />
                        <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest">SOLD {item.quantity} {item.unit?.toUpperCase()}</span>
                      </div>
                      <div className="flex items-center gap-2 mt-2 text-[9px] font-bold text-zinc-400 uppercase">
                        <Clock className="h-3 w-3" /> {new Date(item.date).toLocaleDateString()}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
              {recentItemsSold.length === 0 && (
                <div className="col-span-full py-20 text-center text-zinc-400 font-black uppercase tracking-widest text-xs italic">No items sold recently</div>
              )}
           </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
