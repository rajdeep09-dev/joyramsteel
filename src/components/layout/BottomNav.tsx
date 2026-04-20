"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, ShoppingCart, Package, Users, FileText, History } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

const navItems = [
  { name: "HOME", href: "/", icon: LayoutDashboard },
  { name: "POS", href: "/pos", icon: ShoppingCart },
  { name: "STOCK", href: "/inventory", icon: Package },
  { name: "KHATA", href: "/khata", icon: Users },
  { name: "HISTORY", href: "/history", icon: History },
  { name: "VAULT", href: "/vault", icon: FileText },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <div className="fixed bottom-6 left-4 right-4 z-50 flex flex-col items-center gap-2">
      <nav className="flex items-center justify-between bg-zinc-900/90 backdrop-blur-3xl border border-white/10 shadow-[0_32px_64px_-12px_rgba(0,0,0,0.5)] rounded-[2rem] px-3 py-3 w-full max-w-[700px]">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.name}
              href={item.href}
              className="relative flex flex-col items-center justify-center w-full h-14"
            >
              {isActive && (
                <motion.div
                  layoutId="bubble"
                  className="absolute inset-0 bg-white/10 rounded-2xl"
                  transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                />
              )}
              <item.icon 
                className={cn(
                  "h-5 w-5 relative z-10 transition-all duration-300", 
                  isActive ? "text-white scale-110" : "text-zinc-500 hover:text-zinc-300"
                )} 
              />
              <span 
                className={cn(
                  "text-[8px] font-black mt-1.5 relative z-10 transition-colors duration-300 tracking-[0.1em]",
                  isActive ? "text-white" : "text-zinc-600"
                )}
              >
                {item.name}
              </span>
            </Link>
          );
        })}
      </nav>
      <div className="text-[10px] text-zinc-400 font-bold tracking-widest bg-white/50 backdrop-blur-sm px-3 py-1 rounded-full border border-white/20 shadow-sm">Created by @rajdeep.0.21</div>
    </div>
  );
}
