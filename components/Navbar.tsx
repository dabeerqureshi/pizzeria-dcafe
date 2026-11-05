"use client";

import React, { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { Phone, ShoppingBag, UtensilsCrossed, Sparkles } from "lucide-react";
import { cartStore } from "@/lib/store/cartStore";
import { formatPKR } from "@/lib/utils";

export default function Navbar() {
  const [itemCount, setItemCount] = useState(0);
  const [subtotal, setSubtotal] = useState(0);
  const [isBouncing, setIsBouncing] = useState(false);
  const prevCountRef = useRef(0);

  useEffect(() => {
    const unsub = cartStore.subscribe((items) => {
      const count = items.reduce((sum, item) => sum + item.quantity, 0);
      if (count > prevCountRef.current) {
        setIsBouncing(true);
        const timer = setTimeout(() => setIsBouncing(false), 600);
        return () => clearTimeout(timer);
      }
      prevCountRef.current = count;
      setItemCount(count);
      const totals = cartStore.getTotals();
      setSubtotal(totals.subtotal);
    });
    return unsub;
  }, []);

  return (
    <header className="sticky top-0 z-40 w-full border-b border-amber-900/30 bg-[#0d131f]/95 backdrop-blur-md transition-all">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
        {/* Brand / Logo */}
        <Link href="/" className="group flex items-center gap-3">
          <div className="relative flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-400 via-amber-500 to-red-600 shadow-lg shadow-amber-500/20 group-hover:scale-105 group-hover:rotate-3 transition-transform duration-300">
            <span className="text-2xl font-black text-black select-none group-hover:scale-110 transition-transform">🍕</span>
            <div className="absolute inset-0 rounded-2xl border border-white/20" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xl font-extrabold tracking-tight text-white group-hover:text-amber-400 transition-colors">
                PIZZERIA D CAFÉ
              </span>
              <span className="hidden sm:inline-flex rounded-full bg-amber-500/20 px-2 py-0.5 text-[10px] font-semibold text-amber-300 border border-amber-500/30 animate-pulse">
                Fresh & Hot
              </span>
            </div>
            <p className="text-xs text-slate-400">Artisanal Crusts & Fast Food</p>
          </div>
        </Link>

        {/* Action Controls */}
        <div className="flex items-center gap-2 sm:gap-4">
          {/* Quick Hotline Call */}
          <a
            href="tel:03084382003"
            className="hidden md:flex items-center gap-2 rounded-xl bg-slate-800/80 px-3 py-1.5 text-xs font-medium text-slate-200 border border-slate-700 hover:border-amber-500/40 hover:bg-slate-800 transition-all hover:scale-105"
          >
            <Phone className="h-3.5 w-3.5 text-amber-400 animate-bounce" />
            <span>0308-4382003</span>
          </a>

          {/* Kitchen / Admin Link */}
          <Link
            href="/admin/orders"
            className="group flex items-center gap-1.5 rounded-xl bg-red-950/40 px-3 py-2 text-xs font-semibold text-red-300 border border-red-800/50 hover:bg-red-900/40 hover:text-red-200 hover:border-red-600/60 transition-all hover:scale-105"
            title="Open Live Kitchen Kanban Board"
          >
            <UtensilsCrossed className="h-3.5 w-3.5 text-red-400 group-hover:rotate-12 transition-transform" />
            <span className="hidden sm:inline">Kitchen POS</span>
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
          </Link>

          {/* Cart Button */}
          <button
            onClick={() => cartStore.setDrawerOpen(true)}
            className={`relative flex items-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 px-3.5 py-2 text-xs font-bold text-slate-950 shadow-md shadow-amber-500/25 hover:from-amber-400 hover:to-amber-500 transition-all active:scale-95 cursor-pointer ${
              isBouncing ? "animate-cart-bounce" : "hover:scale-105"
            }`}
            aria-label="View Cart"
          >
            <ShoppingBag className="h-4 w-4" />
            <span className="hidden sm:inline">Cart</span>
            {itemCount > 0 && (
              <>
                <span className="rounded-full bg-black px-1.5 py-0.5 text-[11px] font-black text-amber-400 animate-badge-pop">
                  {itemCount}
                </span>
                <span className="hidden md:inline font-mono text-[11px] font-bold text-black/90">
                  {formatPKR(subtotal)}
                </span>
              </>
            )}
          </button>
        </div>
      </div>
    </header>
  );
}
