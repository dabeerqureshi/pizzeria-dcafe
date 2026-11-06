"use client";

import React, { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { ShoppingBag, ArrowRight } from "lucide-react";
import { cartStore } from "@/lib/store/cartStore";
import { formatPKR } from "@/lib/utils";

export default function MobileCartBar() {
  const pathname = usePathname();
  const [itemCount, setItemCount] = useState(0);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    const unsub = cartStore.subscribe((items) => {
      const count = items.reduce((sum, item) => sum + item.quantity, 0);
      setItemCount(count);
      const totals = cartStore.getTotals();
      setTotal(totals.total);
    });

    return unsub;
  }, []);

  // Do not render floating bar on checkout, order status, admin, kitchen, or rider pages
  if (
    itemCount === 0 ||
    pathname.startsWith("/checkout") ||
    pathname.startsWith("/order") ||
    pathname.startsWith("/admin") ||
    pathname.startsWith("/kitchen") ||
    pathname.startsWith("/rider")
  ) {
    return null;
  }

  return (
    <div className="fixed bottom-[max(0.75rem,env(safe-area-inset-bottom))] left-3 right-3 z-30 md:hidden animate-in slide-in-from-bottom-5 duration-300">
      <button
        onClick={() => cartStore.setDrawerOpen(true)}
        className="flex w-full items-center justify-between rounded-2xl bg-gradient-to-r from-amber-500 via-amber-400 to-amber-600 px-4 py-3 text-slate-950 font-black shadow-2xl shadow-amber-500/40 border border-amber-300/40 active:scale-98 transition-all cursor-pointer"
        aria-label="View Cart"
      >
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-black text-amber-400 shadow-md">
            <ShoppingBag className="h-4 w-4" />
          </div>
          <div className="text-left leading-tight">
            <div className="text-xs font-black uppercase tracking-wider">
              {itemCount} {itemCount === 1 ? "Item" : "Items"} in Cart
            </div>
            <div className="font-mono text-sm font-black text-black/90">
              {formatPKR(total)}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5 rounded-xl bg-black/15 px-3 py-1.5 text-xs font-black uppercase tracking-wider">
          <span>View Cart</span>
          <ArrowRight className="h-4 w-4" />
        </div>
      </button>
    </div>
  );
}
