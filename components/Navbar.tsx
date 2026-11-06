"use client";

import React, { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Phone, ShoppingBag, UtensilsCrossed, Sparkles, Clock8, User, LogOut, ChevronDown } from "lucide-react";
import { cartStore } from "@/lib/store/cartStore";
import { customerAuthStore } from "@/lib/store/customerAuthStore";
import { CustomerProfile } from "@/lib/types";
import { formatPKR } from "@/lib/utils";
import { getKitchenStatus, KitchenStatus } from "@/lib/businessHours";

export default function Navbar() {
  const pathname = usePathname();
  const [itemCount, setItemCount] = useState(0);
  const [subtotal, setSubtotal] = useState(0);
  const [isBouncing, setIsBouncing] = useState(false);
  const [kitchenStatus, setKitchenStatus] = useState<KitchenStatus>(getKitchenStatus());
  const [customer, setCustomer] = useState<CustomerProfile | null>(null);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const prevCountRef = useRef(0);

  useEffect(() => {
    let bounceTimer: NodeJS.Timeout | null = null;
    const unsub = cartStore.subscribe((items) => {
      const count = items.reduce((sum, item) => sum + item.quantity, 0);
      if (count > prevCountRef.current) {
        setIsBouncing(true);
        if (bounceTimer) clearTimeout(bounceTimer);
        bounceTimer = setTimeout(() => setIsBouncing(false), 600);
      }
      prevCountRef.current = count;
      setItemCount(count);
      const totals = cartStore.getTotals();
      setSubtotal(totals.subtotal);
    });

    const unsubAuth = customerAuthStore.subscribe((c) => {
      setCustomer(c);
    });

    const updateKitchen = () => setKitchenStatus(getKitchenStatus());
    window.addEventListener("kitchen_status_changed", updateKitchen);
    updateKitchen();

    return () => {
      unsub();
      unsubAuth();
      if (bounceTimer) clearTimeout(bounceTimer);
      window.removeEventListener("kitchen_status_changed", updateKitchen);
    };
  }, []);

  if (pathname.startsWith("/admin") || pathname.startsWith("/kitchen") || pathname.startsWith("/rider")) {
    return null;
  }

  return (
    <header className="sticky top-0 z-40 w-full border-b border-amber-900/30 bg-[#0d131f]/95 backdrop-blur-md transition-all">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-3 py-2.5 sm:px-6 sm:py-3">
        {/* Brand / Logo */}
        <Link href="/" className="group flex items-center gap-2.5 sm:gap-3 shrink-0">
          <div className="relative flex h-9 w-9 sm:h-11 sm:w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-400 via-amber-500 to-red-600 shadow-lg shadow-amber-500/20 group-hover:scale-105 group-hover:rotate-3 transition-transform duration-300 shrink-0">
            <span className="text-xl sm:text-2xl font-black text-black select-none group-hover:scale-110 transition-transform">🍕</span>
            <div className="absolute inset-0 rounded-2xl border border-white/20" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 sm:gap-2">
              <span className="text-sm sm:text-lg md:text-xl font-extrabold tracking-tight text-white group-hover:text-amber-400 transition-colors">
                PIZZERIA D CAFÉ
              </span>
              {kitchenStatus.isOpen ? (
                <span className="hidden lg:inline-flex rounded-full bg-amber-500/20 px-2 py-0.5 text-[10px] font-semibold text-amber-300 border border-amber-500/30 animate-pulse shrink-0">
                  Fresh & Hot
                </span>
              ) : (
                <span className="hidden lg:inline-flex rounded-full bg-red-500/20 px-2 py-0.5 text-[10px] font-bold text-red-300 border border-red-500/40 shrink-0">
                  Closed (Past 12)
                </span>
              )}
            </div>
            <p className="text-[10px] sm:text-xs text-slate-400 truncate">Artisanal Crusts & Fast Food</p>
          </div>
        </Link>

        {/* Action Controls */}
        <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
          {/* Quick Hotline Call */}
          <a
            href="tel:03084382003"
            className="hidden lg:flex items-center gap-2 rounded-xl bg-slate-800/80 px-3 py-1.5 text-xs font-medium text-slate-200 border border-slate-700 hover:border-amber-500/40 hover:bg-slate-800 transition-all hover:scale-105"
          >
            <Phone className="h-3.5 w-3.5 text-amber-400 animate-bounce" />
            <span>0308-4382003</span>
          </a>

          {/* Kitchen / Admin Link */}
          <Link
            href="/admin/orders"
            className="group flex items-center gap-1 sm:gap-1.5 rounded-xl bg-red-950/40 px-2.5 py-1.5 sm:px-3 sm:py-2 text-[11px] sm:text-xs font-semibold text-red-300 border border-red-800/50 hover:bg-red-900/40 hover:text-red-200 hover:border-red-600/60 transition-all hover:scale-105"
            title="Open Live Kitchen Kanban Board"
          >
            <UtensilsCrossed className="h-3.5 w-3.5 text-red-400 group-hover:rotate-12 transition-transform" />
            <span className="hidden sm:inline">Kitchen POS</span>
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
          </Link>

          {/* KFC-Style Customer Account / Login Button */}
          {customer ? (
            <div className="relative">
              <button
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className="flex items-center gap-1.5 rounded-xl border border-amber-500/40 bg-amber-500/10 px-2.5 py-1.5 sm:px-3 sm:py-2 text-[11px] sm:text-xs font-black text-amber-300 hover:bg-amber-500 hover:text-black transition-all cursor-pointer"
              >
                <User className="h-3.5 w-3.5" />
                <span className="max-w-[70px] sm:max-w-[110px] truncate">{customer.fullName}</span>
                <ChevronDown className="h-3 w-3" />
              </button>

              {userMenuOpen && (
                <div 
                  onClick={() => setUserMenuOpen(false)}
                  className="absolute right-0 mt-2 w-48 rounded-2xl border border-slate-700 bg-slate-900 p-2 shadow-2xl z-50 text-xs animate-in zoom-in-95 duration-150"
                >
                  <div className="px-3 py-2 border-b border-slate-800">
                    <p className="font-black text-white truncate">{customer.fullName}</p>
                    <p className="text-[10px] text-slate-400 font-mono">{customer.phone}</p>
                  </div>
                  <Link
                    href="/checkout"
                    className="flex w-full items-center gap-2 px-3 py-2 text-slate-300 hover:bg-slate-800 hover:text-white rounded-xl transition-colors font-medium"
                  >
                    <ShoppingBag className="h-3.5 w-3.5 text-amber-400" />
                    <span>Proceed to Order</span>
                  </Link>
                  <button
                    onClick={() => {
                      customerAuthStore.logout();
                      setUserMenuOpen(false);
                    }}
                    className="flex w-full items-center gap-2 px-3 py-2 text-red-400 hover:bg-red-950/30 rounded-xl transition-colors font-bold cursor-pointer"
                  >
                    <LogOut className="h-3.5 w-3.5" />
                    <span>Sign Out</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            <button
              onClick={() => customerAuthStore.setAuthModalOpen(true)}
              className="flex items-center gap-1 sm:gap-1.5 rounded-xl border border-slate-700 bg-slate-800/80 px-2.5 py-1.5 sm:px-3 sm:py-2 text-[11px] sm:text-xs font-bold text-slate-200 hover:border-amber-500/50 hover:text-white transition-all hover:scale-105 cursor-pointer"
            >
              <User className="h-3.5 w-3.5 text-amber-400" />
              <span>Sign In</span>
            </button>
          )}

          {/* Cart Button */}
          <button
            onClick={() => cartStore.setDrawerOpen(true)}
            className={`relative flex items-center gap-1.5 sm:gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 px-2.5 py-1.5 sm:px-3.5 sm:py-2 text-[11px] sm:text-xs font-bold text-slate-950 shadow-md shadow-amber-500/25 hover:from-amber-400 hover:to-amber-500 transition-all active:scale-95 cursor-pointer ${
              isBouncing ? "animate-cart-bounce" : "hover:scale-105"
            }`}
            aria-label="View Cart"
          >
            <ShoppingBag className="h-4 w-4" />
            <span className="hidden sm:inline">Cart</span>
            {itemCount > 0 && (
              <>
                <span className="rounded-full bg-black px-1.5 py-0.5 text-[10px] sm:text-[11px] font-black text-amber-400 animate-badge-pop">
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
