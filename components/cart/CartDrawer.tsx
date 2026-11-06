"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { X, Trash2, Plus, Minus, ShoppingBag, ArrowRight, AlertCircle, CheckCircle2, Truck, Sparkles } from "lucide-react";
import { cartStore } from "@/lib/store/cartStore";
import { CartItem } from "@/lib/types";
import { formatPKR } from "@/lib/utils";
import { MINIMUM_ORDER_AMOUNT, FREE_DELIVERY_THRESHOLD } from "@/lib/pricing";
import { getKitchenStatus, setKitchenOverride, KitchenStatus } from "@/lib/businessHours";

export default function CartDrawer() {
  const [isOpen, setIsOpen] = useState(false);
  const [items, setItems] = useState<CartItem[]>([]);
  const [totals, setTotals] = useState(cartStore.getTotals());
  const [kitchenStatus, setKitchenStatus] = useState<KitchenStatus>(getKitchenStatus());

  useEffect(() => {
    const unsubDrawer = cartStore.subscribeDrawer((open) => setIsOpen(open));
    const unsubCart = cartStore.subscribe((newItems) => {
      setItems(newItems);
      setTotals(cartStore.getTotals());
    });
    const updateKitchen = () => setKitchenStatus(getKitchenStatus());
    window.addEventListener("kitchen_status_changed", updateKitchen);
    updateKitchen();

    return () => {
      unsubDrawer();
      unsubCart();
      window.removeEventListener("kitchen_status_changed", updateKitchen);
    };
  }, []);

  if (!isOpen) return null;

  const minOrderProgress = Math.min(100, Math.round((totals.subtotal / MINIMUM_ORDER_AMOUNT) * 100));
  const freeDeliveryProgress = Math.min(100, Math.round((totals.subtotal / FREE_DELIVERY_THRESHOLD) * 100));

  return (
    <div 
      onClick={() => cartStore.setDrawerOpen(false)}
      className="fixed inset-0 z-50 flex justify-end bg-black/75 backdrop-blur-sm animate-in fade-in duration-200"
    >
      <div 
        className="relative flex h-full w-full max-w-md flex-col bg-[#0f1724] border-l border-slate-800 shadow-2xl animate-in slide-in-from-right duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 px-5 py-4 bg-[#121a29]">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/20 text-amber-400">
              <ShoppingBag className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-white text-base">Your Cart</h3>
              <p className="text-xs text-slate-400">
                {items.length} {items.length === 1 ? "item" : "items"}
              </p>
            </div>
          </div>
          <button
            onClick={() => cartStore.setDrawerOpen(false)}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white transition-colors cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Animated Operational Policy Banners: Minimum Order & Free Delivery */}
        <div className="border-b border-slate-800/80 bg-[#141d2d] px-5 py-3.5 space-y-2.5">
          {/* Minimum order check */}
          {!totals.isEligibleForDelivery ? (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs font-semibold text-amber-300">
                <span className="flex items-center gap-1.5">
                  <AlertCircle className="h-4 w-4 text-amber-400 shrink-0 animate-bounce" />
                  <span>Minimum order for delivery: Rs. 1,000</span>
                </span>
                <span className="font-mono">{minOrderProgress}%</span>
              </div>
              <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-800 shadow-inner">
                <div 
                  className="h-full bg-amber-500 rounded-full progress-striped transition-all duration-500"
                  style={{ width: `${minOrderProgress}%` }}
                />
              </div>
              <p className="text-[11px] text-slate-400">
                Add <span className="font-bold text-amber-400">{formatPKR(totals.amountNeededForMinOrder)}</span> more to unlock delivery.
              </p>
            </div>
          ) : (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs font-semibold">
                <span className="flex items-center gap-1.5 text-emerald-300">
                  <Truck className="h-4 w-4 text-emerald-400 shrink-0" />
                  <span>
                    {totals.deliveryFee === 0 
                      ? "Free delivery unlocked! 🎉" 
                      : `Add ${formatPKR(totals.amountNeededForFreeDelivery)} for FREE delivery`}
                  </span>
                </span>
                <span className="text-slate-400 text-[11px] font-mono">{freeDeliveryProgress}%</span>
              </div>
              <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-800 shadow-inner">
                <div 
                  className="h-full bg-emerald-500 rounded-full progress-striped transition-all duration-500"
                  style={{ width: `${freeDeliveryProgress}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Items List */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {items.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center text-center py-12">
              <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-slate-800/60 text-slate-500 mb-3 animate-float">
                <ShoppingBag className="h-8 w-8" />
              </div>
              <h4 className="font-bold text-white text-base">Your cart is empty</h4>
              <p className="mt-1 max-w-[200px] text-xs text-slate-400">
                Explore our House Specials, Meltzilla Monster or Crispy Zingers!
              </p>
              <button
                onClick={() => cartStore.setDrawerOpen(false)}
                className="mt-4 rounded-xl bg-amber-500 px-4 py-2 text-xs font-bold text-black hover:bg-amber-400 hover:scale-105 active:scale-95 transition-all cursor-pointer"
              >
                Browse Menu
              </button>
            </div>
          ) : (
            items.map((item) => {
              const addonsSum = item.addons.reduce((sum, a) => sum + a.price, 0);
              const lineTotal = (item.unitPrice + addonsSum) * item.quantity;

              return (
                <div
                  key={item.id}
                  className="rounded-2xl border border-slate-800 bg-[#121927] p-3.5 space-y-2.5 transition-all hover:border-slate-700 hover:bg-[#141c2c]"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h4 className="font-bold text-sm text-white">{item.name}</h4>
                      {item.variant && (
                        <span className="inline-block mt-0.5 rounded-md bg-slate-800 px-2 py-0.5 text-[11px] font-semibold text-amber-300">
                          {item.variant.sizeName}
                        </span>
                      )}
                    </div>
                    <button
                      onClick={() => cartStore.removeItem(item.id)}
                      className="text-slate-500 hover:text-red-400 transition-colors p-1 hover:scale-110 active:scale-95"
                      title="Remove item"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>

                  {/* Addons List */}
                  {item.addons.length > 0 && (
                    <div className="space-y-0.5 border-l-2 border-amber-500/40 pl-2 text-[11px] text-slate-300">
                      {item.addons.map((a) => (
                        <div key={a.id} className="flex justify-between">
                          <span>+ {a.name}</span>
                          <span className="font-mono text-amber-400">+{formatPKR(a.price)}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Special instructions */}
                  {item.specialInstructions && (
                    <p className="text-[11px] italic text-slate-400 bg-slate-900/60 rounded-lg px-2 py-1">
                      Note: &quot;{item.specialInstructions}&quot;
                    </p>
                  )}

                  {/* Quantity and Line Total */}
                  <div className="flex items-center justify-between border-t border-slate-800/80 pt-2">
                    <div className="flex items-center gap-2 rounded-xl bg-slate-900 border border-slate-800 px-2 py-1">
                      <button
                        onClick={() => cartStore.updateQuantity(item.id, item.quantity - 1)}
                        className="text-slate-400 hover:text-white transition-transform active:scale-75"
                      >
                        <Minus className="h-3.5 w-3.5" />
                      </button>
                      <span className="w-5 text-center font-mono text-xs font-bold text-white">
                        {item.quantity}
                      </span>
                      <button
                        onClick={() => cartStore.updateQuantity(item.id, item.quantity + 1)}
                        className="text-slate-400 hover:text-white transition-transform active:scale-125"
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </button>
                    </div>

                    <div className="font-mono text-sm font-bold text-amber-400">
                      {formatPKR(lineTotal)}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer Summary & Checkout */}
        {items.length > 0 && (
          <div className="border-t border-slate-800 bg-[#121a29] p-4 sm:p-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] sm:pb-5 space-y-3 shrink-0">
            <div className="space-y-1.5 text-xs">
              <div className="flex justify-between text-slate-400">
                <span>Subtotal</span>
                <span className="font-mono text-slate-200">{formatPKR(totals.subtotal)}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Delivery Fee</span>
                <span className="font-mono">
                  {totals.deliveryFee === 0 ? (
                    <span className="font-bold text-emerald-400">FREE (Order &ge; Rs. 1,500)</span>
                  ) : (
                    <span className="text-slate-200">{formatPKR(totals.deliveryFee)}</span>
                  )}
                </span>
              </div>
              <div className="flex justify-between border-t border-slate-800 pt-2 text-sm font-black text-white">
                <span>Grand Total</span>
                <span className="font-mono text-base text-amber-400">{formatPKR(totals.total)}</span>
              </div>
            </div>

            {!kitchenStatus.isOpen ? (
              <div className="space-y-2">
                <button
                  disabled
                  className="flex w-full items-center justify-center gap-2 rounded-2xl bg-red-950/60 py-3 text-xs font-bold text-red-300 cursor-not-allowed border border-red-800/60"
                >
                  <span>Kitchen Closed (No Orders After 12:00)</span>
                </button>
                <div className="flex items-center justify-between text-[11px] text-slate-400">
                  <span>Advance bookings on WhatsApp.</span>
                  <button
                    type="button"
                    onClick={() => {
                      setKitchenOverride("forced_open");
                      setKitchenStatus(getKitchenStatus());
                    }}
                    className="text-amber-400 hover:underline font-bold"
                  >
                    Force Open for Testing
                  </button>
                </div>
              </div>
            ) : totals.isEligibleForDelivery ? (
              <Link
                href="/checkout"
                onClick={() => cartStore.setDrawerOpen(false)}
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 py-3 text-xs font-black uppercase tracking-wider text-slate-950 shadow-lg shadow-amber-500/20 hover:from-amber-400 hover:to-amber-500 hover:scale-[1.02] active:scale-98 transition-all"
              >
                <span>Proceed to Checkout</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
            ) : (
              <div className="space-y-1.5">
                <Link
                  href="/checkout"
                  onClick={() => cartStore.setDrawerOpen(false)}
                  className="flex w-full items-center justify-center gap-2 rounded-2xl bg-amber-500/20 border border-amber-500/40 py-3 text-xs font-black text-amber-300 hover:bg-amber-500 hover:text-black transition-all cursor-pointer"
                >
                  <span>Proceed as Branch Pickup (Free)</span>
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <p className="text-[10px] text-center text-slate-400">
                  Delivery requires Rs. {MINIMUM_ORDER_AMOUNT} min. Pickup is free.
                </p>
              </div>
            )}

            <button
              onClick={() => cartStore.clearCart()}
              className="w-full text-center text-[11px] font-medium text-slate-500 hover:text-slate-300 transition-colors cursor-pointer"
            >
              Clear Cart
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
