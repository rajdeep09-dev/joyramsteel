"use client";

import { useState } from "react";
import { 
  History as HistoryIcon, Search, Calendar, Filter, 
  ArrowRight, Download, Package, User, CreditCard,
  IndianRupee, TrendingUp, ChevronRight, Clock, FileText, 
  Trash2, Eye
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
import { GstInvoiceModal } from "@/components/GstInvoiceModal";
import { EWayBillModal } from "@/components/EWayBillModal";
import { toast } from "sonner";

export default function SalesHistory() {
  const [search, setSearch] = useState("");
  const [dateFilter, setDateFilter] = useState("all");

  const [isGstOpen, setIsGstOpen] = useState(false);
  const [isEWayOpen, setIsEWayOpen] = useState(false);
  const [viewData, setViewData] = useState<any>(null);

  // Use toArray() and then sort manually for reverse chronological ISO dates
  const sales = useLiveQuery(async () => {
    const items = await db.sales.where('is_deleted').equals(0).toArray();
    return items.sort((a, b) => b.date.localeCompare(a.date));
  }, []) || [];

  const saleItems = useLiveQuery(() => db.sale_items.where('is_deleted').equals(0).toArray(), []) || [];
  const variants = useLiveQuery(() => db.variants.where('is_deleted').equals(0).toArray(), []) || [];
  const products = useLiveQuery(() => db.products.where('is_deleted').equals(0).toArray(), []) || [];
  const customers = useLiveQuery(() => db.customers.where('is_deleted').equals(0).toArray(), []) || [];
  
  const digitalBills = useLiveQuery(async () => {
    const items = await db.digital_bills.where('is_deleted').equals(0).toArray();
    return items.sort((a, b) => b.date.localeCompare(a.date));
  }, []) || [];

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

  const handleViewBill = (bill: any) => {
    try {
      const data = JSON.parse(bill.data);
      setViewData(data);
      if (bill.type === 'gst') setIsGstOpen(true);
      else setIsEWayOpen(true);
    } catch {
      toast.error("Corrupted bill data");
    }
  };

  const handleDeleteDigitalBill = async (id: string) => {
    if (!confirm("Remove this bill from history?")) return;
    await db.digital_bills.update(id, { is_deleted: 1, updated_at: new Date().toISOString(), sync_status: 'pending' });
    toast.success("Bill removed from archive");
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-32 px-4 md:px-0">
      <GstInvoiceModal isOpen={isGstOpen} onClose={()=>setIsGstOpen(false)} viewOnlyData={viewData} />
      <EWayBillModal isOpen={isEWayOpen} onClose={()=>setIsEWayOpen(false)} viewOnlyData={viewData} />

      <div className="flex flex-col md:flex-row gap-6 justify-between md:items-end">
        <div className="text-left">
          <h2 className="text-4xl font-black tracking-tight text-zinc-900 flex items-center gap-3">
             <HistoryIcon className="h-10 w-10 text-blue-600" /> Archives
          </h2>
          <p className="text-zinc-500 mt-1 text-lg font-medium leading-tight">Sync-enabled digital record keeping.</p>
        </div>
        <div className="flex overflow-x-auto gap-2 p-1 bg-zinc-100 rounded-2xl shrink-0 h-14 items-center px-2 shadow-inner scrollbar-hide">
          <Button variant="ghost" onClick={() => setDateFilter("all")} className={cn("rounded-xl h-10 px-4 font-black text-[10px] uppercase tracking-widest shrink-0", dateFilter === 'all' ? "bg-white shadow-sm text-zinc-900" : "text-zinc-400")}>All Time</Button>
          <Button variant="ghost" onClick={() => setDateFilter("today")} className={cn("rounded-xl h-10 px-4 font-black text-[10px] uppercase tracking-widest shrink-0", dateFilter === 'today' ? "bg-white shadow-sm text-zinc-900" : "text-zinc-400")}>Today</Button>
          <Button variant="ghost" onClick={() => setDateFilter("yesterday")} className={cn("rounded-xl h-10 px-4 font-black text-[10px] uppercase tracking-widest shrink-0", dateFilter === 'yesterday' ? "bg-white shadow-sm text-zinc-900" : "text-zinc-400")}>Yesterday</Button>
          <Button variant="ghost" onClick={() => setDateFilter("month")} className={cn("rounded-xl h-10 px-4 font-black text-[10px] uppercase tracking-widest shrink-0", dateFilter === 'month' ? "bg-white shadow-sm text-zinc-900" : "text-zinc-400")}>This Month</Button>
        </div>
      </div>

      <Tabs defaultValue="sales" className="w-full">
        <TabsList className="bg-transparent border-b border-zinc-100 w-full justify-start rounded-none h-auto p-0 gap-8 overflow-x-auto scrollbar-hide">
          <TabsTrigger value="sales" className="border-b-2 border-transparent data-[state=active]:border-blue-600 data-[state=active]:bg-transparent rounded-none px-0 pb-4 font-black text-[10px] uppercase tracking-widest text-zinc-400 data-[state=active]:text-zinc-900 shrink-0">
            Sales Records
          </TabsTrigger>
          <TabsTrigger value="bills" className="border-b-2 border-transparent data-[state=active]:border-blue-600 data-[state=active]:bg-transparent rounded-none px-0 pb-4 font-black text-[10px] uppercase tracking-widest text-zinc-400 data-[state=active]:text-zinc-900 shrink-0">
            Generated GST/eWay
          </TabsTrigger>
        </TabsList>

        <TabsContent value="sales" className="pt-8 space-y-6">
          <div className="relative">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5 text-zinc-400" />
            <Input placeholder="Search transactions..." className="pl-14 h-16 text-lg bg-white border-zinc-100 shadow-2xl rounded-2xl" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>

          <Card className="border-none shadow-2xl bg-white/70 backdrop-blur-3xl rounded-[2.5rem] overflow-hidden">
            <CardContent className="p-0">
              <ScrollArea className="w-full">
                <Table>
                  <TableHeader className="bg-zinc-50/50 border-none">
                    <TableRow className="border-none h-16">
                      <TableHead className="pl-8 font-black uppercase text-[10px] tracking-widest text-zinc-400 text-left">Bill ID</TableHead>
                      <TableHead className="font-black uppercase text-[10px] tracking-widest text-zinc-400 text-left">Date & Time</TableHead>
                      <TableHead className="font-black uppercase text-[10px] tracking-widest text-zinc-400 text-left">Customer</TableHead>
                      <TableHead className="text-center font-black uppercase text-[10px] tracking-widest text-zinc-400">Method</TableHead>
                      <TableHead className="text-right pr-8 font-black uppercase text-[10px] tracking-widest text-zinc-400">Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredSales.map((sale) => {
                      const customer = customers.find(c => c.id === sale.customer_id);
                      return (
                        <TableRow key={sale.id} className="hover:bg-zinc-50 border-none transition-all cursor-pointer group text-left">
                          <TableCell className="pl-8 py-6 font-black text-zinc-900 uppercase italic tracking-tighter">#{sale.id.slice(0,8)}</TableCell>
                          <TableCell className="py-6">
                             <div className="font-bold text-zinc-900 text-sm">{new Date(sale.date).toLocaleDateString()}</div>
                             <div className="text-[10px] font-black text-zinc-400 uppercase mt-1">{new Date(sale.date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>
                          </TableCell>
                          <TableCell className="py-6 font-black text-zinc-900 uppercase text-sm">{customer?.name || "Walk-in"}</TableCell>
                          <TableCell className="py-6 text-center">
                            <Badge className="bg-zinc-900 text-white font-black text-[9px] uppercase">{sale.payment_method}</Badge>
                          </TableCell>
                          <TableCell className="text-right pr-8 py-6 font-black text-zinc-900 text-2xl tracking-tighter">₹{sale.total_amount.toLocaleString()}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="bills" className="pt-8 space-y-6">
           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {digitalBills.filter(b => b.customer_name.toLowerCase().includes(search.toLowerCase()) || b.bill_no.toLowerCase().includes(search.toLowerCase())).map(bill => (
                <Card key={bill.id} className="border-none shadow-xl bg-white/70 backdrop-blur-3xl rounded-[2rem] overflow-hidden group hover:shadow-2xl transition-all border border-white">
                  <CardContent className="p-6">
                    <div className="flex justify-between items-start mb-6">
                       <Badge className={cn("font-black px-3 py-1 rounded-lg text-[9px] uppercase tracking-widest", bill.type === 'gst' ? "bg-blue-50 text-blue-700" : "bg-emerald-50 text-emerald-700")}>
                         {bill.type === 'gst' ? "GST Invoice" : "eWay Bill"}
                       </Badge>
                       <span className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">{new Date(bill.date).toLocaleDateString()}</span>
                    </div>
                    <div className="space-y-1 mb-6 text-left">
                       <h4 className="font-black text-zinc-900 text-xl tracking-tight uppercase truncate">{bill.customer_name}</h4>
                       <p className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em]">Bill No: {bill.bill_no || 'N/A'}</p>
                    </div>
                    <div className="flex gap-2">
                       <Button onClick={() => handleViewBill(bill)} className="flex-1 rounded-xl h-12 bg-zinc-900 hover:bg-black text-white font-black text-[10px] uppercase tracking-widest gap-2 shadow-xl">
                         <Eye className="h-4 w-4" /> View / Export
                       </Button>
                       <Button onClick={() => handleDeleteDigitalBill(bill.id)} variant="ghost" size="icon" className="h-12 w-12 rounded-xl text-zinc-300 hover:text-red-500 hover:bg-red-50">
                         <Trash2 className="h-4 w-4" />
                       </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
              {digitalBills.length === 0 && (
                <div className="col-span-full py-20 text-center text-zinc-400 font-black uppercase tracking-widest text-xs italic">No digital bills generated yet</div>
              )}
           </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
