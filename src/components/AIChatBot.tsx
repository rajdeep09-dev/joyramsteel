"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageSquare, Send, X, Camera, Paperclip, Sparkles, Loader2, Package, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { db } from "@/lib/db";
import { v4 as uuidv4 } from "uuid";
import imageCompression from "browser-image-compression";

interface Message {
  id: string;
  role: "user" | "ai";
  content: string;
  images?: string[];
}

export function AIChatBot() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "ai",
      content: "Hello Suraj! I am your Autonomous AI Inventory Assistant. Snap a photo of a new utensil or a GST bill, and I'll update your stock instantly."
    }
  ]);
  const [input, setInput] = useState("");
  const [images, setImages] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
    }
  }, [messages, isOpen]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    for (const file of files) {
      try {
        const options = { maxSizeMB: 0.1, maxWidthOrHeight: 800, useWebWorker: true };
        const compressed = await imageCompression(file, options);
        const reader = new FileReader();
        reader.onloadend = () => {
          setImages(prev => [...prev, reader.result as string]);
        };
        reader.readAsDataURL(compressed);
      } catch (err) {
        console.error("AI Image compression failed:", err);
      }
    }
  };

  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleSend = async () => {
    if (!input.trim() && images.length === 0) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input,
      images: [...images]
    };

    setMessages(prev => [...prev, userMessage]);
    const currentInput = input;
    const currentImages = [...images];
    
    setInput("");
    setImages([]);
    setIsLoading(true);

    try {
      const response = await fetch("/api/ai-inventory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: currentInput, images: currentImages })
      });

      if (!response.ok) {
        const errorText = await response.text();
        let errorMessage = "Failed to process request";
        try {
          const errorData = JSON.parse(errorText);
          errorMessage = errorData.error || errorMessage;
        } catch (e) {}
        throw new Error(errorMessage);
      }

      const data = await response.json();

      // Sync AI data with local Dexie DB so the UI updates instantly
      if (data.data) {
        const { productName, category, quantity, mrp, msp, imageUrl } = data.data;
        const now = new Date().toISOString();
        
        // 1. Check if product exists locally
        let existingProd = await db.products.where('name').equals(productName).first();
        let prodId = existingProd?.id;

        if (!existingProd) {
          prodId = uuidv4();
          await db.products.add({
            id: prodId,
            name: productName,
            category: category || "General",
            created_at: now,
            updated_at: now,
            is_deleted: 0
          });
        }

        // 2. Update variant stock
        if (prodId) {
          let variant = await db.variants.where('product_id').equals(prodId).first();
          if (variant) {
            await db.variants.update(variant.id, { 
              stock: variant.stock + quantity,
              base_price: mrp || variant.base_price,
              msp: msp || variant.msp,
              updated_at: now
            });
          } else {
            await db.variants.add({
              id: uuidv4(),
              product_id: prodId,
              size: "Standard",
              unit: "pcs",
              stock: quantity,
              dented_stock: 0,
              cost_price: msp || 0,
              base_price: mrp || 0,
              msp: msp || 0,
              created_at: now,
              updated_at: now,
              is_deleted: 0
            });
          }
        }
      }

      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: "ai",
        content: data.message
      }]);
      
      toast.success("Inventory Updated via AI!");

    } catch (error: any) {
      toast.error(error.message || "Failed to process request");
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: "ai",
        content: "Sorry, I had trouble processing that. Could you try a clearer photo?"
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {/* Floating Action Button */}
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-24 right-6 z-50 h-16 w-16 rounded-full bg-zinc-900 text-white shadow-[0_20px_50px_rgba(0,0,0,0.3)] flex items-center justify-center border border-white/10 backdrop-blur-xl group"
      >
        <AnimatePresence mode="wait">
          {isOpen ? (
            <motion.div key="close" initial={{ opacity: 0, rotate: -90 }} animate={{ opacity: 1, rotate: 0 }} exit={{ opacity: 0, rotate: 90 }}>
              <X className="h-6 w-6" />
            </motion.div>
          ) : (
            <motion.div key="open" initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.5 }} className="flex flex-col items-center">
              <Sparkles className="h-6 w-6 text-blue-400 group-hover:text-blue-300 transition-colors" />
              <span className="text-[8px] font-black mt-1 uppercase tracking-widest">AI</span>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.button>

      {/* Chat Window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 100, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 100, scale: 0.9 }}
            className="fixed bottom-44 right-6 z-50 w-[90vw] md:w-[400px] h-[550px] bg-white/80 backdrop-blur-2xl rounded-[2.5rem] shadow-[0_40px_100px_-20px_rgba(0,0,0,0.2)] border border-white flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="p-6 border-b border-zinc-100 flex items-center justify-between bg-zinc-900 text-white">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-2xl bg-blue-500 flex items-center justify-center shadow-lg shadow-blue-500/30">
                  <Package className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h3 className="font-black text-sm tracking-widest uppercase">Inventory AI</h3>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Active</span>
                  </div>
                </div>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setIsOpen(false)} className="text-zinc-400 hover:text-white rounded-xl">
                <X className="h-5 w-5" />
              </Button>
            </div>

            {/* Messages */}
            <ScrollArea ref={scrollRef} className="flex-1 p-6 space-y-6">
              {messages.map((m) => (
                <div key={m.id} className={cn("flex flex-col max-w-[85%]", m.role === "user" ? "ml-auto items-end" : "items-start")}>
                  <div className={cn(
                    "p-4 rounded-[1.5rem] text-sm font-medium leading-relaxed shadow-sm",
                    m.role === "user" ? "bg-zinc-900 text-white rounded-tr-none" : "bg-white text-zinc-800 rounded-tl-none border border-zinc-100"
                  )}>
                    {m.content}
                    {m.images && m.images.length > 0 && (
                      <div className="grid grid-cols-2 gap-2 mt-3">
                        {m.images.map((img, i) => (
                          <img key={i} src={img} className="rounded-xl w-full h-24 object-cover border border-white/20 shadow-sm" alt="upload" />
                        ))}
                      </div>
                    )}
                  </div>
                  <span className="text-[9px] font-black text-zinc-400 uppercase tracking-widest mt-1.5 mx-2">
                    {m.role === "ai" ? "Gemini 1.5 Flash" : "Suraj"}
                  </span>
                </div>
              ))}
              {isLoading && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex flex-col items-start max-w-[85%]"
                >
                  <div className="bg-white/50 backdrop-blur-xl border border-zinc-100 p-5 rounded-[2rem] rounded-tl-none flex flex-col gap-3 shadow-xl shadow-zinc-200/50">
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <div className="absolute inset-0 bg-blue-500/20 rounded-full animate-ping" />
                        <Sparkles className="h-5 w-5 text-blue-500 relative z-10" />
                      </div>
                      <span className="text-[10px] font-black text-zinc-900 uppercase tracking-[0.2em] animate-pulse">
                        Gemini 1.5 is Thinking...
                      </span>
                    </div>
                    <div className="flex gap-1.5 px-1">
                      <motion.div animate={{ scale: [1, 1.5, 1] }} transition={{ repeat: Infinity, duration: 1, delay: 0 }} className="h-1.5 w-1.5 rounded-full bg-zinc-300" />
                      <motion.div animate={{ scale: [1, 1.5, 1] }} transition={{ repeat: Infinity, duration: 1, delay: 0.2 }} className="h-1.5 w-1.5 rounded-full bg-zinc-400" />
                      <motion.div animate={{ scale: [1, 1.5, 1] }} transition={{ repeat: Infinity, duration: 1, delay: 0.4 }} className="h-1.5 w-1.5 rounded-full bg-zinc-500" />
                    </div>
                  </div>
                </motion.div>
              )}
            </ScrollArea>

            {/* Input Area */}
            <div className="p-6 bg-zinc-50/50 border-t border-zinc-100">
              {images.length > 0 && (
                <div className="flex gap-2 overflow-x-auto pb-4 scrollbar-hide">
                  {images.map((img, i) => (
                    <div key={i} className="relative shrink-0 group">
                      <img src={img} className="h-16 w-16 rounded-2xl object-cover border-2 border-white shadow-xl" alt="preview" />
                      <button onClick={() => removeImage(i)} className="absolute -top-1.5 -right-1.5 h-5 w-5 bg-red-500 text-white rounded-full flex items-center justify-center shadow-lg opacity-0 group-hover:opacity-100 transition-opacity">
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                  <button onClick={() => fileInputRef.current?.click()} className="h-16 w-16 rounded-2xl border-2 border-dashed border-zinc-200 bg-white flex items-center justify-center text-zinc-400 hover:text-blue-500 hover:border-blue-200 transition-all">
                    <Plus className="h-5 w-5" />
                  </button>
                </div>
              )}
              
              <div className="relative flex items-center gap-2">
                <input type="file" multiple accept="image/*" className="hidden" ref={fileInputRef} onChange={handleImageUpload} />
                <Button variant="ghost" size="icon" onClick={() => fileInputRef.current?.click()} className="h-12 w-12 rounded-2xl bg-white border border-zinc-100 shadow-sm text-zinc-400 hover:text-zinc-600 shrink-0">
                  <Camera className="h-5 w-5" />
                </Button>
                <div className="relative flex-1">
                  <Input
                    placeholder="Ask me anything..."
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSend()}
                    className="h-12 pr-12 rounded-2xl border-zinc-100 bg-white shadow-inner font-medium text-sm focus-visible:ring-zinc-900"
                  />
                  <Button onClick={handleSend} size="icon" className="absolute right-1 top-1 h-10 w-10 rounded-xl bg-zinc-900 text-white hover:bg-zinc-800 transition-all active:scale-90">
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
