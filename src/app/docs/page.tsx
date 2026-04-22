"use client";

import { useState } from "react";
import { 
  BookOpen, Search, ChevronRight, Package, ShoppingCart, 
  Users, ShieldCheck, Barcode, FileText, Cloud, Layers, 
  LayoutDashboard, History, Globe, Trash2, Edit2, Plus, 
  Download, Zap, HelpCircle, CheckCircle2, AlertTriangle, 
  Smartphone, Settings, Database, HardDrive, Printer
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

/**
 * Enterprise Admin Manual (/docs)
 * Expanded A-Z Bilingual Guide with Beginner Masterclass
 */
export default function Docs() {
  const [lang, setLang] = useState<'en' | 'bn'>('en');
  const [activeTab, setActiveTab] = useState("beginner");

  const sections = [
    {
      id: "beginner",
      icon: HelpCircle,
      titleEn: "Beginner Masterclass",
      titleBn: "নতুনদের জন্য গাইড",
      contentEn: "Welcome to Joy Ram Steel! Follow these 3 steps: 1) Go to STOCK and add a Master Brand. 2) Add sizes (Variants) to that brand. 3) Open POS to start selling. Tip: Always ensure Cloud Icon in header is GREEN before starting.",
      contentBn: "জয় রাম স্টিল-এ স্বাগতম! এই ৩টি ধাপ অনুসরণ করুন: ১) STOCK-এ যান এবং একটি মাস্টার ব্র্যান্ড যোগ করুন। ২) সেই ব্র্যান্ডে মাপ (ভ্যারিয়েন্ট) যোগ করুন। ৩) বিক্রি শুরু করতে POS খুলুন। পরামর্শ: শুরু করার আগে হেডারে ক্লাউড আইকন সবুজ আছে কিনা নিশ্চিত করুন।"
    },
    { 
      id: "daily", 
      icon: CheckCircle2, 
      titleEn: "Daily Shop Checklist", 
      titleBn: "দৈনন্দিন কাজের তালিকা",
      contentEn: "MORNING: Check Internet sync. Update any price changes. EVENING: Open ARCHIVES to verify total cash/UPI. Click 'Force Sync' in the header to ensure all data is in the cloud before closing the tab.",
      contentBn: "সকাল: ইন্টারনেট সিঙ্ক পরীক্ষা করুন। কোনো দাম পরিবর্তন হলে আপডেট করুন। সন্ধ্যা: মোট ক্যাশ/ইউপিআই যাচাই করতে ARCHIVES খুলুন। ট্যাব বন্ধ করার আগে সমস্ত ডেটা ক্লাউডে আছে কিনা নিশ্চিত করতে হেডারে 'Force Sync' ক্লিক করুন।"
    },
    { 
      id: "pos", 
      icon: ShoppingCart, 
      titleEn: "POS & Smart Checkout", 
      titleBn: "পিওএস এবং স্মার্ট চেকআউট",
      contentEn: "Use Cmd+K to search instantly. Press Alt+P to generate the bill. If a customer is slow, use 'Parking Meter' icon to save the cart and serve the next person. Resume parked carts via the blue badge.",
      contentBn: "তাত্ক্ষণিকভাবে পণ্য খুঁজতে Cmd+K ব্যবহার করুন। বিল তৈরি করতে Alt+P টিপুন। কোনো কাস্টমার দেরি করলে কার্ট সেভ করতে 'পার্কিং মিটার' আইকন ব্যবহার করুন এবং পরের জনকে সার্ভিস দিন। নীল ব্যাজের মাধ্যমে পার্ক করা কার্ট আবার চালু করুন।"
    },
    { 
      id: "stock", 
      icon: Package, 
      titleEn: "Inventory Hierarchy", 
      titleBn: "ইনভেন্টরি হাইয়ারার্কি",
      contentEn: "The system uses a 2-tier logic. MASTER BRAND = Brand Name (e.g., MILTON BUCKET). VARIANT = The actual physical item (e.g., 5 Litre Red). You cannot delete a brand if it still has sizes inside it.",
      contentBn: "সিস্টেমটি ২-স্তরের লজিক ব্যবহার করে। MASTER BRAND = ব্র্যান্ডের নাম (যেমন, মিল্টন বালতি)। VARIANT = আসল পণ্য (যেমন, ৫ লিটার লাল)। কোনো ব্র্যান্ডের ভেতরে সাইজ থাকলে সেটি ডিলিট করা যাবে না।"
    },
    { 
      id: "combo", 
      icon: Layers, 
      titleEn: "Combo Pack Logic", 
      titleBn: "কম্বো প্যাক লজিক",
      contentEn: "When adding a Combo, set 'Units in Pack' (e.g. 4) and 'Bundle Price' (e.g. 100). The GST generator will automatically fill 4 pcs and calculate the per-unit rate to keep the bill legally accurate.",
      contentBn: "কম্বো যোগ করার সময় 'Units in Pack' (যেমন ৪) এবং 'Bundle Price' (যেমন ১০০) সেট করুন। জিএসটি জেনারেটর স্বয়ংক্রিয়ভাবে ৪ পিস পূর্ণ করবে এবং বিলটি আইনিভাবে সঠিক রাখতে প্রতি ইউনিটের দাম হিসাব করবে।"
    },
    { 
      id: "weight", 
      icon: Layers, 
      titleEn: "Precision Weight (KG)", 
      titleBn: "নির্ভুল ওজন (কেজি)",
      contentEn: "For items sold by weight, select KG strategy. The system records up to 3 decimal places (0.001 KG). In the POS, typing '1.250' will correctly calculate price for 1 Kg 250 Grams.",
      contentBn: "ওজন অনুযায়ী বিক্রিত পণ্যের জন্য KG কৌশল বেছে নিন। সিস্টেম ৩ দশমিক স্থান (০.০০১ কেজি) পর্যন্ত রেকর্ড করে। POS-এ '১.২৫০' টাইপ করলে ১ কেজি ২৫০ গ্রামের সঠিক দাম হিসাব হবে।"
    },
    { 
      id: "scan", 
      icon: Barcode, 
      titleEn: "Advanced Multi-Scanning", 
      titleBn: "অ্যাডভান্সড মাল্টি-স্ক্যানিং",
      contentEn: "The system uses the Native Web Barcode API. Upload a photo of your catalog, and the app will find every barcode in that single image. A drawer will pop up letting you choose which ones to add to cart.",
      contentBn: "সিস্টেমটি নেটিভ ওয়েব বারকোড এপিআই ব্যবহার করে। আপনার ক্যাটালগের একটি ছবি আপলোড করুন, এবং অ্যাপটি সেই একটি ছবিতেই প্রতিটি বারকোড খুঁজে বের করবে। একটি ড্রয়ার আসবে যেখানে আপনি বেছে নিতে পারবেন কোনগুলো কার্টে যোগ করবেন।"
    },
    { 
      id: "hardware", 
      icon: Printer, 
      titleEn: "Hardware & Printing", 
      titleBn: "হার্ডওয়্যার এবং প্রিন্টিং",
      contentEn: "LASER: Plug into USB; it works like a keyboard instantly. PRINTING: Generated PDFs are A4 standard. Set your browser print margins to 'None' for perfect alignment. Use PNG export for sharing on WhatsApp.",
      contentBn: "লেজার: ইউএসবি-তে প্লাগ করুন; এটি কিবোর্ডের মতো কাজ করবে। প্রিন্টিং: তৈরি পিডিএফগুলো A4 স্ট্যান্ডার্ড। নিখুঁতভাবে প্রিন্ট করতে ব্রাউজার প্রিন্ট মার্জিন 'None' সেট করুন। হোয়াটসঅ্যাপে শেয়ারের জন্য PNG এক্সপোর্ট ব্যবহার করুন।"
    },
    { 
      id: "gst", 
      icon: FileText, 
      titleEn: "Professional Invoicing", 
      titleBn: "প্রফেশনাল ইনভয়েসিং",
      contentEn: "GST Invoices are stored in the VAULT. You can re-download or re-print any old invoice anytime. The system auto-calculates CGST/SGST at 9% each for a total of 18% GST.",
      contentBn: "জিএসটি ইনভয়েসগুলো VAULT-এ সেভ থাকে। আপনি যেকোনো সময় পুরনো ইনভয়েস আবার ডাউনলোড বা প্রিন্ট করতে পারেন। সিস্টেম অটোমেটিক ৯% হারে CGST/SGST (মোট ১৮%) হিসাব করে।"
    },
    { 
      id: "sync", 
      icon: Database, 
      titleEn: "Cloud & Storage", 
      titleBn: "ক্লাউড এবং স্টোরেজ",
      contentEn: "Images are compressed to <300KB. SMART PURGE: If you delete a product, the cloud image is only deleted if no other product uses it. This saves space while preventing broken links.",
      contentBn: "ছবিগুলো ৩০০ কেবি-র নিচে কম্প্রেস করা হয়। স্মার্ট পার্জ: আপনি কোনো পণ্য ডিলিট করলে ক্লাউড ছবি তখনই ডিলিট হবে যদি অন্য কোনো পণ্য সেটি ব্যবহার না করে। এটি স্টোরেজ বাঁচায় এবং লিঙ্ক নষ্ট হওয়া রোধ করে।"
    }
  ];

  return (
    <div className="min-h-screen bg-white dark:bg-zinc-950 flex flex-col md:flex-row pb-32 md:pb-0">
      {/* Navigation Sidebar */}
      <div className="w-full md:w-[350px] bg-zinc-50 dark:bg-zinc-900 border-r border-zinc-100 dark:border-zinc-800 flex flex-col h-full md:sticky md:top-0">
        <div className="p-8 space-y-6">
           <div className="flex items-center gap-3">
             <div className="p-3 bg-blue-600 rounded-2xl shadow-xl shadow-blue-600/20"><BookOpen className="h-6 w-6 text-white" /></div>
             <div>
               <h1 className="text-2xl font-black italic tracking-tighter uppercase dark:text-white leading-none">Manual</h1>
               <p className="text-[9px] font-black text-zinc-400 uppercase tracking-widest mt-1">A-Z Business University</p>
             </div>
           </div>
           
           <div className="flex bg-white dark:bg-zinc-800 p-1.5 rounded-2xl shadow-inner gap-1 border border-zinc-100 dark:border-zinc-700">
              <button onClick={() => setLang('en')} className={cn("flex-1 h-10 rounded-xl font-black text-[10px] uppercase transition-all", lang === 'en' ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 shadow-lg" : "text-zinc-400")}>English</button>
              <button onClick={() => setLang('bn')} className={cn("flex-1 h-10 rounded-xl font-black text-[10px] uppercase transition-all", lang === 'bn' ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 shadow-lg" : "text-zinc-400")}>বাংলা</button>
           </div>
        </div>

        <ScrollArea className="flex-1 px-4 pb-8">
           <div className="space-y-2">
              {sections.map((s) => (
                <button
                  key={s.id}
                  onClick={() => setActiveTab(s.id)}
                  className={cn(
                    "w-full flex items-center gap-4 p-5 rounded-[1.5rem] transition-all group text-left border-2 border-transparent",
                    activeTab === s.id 
                      ? "bg-white dark:bg-zinc-800 shadow-2xl border-blue-500/10 dark:border-blue-400/10 scale-[1.02]" 
                      : "hover:bg-zinc-100 dark:hover:bg-zinc-800/50"
                  )}
                >
                  <div className={cn("p-2 rounded-xl transition-colors", activeTab === s.id ? "bg-blue-600 text-white" : "bg-zinc-100 dark:bg-zinc-800 text-zinc-400 group-hover:text-zinc-600")}>
                    <s.icon className="h-5 w-5" />
                  </div>
                  <span className={cn("text-xs font-black uppercase tracking-widest", activeTab === s.id ? "text-zinc-900 dark:text-white" : "text-zinc-400 group-hover:text-zinc-600 dark:group-hover:text-zinc-300")}>
                    {lang === 'en' ? s.titleEn : s.titleBn}
                  </span>
                </button>
              ))}
           </div>
        </ScrollArea>
        <div className="p-6 bg-zinc-100/50 dark:bg-zinc-950/50 m-4 rounded-3xl border border-zinc-100 dark:border-zinc-800">
           <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-tighter text-center italic">Property of Joy Ram Steel &bull; V2.0</p>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 p-8 md:p-20 overflow-y-auto bg-white dark:bg-zinc-950">
         <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
              className="max-w-4xl space-y-12 text-left"
            >
               {sections.find(s => s.id === activeTab) && (
                 <>
                   <div className="space-y-6">
                      <div className="inline-flex items-center gap-3 px-6 py-2 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-full font-black uppercase text-[10px] tracking-[0.2em] border border-blue-100 dark:border-blue-900/40">
                         Module {sections.findIndex(s => s.id === activeTab) + 1}
                      </div>
                      <h2 className="text-6xl md:text-7xl font-black italic tracking-tighter uppercase dark:text-white leading-[0.85]">
                        {lang === 'en' ? sections.find(s => s.id === activeTab)!.titleEn : sections.find(s => s.id === activeTab)!.titleBn}
                      </h2>
                   </div>

                   <div className="relative">
                      <div className="absolute -left-6 top-0 bottom-0 w-1.5 bg-blue-600 rounded-full shadow-[0_0_15px_rgba(37,99,235,1)]" />
                      <div className="p-10 md:p-14 bg-zinc-50 dark:bg-zinc-900/50 rounded-[3.5rem] border border-zinc-100 dark:border-zinc-800 shadow-inner">
                        <p className="text-3xl md:text-4xl font-bold dark:text-zinc-200 leading-tight text-zinc-700 tracking-tight">
                          {lang === 'en' ? sections.find(s => s.id === activeTab)!.contentEn : sections.find(s => s.id === activeTab)!.contentBn}
                        </p>
                      </div>
                   </div>

                   <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="p-8 bg-zinc-900 dark:bg-zinc-800 rounded-[2.5rem] space-y-4 shadow-2xl relative overflow-hidden group">
                         <div className="absolute top-0 right-0 w-32 h-32 bg-blue-600/10 rounded-full -mr-16 -mt-16 group-hover:scale-110 transition-transform" />
                         <div className="flex items-center gap-3">
                           <Zap className="h-5 w-5 text-amber-400" />
                           <span className="text-[10px] font-black uppercase text-blue-400 tracking-widest">Pro Technique / উন্নত কৌশল</span>
                         </div>
                         <p className="text-[13px] font-bold text-zinc-300 leading-relaxed italic">
                           {activeTab === 'pos' ? "Master the 'Alt+P' shortcut to clear billing counters in seconds. Fast checkout means happy customers." : "Keep the barcode laser perpendicular to the surface for 100% first-time recognition."}
                         </p>
                      </div>

                      <div className="p-8 border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-[2.5rem] space-y-4">
                         <div className="flex items-center gap-3">
                           <ShieldCheck className="h-5 w-5 text-emerald-500" />
                           <span className="text-[10px] font-black uppercase text-emerald-600 tracking-widest">Security / নিরাপত্তা</span>
                         </div>
                         <p className="text-[13px] font-bold text-zinc-500 dark:text-zinc-400 leading-relaxed italic">
                           Never share your master login. All local data is encrypted but manual cloud-sync ensures zero data loss.
                         </p>
                      </div>
                   </div>

                   {/* Footer Navigation Hints */}
                   <div className="pt-10 flex items-center justify-between border-t border-zinc-100 dark:border-zinc-800">
                      <div className="flex items-center gap-4">
                        <Smartphone className="h-10 w-10 text-zinc-300" />
                        <div>
                          <p className="font-black text-[10px] uppercase text-zinc-400 tracking-widest">Available On</p>
                          <p className="font-bold text-xs dark:text-white uppercase">Mobile &bull; Tablet &bull; Desktop</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="rounded-lg h-10 px-4 font-black uppercase text-[10px] border-zinc-200 dark:border-zinc-800 dark:text-white">Revision 4.0</Badge>
                        <Badge className="bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-lg h-10 px-4 font-black uppercase text-[10px]">Active</Badge>
                      </div>
                   </div>
                 </>
               )}
            </motion.div>
         </AnimatePresence>
      </div>
    </div>
  );
}
