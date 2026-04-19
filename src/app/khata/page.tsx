"use client";

import { useState } from "react";
import { Users, MessageSquare, IndianRupee, Search, Plus, Filter, ArrowUpRight, History, Image as ImageIcon, Camera, Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { v4 as uuidv4 } from "uuid";
import imageCompression from "browser-image-compression";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";

export default function Khata() {
  const [search, setSearch] = useState("");
  const [newName, setNewName] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newBalance, setNewBalance] = useState("");

  const customers = useLiveQuery(() => db.customers.toArray(), []) || [];
  const totalCredit = customers.reduce((acc, curr) => acc + curr.balance, 0);

  const handleAddCustomer = async () => {
    if (!newName || !newPhone) {
      toast.error("Name and Phone are required");
      return;
    }
    const balance = newBalance ? parseInt(newBalance) : 0;
    
    try {
      await db.customers.add({
        id: uuidv4(),
        name: newName,
        phone: newPhone,
        balance,
        last_tx: "Just added",
        status: balance > 0 ? "Overdue" : "Clear"
      });
      toast.success("Customer Added!");
      setNewName(""); setNewPhone(""); setNewBalance("");
    } catch(e) {
      toast.error("Failed to add customer");
    }
  };

  const handleSendReminder = (phone: string, balance: number, name: string) => {
    const text = encodeURIComponent(`Hello ${name}, this is a gentle reminder from Joy Ram Steel. Your pending Khata balance is ₹${balance}. Please settle it at your earliest convenience.`);
    window.open(`https://wa.me/${phone.replace(/[^0-9]/g, '')}?text=${text}`, '_blank');
    toast.success("Opened WhatsApp with reminder message");
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row gap-4 justify-between sm:items-end">
        <div>
          <h2 className="text-3xl font-extrabold tracking-tight text-slate-900">Digital Khata (Ledger)</h2>
          <p className="text-muted-foreground mt-1 text-lg">Manage customer credit, view history, and send WhatsApp reminders.</p>
        </div>
        <Dialog>
          <DialogTrigger render={<Button size="lg" className="bg-amber-600 hover:bg-amber-700 text-white shadow-lg shadow-amber-600/30 rounded-xl h-12 px-6"><Plus className="mr-2 h-5 w-5" /> Add Customer</Button>} />
          <DialogContent className="sm:max-w-[425px] rounded-2xl">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold">Add New Customer</DialogTitle>
              <DialogDescription>Add a new customer to your ledger for Udhar tracking.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name" className="font-bold">Customer Name</Label>
                <Input id="name" value={newName} onChange={e => setNewName(e.target.value)} placeholder="e.g. Ramesh Steel Traders" className="h-12 rounded-xl" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone" className="font-bold">WhatsApp/Phone</Label>
                <Input id="phone" value={newPhone} onChange={e => setNewPhone(e.target.value)} placeholder="e.g. 9876543210" className="h-12 rounded-xl" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="balance" className="font-bold">Initial Pending Balance (₹)</Label>
                <Input id="balance" type="number" value={newBalance} onChange={e => setNewBalance(e.target.value)} placeholder="0" className="h-12 rounded-xl text-red-600 font-bold" />
              </div>
            </div>
            <Button onClick={handleAddCustomer} className="w-full h-14 text-lg rounded-xl shadow-lg bg-amber-600 hover:bg-amber-700 text-white font-bold">
              Save Customer
            </Button>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="border-none shadow-xl bg-gradient-to-br from-amber-500 to-orange-600 text-white md:col-span-1 rounded-2xl relative overflow-hidden">
          <div className="absolute right-0 top-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -mr-10 -mt-10" />
          <CardContent className="p-6 relative z-10">
            <h3 className="font-semibold text-amber-100 flex items-center gap-2 mb-2 text-lg">
              <IndianRupee className="h-5 w-5" /> Total Market Credit
            </h3>
            <div className="text-5xl font-black tracking-tight">₹{totalCredit.toLocaleString()}</div>
            <div className="mt-4 flex items-center justify-between">
              <p className="text-sm font-medium text-amber-100 bg-amber-900/20 px-3 py-1 rounded-lg backdrop-blur-sm">
                Across {customers.length} active customers
              </p>
              <ArrowUpRight className="h-6 w-6 text-amber-200 opacity-50" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
          <Input 
            placeholder="Search customers by name or phone..." 
            className="pl-12 h-14 text-lg bg-white/80 backdrop-blur-xl border-slate-200 shadow-sm rounded-xl"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="grid gap-4">
        {customers.filter(c => c.name.toLowerCase().includes(search.toLowerCase()) || c.phone.includes(search)).map((customer) => (
          <CustomerRow key={customer.id} customer={customer} onSendReminder={handleSendReminder} />
        ))}
      </div>
    </div>
  );
}

function CustomerRow({ customer, onSendReminder }: { customer: any, onSendReminder: any }) {
  const [isSettleOpen, setIsSettleOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);

  const [settleAmount, setSettleAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [notes, setNotes] = useState("");
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const transactions = useLiveQuery(() => 
    db.khata_transactions.where('customer_id').equals(customer.id).reverse().sortBy('date'),
    [customer.id]
  ) || [];

  const handleSettleSubmit = async () => {
    const amount = parseInt(settleAmount);
    if (isNaN(amount) || amount <= 0) {
      toast.error("Enter a valid amount");
      return;
    }

    setIsUploading(true);
    let proofImageUrl = "";

    try {
      if (proofFile) {
        const compressedFile = await imageCompression(proofFile, {
          maxSizeMB: 0.5,
          maxWidthOrHeight: 1200,
          useWebWorker: true,
        });

        const fileName = `${uuidv4()}-${compressedFile.name}`;
        const { error: uploadError } = await supabase.storage
          .from('product-images')
          .upload(`khata-proofs/${fileName}`, compressedFile);

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
          .from('product-images')
          .getPublicUrl(`khata-proofs/${fileName}`);
        
        proofImageUrl = urlData.publicUrl;
      }

      const txId = uuidv4();
      await db.transaction('rw', db.customers, db.khata_transactions, async () => {
        await db.khata_transactions.add({
          id: txId,
          customer_id: customer.id,
          amount: amount,
          type: 'payment_received',
          payment_method: paymentMethod as any,
          date: new Date().toISOString(),
          proof_image_url: proofImageUrl,
          notes: notes,
          sync_status: 'pending'
        });

        const newBalance = Math.max(0, customer.balance - amount);
        await db.customers.update(customer.id, {
          balance: newBalance,
          status: newBalance === 0 ? "Clear" : "Overdue",
          last_tx: "Just now"
        });
      });

      toast.success(`Settled ₹${amount} successfully!`);
      setIsSettleOpen(false);
      // Reset form
      setSettleAmount("");
      setNotes("");
      setProofFile(null);
      setPaymentMethod("cash");

    } catch (e: any) {
      console.error(e);
      toast.error("Failed to settle payment");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Card className="border-none shadow-md bg-white/80 backdrop-blur-xl hover:shadow-xl transition-all rounded-2xl group">
      <CardContent className="p-5 flex flex-col md:flex-row gap-6 justify-between md:items-center">
        
        <div className="flex items-center gap-5">
          <Avatar className="h-16 w-16 rounded-2xl bg-amber-100 text-amber-700 shadow-sm border border-amber-200">
            <AvatarFallback className="text-2xl font-black rounded-2xl bg-amber-100">{customer.name.charAt(0)}</AvatarFallback>
          </Avatar>
          <div>
            <h3 className="font-extrabold text-xl text-slate-900 group-hover:text-blue-700 transition-colors">{customer.name}</h3>
            <div className="flex items-center gap-3 text-sm font-medium text-slate-500 mt-1">
              <span className="bg-slate-100 px-2 py-0.5 rounded-md">{customer.phone}</span>
              <span className="w-1.5 h-1.5 rounded-full bg-slate-300" />
              <span>Last TX: {customer.last_tx}</span>
            </div>
          </div>
        </div>
        
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between md:justify-end gap-6 md:w-auto w-full pt-4 md:pt-0 border-t md:border-t-0 border-slate-100">
          <div className="text-left sm:text-right">
            <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Pending Balance</div>
            <div className="text-2xl font-black text-red-600">₹{customer.balance.toLocaleString()}</div>
            {customer.status === "Overdue" && customer.balance > 0 && (
              <span className="text-[10px] font-bold text-red-500 bg-red-50 px-2 py-0.5 rounded mt-1 inline-block">7+ Days Overdue</span>
            )}
            {customer.balance === 0 && (
              <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded mt-1 inline-block">Settled</span>
            )}
          </div>
          
          <div className="flex gap-2 flex-wrap w-full sm:w-auto justify-end">
            
            {/* History Modal */}
            <Dialog open={isHistoryOpen} onOpenChange={setIsHistoryOpen}>
              <DialogTrigger render={<Button variant="outline" size="icon" className="h-12 w-12 rounded-xl border-slate-200 text-slate-700 hover:bg-slate-50"><History className="h-5 w-5" /></Button>} />
              <DialogContent className="sm:max-w-[500px] rounded-3xl max-h-[85vh] flex flex-col p-0 overflow-hidden">
                <DialogHeader className="p-6 pb-4 bg-zinc-50 border-b border-zinc-100">
                  <DialogTitle className="text-2xl font-black text-zinc-900 tracking-tight">Payment History</DialogTitle>
                  <DialogDescription className="text-zinc-500 font-medium">Ledger records for {customer.name}</DialogDescription>
                </DialogHeader>
                <ScrollArea className="flex-1 p-6">
                  {transactions.length === 0 ? (
                    <div className="text-center py-12 text-zinc-400 font-bold uppercase tracking-widest text-xs">No transactions recorded yet.</div>
                  ) : (
                    <div className="space-y-6">
                      {transactions.map(tx => (
                        <div key={tx.id} className="flex gap-4 items-start pb-6 border-b border-zinc-100 last:border-0">
                          <div className={`p-3 rounded-2xl ${tx.type === 'payment_received' ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
                            {tx.type === 'payment_received' ? <ArrowUpRight className="h-5 w-5" /> : <IndianRupee className="h-5 w-5" />}
                          </div>
                          <div className="flex-1">
                            <div className="flex justify-between items-start">
                              <h4 className="font-black text-zinc-900 tracking-tight text-lg">
                                {tx.type === 'payment_received' ? 'Payment Received' : 'Credit Given'}
                              </h4>
                              <span className={`font-black text-lg ${tx.type === 'payment_received' ? 'text-emerald-600' : 'text-red-600'}`}>
                                {tx.type === 'payment_received' ? '+' : '-'}₹{tx.amount.toLocaleString()}
                              </span>
                            </div>
                            <div className="flex gap-2 items-center mt-1 mb-2">
                              <Badge variant="outline" className="text-[10px] uppercase font-black tracking-widest text-zinc-500 border-zinc-200 bg-white shadow-none">
                                {tx.payment_method}
                              </Badge>
                              <span className="text-xs font-bold text-zinc-400">
                                {new Date(tx.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                            {tx.notes && <p className="text-sm text-zinc-600 mb-3 bg-zinc-50 p-2 rounded-lg italic">"{tx.notes}"</p>}
                            {tx.proof_image_url && (
                              <a href={tx.proof_image_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-widest text-blue-600 hover:text-blue-800 bg-blue-50 px-3 py-1.5 rounded-lg transition-colors">
                                <ImageIcon className="h-4 w-4" /> View Proof
                              </a>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </DialogContent>
            </Dialog>

            {/* Settle Modal */}
            <Dialog open={isSettleOpen} onOpenChange={setIsSettleOpen}>
              <DialogTrigger render={<Button variant="outline" className="h-12 px-6 rounded-xl border-slate-200 text-slate-700 font-bold hover:bg-slate-50" disabled={customer.balance === 0}>Receive Payment</Button>} />
              <DialogContent className="sm:max-w-[425px] rounded-3xl p-6 bg-white/95 backdrop-blur-3xl shadow-2xl border-zinc-100">
                <DialogHeader className="mb-4">
                  <DialogTitle className="text-2xl font-black text-zinc-900 tracking-tight">Record Payment</DialogTitle>
                  <DialogDescription className="font-medium text-zinc-500">Log a payment received from {customer.name}.</DialogDescription>
                </DialogHeader>
                
                <div className="space-y-5">
                  <div className="space-y-2">
                    <Label className="text-xs font-black uppercase tracking-widest text-zinc-400">Amount Received (₹)</Label>
                    <Input 
                      type="number" 
                      value={settleAmount} 
                      onChange={e => setSettleAmount(e.target.value)} 
                      placeholder="e.g. 5000" 
                      className="h-14 rounded-2xl text-xl font-black shadow-inner border-zinc-200" 
                      max={customer.balance}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs font-black uppercase tracking-widest text-zinc-400">Payment Method</Label>
                    <Select value={paymentMethod} onValueChange={(val) => setPaymentMethod(val || "cash")}>
                      <SelectTrigger className="h-14 rounded-2xl font-bold border-zinc-200 shadow-inner">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="rounded-2xl border-zinc-100 shadow-xl font-bold">
                        <SelectItem value="cash">Cash 💵</SelectItem>
                        <SelectItem value="upi">UPI / QR Code 📱</SelectItem>
                        <SelectItem value="bank_transfer">Bank Transfer 🏦</SelectItem>
                        <SelectItem value="other">Other / Cheque 📝</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs font-black uppercase tracking-widest text-zinc-400">Proof of Payment (Optional)</Label>
                    <div className="flex items-center gap-4">
                      <Button 
                        variant="outline" 
                        className="h-14 flex-1 rounded-2xl border-dashed border-2 border-zinc-200 hover:bg-zinc-50 hover:border-zinc-300 transition-colors relative font-bold text-zinc-600"
                      >
                        <input 
                          type="file" 
                          accept="image/*" 
                          className="absolute inset-0 opacity-0 cursor-pointer" 
                          onChange={(e) => setProofFile(e.target.files?.[0] || null)}
                        />
                        <Camera className="h-5 w-5 mr-2 text-zinc-400" />
                        {proofFile ? "Change Image" : "Upload Receipt"}
                      </Button>
                      {proofFile && (
                        <div className="w-14 h-14 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center relative overflow-hidden group">
                          <img src={URL.createObjectURL(proofFile)} alt="Preview" className="w-full h-full object-cover" />
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs font-black uppercase tracking-widest text-zinc-400">Remarks / UTR No (Optional)</Label>
                    <Input 
                      value={notes} 
                      onChange={e => setNotes(e.target.value)} 
                      placeholder="e.g. Paid via PhonePe" 
                      className="h-14 rounded-2xl font-medium border-zinc-200 shadow-inner" 
                    />
                  </div>

                  <Button 
                    onClick={handleSettleSubmit} 
                    disabled={isUploading || !settleAmount}
                    className="w-full h-14 mt-4 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black tracking-widest uppercase shadow-xl shadow-emerald-600/20 transition-all active:scale-[0.98]"
                  >
                    {isUploading ? <><Loader2 className="h-5 w-5 mr-2 animate-spin" /> Uploading...</> : 'Save Transaction'}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>

            <Button 
              className="h-12 px-6 rounded-xl bg-[#25D366] hover:bg-[#20bd5a] text-white shadow-lg shadow-[#25D366]/30 font-bold"
              onClick={() => onSendReminder(customer.phone, customer.balance, customer.name)}
              disabled={customer.balance === 0}
            >
              <MessageSquare className="h-5 w-5 sm:mr-2" />
              <span className="hidden sm:inline">WhatsApp</span>
            </Button>
          </div>
        </div>

      </CardContent>
    </Card>
  );
}