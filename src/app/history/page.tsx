"use client";

import { useState } from "react";
import { 
  History as HistoryIcon, Search, Calendar, Filter, 
  ArrowRight, Download, Package, User, CreditCard,
  IndianRupee, TrendingUp, ChevronRight, Clock, FileText, 
  Trash2, Eye, Edit2, RotateCcw, X, CheckCircle2,
  AlertTriangle
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export default function SalesHistory() {
  const [search, setSearch] = useState("");
  const [dateFilter, setDateFilter] = useState("all");
  const [isGstOpen, setIsGstOpen] = useState(false);
  const [isEWayOpen, setIsEWayOpen] = useState(false);
  const [viewData, setViewData] = useState<any>(null);

  // Edit/Return States
  const [selectedSale, setSelectedSale] = useState<any>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  const sales = useLiveQuery(async () => {
    const items = await db.sales.where('is_deleted').equals(0).toArray();
    return items.sort((a, b) => b.date.localeCompare(a.date));
  }, []) || [];

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

  const handleReturnSale = async (sale: any) => {
    if (!confirm("Are you sure? This will mark the entire bill as RETURNED and restock items.")) return;
    
    try {
      const now = new Date().toISOString();
      await db.transaction('rw', db.sales, db.sale_items, db.variants, async () => {
        // 1. Mark sale as returned
        await db.sales.update(sale.id, { 
          is_returned: 1, 
          return_date: now,
          updated_at: now,
          version_clock: (sale.version_clock || 0) + 1,
          sync_status: 'pending'
        });

        // 2. Restock items
        const items = await db.sale_items.where('sale_id').equals(sale.id).toArray();
        for (const item of items) {
          const variant = await db.variants.get(item.variant_id);
          if (variant) {
            await db.variants.update(item.variant_id, {
              stock: variant.stock + item.quantity,
              updated_at: now,
              version_clock: (variant.version_clock || 0) + 1,
              sync_status: 'pending'
            });
          }
          await db.sale_items.update(item.id, { is_returned: 1, updated_at: now, sync_status: 'pending' });
        }
      });
      toast.success("Inventory restocked and bill marked as returned");
    } catch (e) {
      toast.error("Failed to process return");
    }
  };

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
    <div className="h-[calc(100vh-6rem)] flex flex-col gap-6 max-w-[1600px] mx-auto overflow-hidden px-4 md:px-6">
      <GstInvoiceModal isOpen={isGstOpen} onClose={()=>setIsGstOpen(false)} viewOnlyData={viewData} />
      <EWayBillModal isOpen={isEWayOpen} onClose={()=>setIsEWayOpen(false)} viewOnlyData={viewData} />

      {/* Static Header */}
      <div className="flex flex-col md:flex-row gap-6 justify-between md:items-center shrink-0 py-2">
        <div className="text-left">
          <h2 className="text-4xl font-black tracking-tight text-zinc-900 flex items-center gap-4 italic uppercase">
             <div className="p-3 bg-blue-600 text-white rounded-2xl shadow-xl shadow-blue-600/20"><HistoryIcon className="h-8 w-8" /></div> Archives
          </h2>
          <p className="text-zinc-500 mt-2 text-xs font-black uppercase tracking-[0.2em] opacity-60 pl-1">Sync-enabled enterprise record keeping</p>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="relative group hidden md:block">
             <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400 group-focus-within:text-blue-600 transition-colors" />
             <Input 
                placeholder="Search Archive..." 
                className="pl-11 h-12 w-64 rounded-xl border-zinc-200 bg-white shadow-sm focus:ring-2 focus:ring-blue-500/20"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
             />
          </div>

          <div className="flex gap-1.5 p-1 bg-zinc-100/80 rounded-xl shrink-0 h-12 items-center px-1.5 shadow-inner backdrop-blur-md">
            <Button variant="ghost" onClick={() => setDateFilter("all")} className={cn("rounded-lg h-9 px-4 font-black text-[9px] uppercase tracking-widest", dateFilter === 'all' ? "bg-white shadow-md text-zinc-900" : "text-zinc-400")}>All</Button>
            <Button variant="ghost" onClick={() => setDateFilter("today")} className={cn("rounded-lg h-9 px-4 font-black text-[9px] uppercase tracking-widest", dateFilter === 'today' ? "bg-white shadow-md text-zinc-900" : "text-zinc-400")}>Today</Button>
            <Button variant="ghost" onClick={() => setDateFilter("month")} className={cn("rounded-lg h-9 px-4 font-black text-[9px] uppercase tracking-widest", dateFilter === 'month' ? "bg-white shadow-md text-zinc-900" : "text-zinc-400")}>Month</Button>
          </div>
        </div>
      </div>

      <Tabs defaultValue="sales" className="flex-1 flex flex-col min-h-0">
        <TabsList className="bg-transparent border-b border-zinc-100 w-full justify-start rounded-none h-auto p-0 gap-10 shrink-0">
          <TabsTrigger value="sales" className="border-b-2 border-transparent data-[state=active]:border-blue-600 data-[state=active]:bg-transparent rounded-none px-0 pb-4 font-black text-[10px] uppercase tracking-widest text-zinc-400 data-[state=active]:text-zinc-900 transition-all">
            Sales Records
          </TabsTrigger>
          <TabsTrigger value="bills" className="border-b-2 border-transparent data-[state=active]:border-blue-600 data-[state=active]:bg-transparent rounded-none px-0 pb-4 font-black text-[10px] uppercase tracking-widest text-zinc-400 data-[state=active]:text-zinc-900 transition-all">
            Generated GST/eWay
          </TabsTrigger>
        </TabsList>

        <TabsContent value="sales" className="flex-1 flex flex-col min-h-0 pt-6 m-0 focus-visible:ring-0">
          {/* Mobile Search Overlay */}
          <div className="md:hidden mb-4 relative">
             <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-zinc-400" />
             <Input placeholder="Search..." className="pl-12 h-14 rounded-2xl bg-white" value={search} onChange={e=>setSearch(e.target.value)} />
          </div>

          <Card className="flex-1 border-none shadow-2xl bg-white/70 backdrop-blur-3xl rounded-[2.5rem] flex flex-col overflow-hidden border border-white/40">
            <CardContent className="p-0 flex-1 flex flex-col min-h-0">
              <ScrollArea className="flex-1">
                <Table>
                  <TableHeader className="bg-zinc-50/50 border-none sticky top-0 z-20 backdrop-blur-md">
                    <TableRow className="border-none h-16">
                      <TableHead className="pl-10 font-black uppercase text-[10px] tracking-widest text-zinc-400 text-left">Bill ID</TableHead>
                      <TableHead className="font-black uppercase text-[10px] tracking-widest text-zinc-400 text-left">Timestamp</TableHead>
                      <TableHead className="font-black uppercase text-[10px] tracking-widest text-zinc-400 text-left">Customer</TableHead>
                      <TableHead className="text-center font-black uppercase text-[10px] tracking-widest text-zinc-400">Method</TableHead>
                      <TableHead className="text-right font-black uppercase text-[10px] tracking-widest text-zinc-400">Amount</TableHead>
                      <TableHead className="pr-10 text-right font-black uppercase text-[10px] tracking-widest text-zinc-400">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredSales.map((sale) => {
                      const customer = customers.find(c => c.id === sale.customer_id);
                      return (
                        <TableRow key={sale.id} className={cn("hover:bg-zinc-50/80 border-none transition-all group text-left", sale.is_returned && "opacity-60 bg-red-50/20")}>
                          <TableCell className="pl-10 py-6 font-black text-zinc-900 uppercase italic tracking-tighter">
                            <div className="flex items-center gap-3">
                              #{sale.id.slice(0,8)}
                              {sale.is_returned === 1 && <Badge className="bg-red-500 text-white border-none text-[8px] font-black h-4 px-1.5 uppercase">Returned</Badge>}
                            </div>
                          </TableCell>
                          <TableCell className="py-6">
                             <div className="font-bold text-zinc-900 text-sm">{new Date(sale.date).toLocaleDateString()}</div>
                             <div className="text-[10px] font-black text-zinc-400 uppercase mt-1">{new Date(sale.date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>
                          </TableCell>
                          <TableCell className="py-6 font-black text-zinc-900 uppercase text-sm">{customer?.name || "Walk-in"}</TableCell>
                          <TableCell className="py-6 text-center">
                            <Badge className={cn("text-white font-black text-[9px] uppercase border-none", sale.payment_method === 'cash' ? 'bg-zinc-900' : 'bg-blue-600')}>{sale.payment_method}</Badge>
                          </TableCell>
                          <TableCell className="text-right py-6 font-black text-zinc-900 text-2xl tracking-tighter italic">₹{sale.total_amount.toLocaleString()}</TableCell>
                          <TableCell className="text-right pr-10 py-6">
                             <div className="flex gap-2 justify-end opacity-0 group-hover:opacity-100 transition-all translate-x-4 group-hover:translate-x-0">
                                <Button 
                                  variant="outline" 
                                  size="icon" 
                                  disabled={sale.is_returned === 1}
                                  className="h-10 w-10 rounded-xl border-zinc-100 hover:bg-zinc-900 hover:text-white"
                                  onClick={() => { setSelectedSale(sale); setIsEditModalOpen(true); }}
                                >
                                  <Edit2 className="h-4 w-4" />
                                </Button>
                                <Button 
                                  variant="outline" 
                                  size="icon" 
                                  disabled={sale.is_returned === 1}
                                  className="h-10 w-10 rounded-xl border-zinc-100 hover:bg-red-600 hover:text-white"
                                  onClick={() => handleReturnSale(sale)}
                                >
                                  <RotateCcw className="h-4 w-4" />
                                </Button>
                             </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
                {filteredSales.length === 0 && (
                   <div className="py-40 flex flex-col items-center justify-center text-zinc-300 gap-4">
                      <Search className="h-20 w-20 opacity-20" />
                      <p className="font-black uppercase tracking-widest text-xs italic">No matching records</p>
                   </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="bills" className="flex-1 flex flex-col min-h-0 pt-6 m-0 overflow-y-auto scrollbar-hide pb-10 focus-visible:ring-0">
           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {digitalBills.filter(b => b.customer_name.toLowerCase().includes(search.toLowerCase()) || b.bill_no.toLowerCase().includes(search.toLowerCase())).map(bill => (
                <Card key={bill.id} className="border-none shadow-xl bg-white/70 backdrop-blur-3xl rounded-[2.5rem] overflow-hidden group hover:shadow-2xl transition-all border border-white/40">
                  <CardContent className="p-8">
                    <div className="flex justify-between items-start mb-8">
                       <Badge className={cn("font-black px-4 py-1.5 rounded-xl text-[9px] uppercase tracking-widest border-none shadow-lg", bill.type === 'gst' ? "bg-blue-600 text-white" : "bg-emerald-600 text-white")}>
                         {bill.type === 'gst' ? "GST Invoice" : "eWay Bill"}
                       </Badge>
                       <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">{new Date(bill.date).toLocaleDateString()}</span>
                    </div>
                    <div className="space-y-1 mb-8 text-left">
                       <h4 className="font-black text-zinc-900 text-xl tracking-tight uppercase truncate italic">{bill.customer_name}</h4>
                       <p className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em]">NO: {bill.bill_no || 'N/A'}</p>
                    </div>
                    <div className="flex gap-3">
                       <Button onClick={() => handleViewBill(bill)} className="flex-1 rounded-2xl h-14 bg-zinc-900 hover:bg-black text-white font-black text-[10px] uppercase tracking-widest gap-3 shadow-2xl active:scale-95 transition-all">
                         <Eye className="h-5 w-5" /> View / Export
                       </Button>
                       <Button onClick={() => handleDeleteDigitalBill(bill.id)} variant="ghost" size="icon" className="h-14 w-14 rounded-2xl text-zinc-300 hover:text-red-500 hover:bg-red-50">
                         <Trash2 className="h-5 w-5" />
                       </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
              {digitalBills.length === 0 && (
                <div className="col-span-full py-40 text-center text-zinc-400 font-black uppercase tracking-widest text-xs italic">No digital documents archived</div>
              )}
           </div>
        </TabsContent>
      </Tabs>

      {/* Edit Sale Placeholder Dialog */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="sm:max-w-[425px] rounded-[2.5rem] bg-white border-none shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black italic tracking-tighter uppercase">Edit Transaction</DialogTitle>
          </DialogHeader>
          <div className="py-10 flex flex-col items-center justify-center text-center gap-6">
             <div className="p-8 bg-amber-50 rounded-full"><AlertTriangle className="h-12 w-12 text-amber-600" /></div>
             <p className="font-black uppercase text-[10px] tracking-widest text-zinc-400 max-w-[200px]">Advanced editing is limited to returns for data integrity. Use "Return" to restock inventory.</p>
          </div>
          <Button onClick={()=>setIsEditModalOpen(false)} className="h-14 rounded-2xl bg-zinc-900 font-black tracking-widest uppercase">Understood</Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
