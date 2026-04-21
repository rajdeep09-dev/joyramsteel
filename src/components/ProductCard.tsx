"use client";

import { motion } from "framer-motion";
import { Package } from "lucide-react";
import { cn } from "@/lib/utils";
import { Variant, Product } from "@/lib/db";
import { Badge } from "@/components/ui/badge";

interface ProductCardProps {
  variant: Variant & { productName: string; category: string; parentImage?: string };
  onClick: () => void;
  className?: string;
}

/**
 * Module 2: The Visual Inheritance & Scaling Engine
 * - Fallback logic for images
 * - Relative scaling based on size
 * - Glassmorphic size badge
 */
export function ProductCard({ variant, onClick, className }: ProductCardProps) {
  // Logic: variant image -> parent product image -> placeholder
  const displayImage = variant.image_url || variant.parentImage;

  // Relative Scale Engine
  const getScaleClass = (size: string) => {
    const s = size.toLowerCase();
    if (s.includes("small") || s.includes("mini") || s.includes("5l")) return "scale-90";
    if (s.includes("large") || s.includes("xl") || s.includes("20l")) return "scale-110";
    if (s.includes("medium") || s.includes("10l")) return "scale-100";
    return "scale-100"; // Default
  };

  return (
    <motion.div
      whileHover={{ y: -6, scale: 1.02 }}
      whileTap={{ scale: 0.96 }}
      onClick={onClick}
      className={cn(
        "bg-white border border-zinc-50 rounded-[2.5rem] overflow-hidden shadow-2xl shadow-zinc-200/50 hover:shadow-zinc-300/80 cursor-pointer group flex flex-col transition-all duration-500",
        className
      )}
    >
      <div className="aspect-square relative overflow-hidden bg-zinc-50 shrink-0 shadow-inner">
        {/* Visual Scaling applied to the image container */}
        <div className={cn("w-full h-full transition-transform duration-1000 flex items-center justify-center", getScaleClass(variant.size))}>
          {displayImage ? (
            <img 
              src={displayImage} 
              className="w-full h-full object-cover mix-blend-multiply group-hover:scale-105 transition-transform duration-700" 
              alt={variant.productName}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-zinc-200">
              <Package className="h-16 w-16 opacity-30" />
            </div>
          )}
        </div>

        {/* Glassmorphic Size Badge */}
        <div className="absolute top-4 left-4 flex flex-col gap-2">
          <div className="bg-white/60 backdrop-blur-xl border border-white/20 px-3 py-1 rounded-xl shadow-xl">
             <span className="text-[10px] font-black uppercase tracking-widest text-zinc-900">{variant.size}</span>
          </div>
          {variant.unit === 'kg' && (
            <div className="bg-blue-600 text-white px-2 py-0.5 rounded-lg shadow-lg">
               <span className="text-[8px] font-black uppercase tracking-widest">By Weight</span>
            </div>
          )}
        </div>

        {/* Combo Ribbon */}
        {variant.pricing_type === 'bundle' && (
          <div className="absolute top-0 right-0 overflow-hidden w-20 h-20 pointer-events-none">
            <div className="absolute top-4 -right-8 rotate-45 bg-zinc-900 text-white text-[8px] font-black uppercase tracking-widest py-1 w-32 text-center shadow-2xl border-y border-white/10">
              COMBO
            </div>
          </div>
        )}

        {/* Price Badge */}
        <div className="absolute top-5 right-5 bg-zinc-900/90 backdrop-blur-xl font-black px-4 py-2 rounded-2xl text-base shadow-2xl tracking-tighter border border-white/10 text-white">
          ₹{variant.base_price.toLocaleString()}
        </div>
      </div>

      <div className="p-6 flex-1 flex flex-col gap-1 text-left">
        <h4 className="font-black text-zinc-900 leading-none text-xl group-hover:text-blue-600 transition-colors uppercase italic truncate">
          {variant.productName}
        </h4>
        <div className="flex flex-wrap items-center gap-2 mt-1">
          <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">{variant.category}</p>
          {variant.pricing_type === 'bundle' && (
            <Badge className="bg-blue-500/10 text-blue-600 border-none text-[8px] font-black h-4 px-1.5 uppercase tracking-widest">
              Bundle Available
            </Badge>
          )}
        </div>
        <div className="mt-auto pt-4 flex items-center justify-between">
           <span className={cn(
             "text-[9px] font-black px-3 py-1 rounded-lg uppercase tracking-widest", 
             variant.stock < 5 ? "bg-red-50 text-red-500" : "bg-emerald-50 text-emerald-600"
           )}>
             {variant.stock} {variant.unit?.toUpperCase() || 'PCS'} LEFT
           </span>
        </div>
      </div>
    </motion.div>
  );
}
