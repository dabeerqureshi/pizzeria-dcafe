"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { 
  ChefHat, Clock, CheckCircle2, Flame, AlertCircle, Volume2, VolumeX, 
  ArrowRight, RefreshCw, ShoppingBag, Bike, ShieldAlert, Sparkles, Filter
} from "lucide-react";
import { orderStore } from "@/lib/store/orderStore";
import { Order, OrderStatus } from "@/lib/types";
import { formatPKR } from "@/lib/utils";

export default function KitchenDisplayPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [filterType, setFilterType] = useState<"all" | "delivery" | "pickup">("all");
  const prevOrdersCount = useRef<number>(0);

  useEffect(() => {
    const unsub = orderStore.subscribeOrders((all) => {
      // Audio alert if new pending or confirmed order arrived
      const activePending = all.filter(o => o.orderStatus === "confirmed" || o.orderStatus === "pending");
      if (soundEnabled && activePending.length > prevOrdersCount.current && prevOrdersCount.current > 0) {
        playKitchenAlert();
      }
      prevOrdersCount.current = activePending.length;
      setOrders(all);
    });

    return unsub;
  }, [soundEnabled]);

  const playKitchenAlert = () => {
    if (typeof window === "undefined") return;
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.3);
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.35);
    } catch {}
  };

  const handleUpdateStatus = (orderId: string, newStatus: OrderStatus) => {
    orderStore.updateOrderStatus(orderId, newStatus);
    playKitchenAlert();
  };

  // Filter out delivered or cancelled
  const activeOrders = orders.filter((o) => {
    if (o.orderStatus === "delivered" || o.orderStatus === "picked_up" || o.orderStatus === "cancelled") {
      return false;
    }
    if (filterType === "delivery" && o.fulfillmentType !== "delivery") return false;
    if (filterType === "pickup" && o.fulfillmentType !== "pickup") return false;
    return true;
  });

  const toCookOrders = activeOrders.filter((o) => o.orderStatus === "confirmed" || o.orderStatus === "pending" || o.orderStatus === "pending_confirmation");
  const preparingOrders = activeOrders.filter((o) => o.orderStatus === "preparing");
  const readyOrders = activeOrders.filter((o) => o.orderStatus === "ready_for_dispatch" || o.orderStatus === "out_for_delivery" || o.orderStatus === "delivering");

  return (
    <div className="min-h-screen bg-[#070b12] text-slate-100 flex flex-col font-sans select-none">
      {/* KDS Header Bar */}
      <header className="sticky top-0 z-30 flex flex-wrap items-center justify-between border-b border-slate-800 bg-[#0d1522]/95 px-4 sm:px-6 py-3.5 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-amber-500 to-red-600 text-slate-950 shadow-lg shadow-amber-500/20">
            <ChefHat className="h-6 w-6 stroke-[2.5]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-black tracking-wide text-white uppercase">
                Pizzeria D Café Kitchen Screen (KDS)
              </h1>
              <span className="flex h-2.5 w-2.5 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
              </span>
            </div>
            <p className="text-xs text-slate-400">Live Kitchen Display & Oven Queue • 100% Real-Time</p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 mt-2 sm:mt-0">
          {/* Fulfillment Filter */}
          <div className="flex items-center rounded-xl bg-slate-900 border border-slate-700 p-0.5 text-xs font-bold">
            <button
              onClick={() => setFilterType("all")}
              className={`px-3 py-1.5 rounded-lg transition-all ${filterType === "all" ? "bg-amber-500 text-slate-950 shadow" : "text-slate-400 hover:text-white"}`}
            >
              All ({orders.filter(o => o.orderStatus !== "delivered" && o.orderStatus !== "cancelled").length})
            </button>
            <button
              onClick={() => setFilterType("delivery")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${filterType === "delivery" ? "bg-amber-500 text-slate-950 shadow" : "text-slate-400 hover:text-white"}`}
            >
              <Bike className="h-3.5 w-3.5" />
              Delivery
            </button>
            <button
              onClick={() => setFilterType("pickup")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${filterType === "pickup" ? "bg-amber-500 text-slate-950 shadow" : "text-slate-400 hover:text-white"}`}
            >
              <ShoppingBag className="h-3.5 w-3.5" />
              Pickup
            </button>
          </div>

          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold transition-all ${
              soundEnabled ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400" : "bg-slate-800 border-slate-700 text-slate-400"
            }`}
            title="Toggle Kitchen Alert Sound"
          >
            {soundEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
            <span className="hidden md:inline">{soundEnabled ? "Chime On" : "Chime Muted"}</span>
          </button>

          <Link
            href="/admin/orders"
            className="rounded-xl border border-slate-700 bg-slate-800/80 hover:bg-slate-700 px-3 py-1.5 text-xs font-bold text-slate-200 transition-colors"
          >
            Admin Panel
          </Link>
          <Link
            href="/rider"
            className="rounded-xl border border-sky-500/30 bg-sky-500/10 hover:bg-sky-500/20 px-3 py-1.5 text-xs font-bold text-sky-400 transition-colors"
          >
            Rider Screen
          </Link>
        </div>
      </header>

      {/* 3-Column Touch Screen Board */}
      <div className="flex-1 p-4 grid grid-cols-1 md:grid-cols-3 gap-4 overflow-y-auto">
        {/* Column 1: To Cook (Confirmed) */}
        <div className="flex flex-col rounded-2xl border border-amber-500/30 bg-[#0d1420] overflow-hidden shadow-xl">
          <div className="flex items-center justify-between border-b border-amber-500/20 bg-amber-500/10 px-4 py-3">
            <div className="flex items-center gap-2">
              <span className="flex h-3 w-3 rounded-full bg-amber-500" />
              <h2 className="font-black text-amber-400 uppercase tracking-wider text-sm">
                1. To Cook / Incoming
              </h2>
            </div>
            <span className="rounded-full bg-amber-500 text-slate-950 font-black text-xs px-2.5 py-0.5">
              {toCookOrders.length}
            </span>
          </div>

          <div className="flex-1 p-3 space-y-3 overflow-y-auto max-h-[calc(100vh-170px)]">
            {toCookOrders.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-48 text-slate-500 text-xs text-center p-4">
                <ChefHat className="h-10 w-10 text-slate-700 mb-2 stroke-1" />
                No incoming tickets waiting to cook.
              </div>
            ) : (
              toCookOrders.map((ord) => (
                <KdsTicketCard
                  key={ord.id}
                  order={ord}
                  primaryActionLabel="🔥 Put in Oven / Start Prep"
                  primaryActionColor="bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 hover:brightness-110"
                  onPrimaryAction={() => handleUpdateStatus(ord.id, "preparing")}
                />
              ))
            )}
          </div>
        </div>

        {/* Column 2: In Oven / Cooking (Preparing) */}
        <div className="flex flex-col rounded-2xl border border-orange-500/30 bg-[#0d1420] overflow-hidden shadow-xl">
          <div className="flex items-center justify-between border-b border-orange-500/20 bg-orange-500/10 px-4 py-3">
            <div className="flex items-center gap-2">
              <span className="flex h-3 w-3 rounded-full bg-orange-500 animate-pulse" />
              <h2 className="font-black text-orange-400 uppercase tracking-wider text-sm">
                2. In Oven / Cooking
              </h2>
            </div>
            <span className="rounded-full bg-orange-500 text-slate-950 font-black text-xs px-2.5 py-0.5">
              {preparingOrders.length}
            </span>
          </div>

          <div className="flex-1 p-3 space-y-3 overflow-y-auto max-h-[calc(100vh-170px)]">
            {preparingOrders.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-48 text-slate-500 text-xs text-center p-4">
                <Flame className="h-10 w-10 text-slate-700 mb-2 stroke-1" />
                Ovens clear. All tickets ready or waiting.
              </div>
            ) : (
              preparingOrders.map((ord) => (
                <KdsTicketCard
                  key={ord.id}
                  order={ord}
                  primaryActionLabel="✅ Mark Ready & Packaged"
                  primaryActionColor="bg-gradient-to-r from-emerald-500 to-emerald-600 text-slate-950 hover:brightness-110"
                  onPrimaryAction={() => handleUpdateStatus(ord.id, "ready_for_dispatch")}
                />
              ))
            )}
          </div>
        </div>

        {/* Column 3: Ready for Pickup / Rider Dispatch */}
        <div className="flex flex-col rounded-2xl border border-emerald-500/30 bg-[#0d1420] overflow-hidden shadow-xl">
          <div className="flex items-center justify-between border-b border-emerald-500/20 bg-emerald-500/10 px-4 py-3">
            <div className="flex items-center gap-2">
              <span className="flex h-3 w-3 rounded-full bg-emerald-500" />
              <h2 className="font-black text-emerald-400 uppercase tracking-wider text-sm">
                3. Ready for Counter / Rider
              </h2>
            </div>
            <span className="rounded-full bg-emerald-500 text-slate-950 font-black text-xs px-2.5 py-0.5">
              {readyOrders.length}
            </span>
          </div>

          <div className="flex-1 p-3 space-y-3 overflow-y-auto max-h-[calc(100vh-170px)]">
            {readyOrders.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-48 text-slate-500 text-xs text-center p-4">
                <CheckCircle2 className="h-10 w-10 text-slate-700 mb-2 stroke-1" />
                Pickup counter and dispatch shelf clear.
              </div>
            ) : (
              readyOrders.map((ord) => (
                <KdsTicketCard
                  key={ord.id}
                  order={ord}
                  primaryActionLabel={
                    ord.fulfillmentType === "pickup"
                      ? "🤝 Handed Over to Customer"
                      : ord.orderStatus === "out_for_delivery"
                      ? "🚴 Rider En Route"
                      : "📦 Hand to Delivery Rider"
                  }
                  primaryActionColor={
                    ord.fulfillmentType === "pickup"
                      ? "bg-emerald-500 text-slate-950 hover:bg-emerald-400"
                      : "bg-sky-500 text-slate-950 hover:bg-sky-400"
                  }
                  onPrimaryAction={() => {
                    if (ord.fulfillmentType === "pickup") {
                      handleUpdateStatus(ord.id, "picked_up");
                    } else {
                      handleUpdateStatus(ord.id, "out_for_delivery");
                    }
                  }}
                />
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Subcomponent: Individual Kitchen Ticket Card
function KdsTicketCard({
  order,
  primaryActionLabel,
  primaryActionColor,
  onPrimaryAction,
}: {
  order: Order;
  primaryActionLabel: string;
  primaryActionColor: string;
  onPrimaryAction: () => void;
}) {
  const isPickup = order.fulfillmentType === "pickup";

  // Calculate elapsed minutes since creation
  const createdDate = new Date(order.createdAt);
  const elapsedMinutes = Math.floor((Date.now() - createdDate.getTime()) / (1000 * 60));
  const isUrgent = elapsedMinutes >= 25;

  return (
    <div className={`rounded-xl border p-4 bg-[#111927] transition-all shadow-md ${
      isUrgent ? "border-red-500/60 bg-red-950/10" : "border-slate-800"
    }`}>
      {/* Ticket Header */}
      <div className="flex items-start justify-between border-b border-slate-800/80 pb-2.5 mb-2.5">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-base font-black text-white">#{order.orderNumber}</span>
            <span className="text-xs font-bold text-slate-300">{order.customerName}</span>
          </div>
          <div className="flex items-center gap-2 mt-0.5 text-[11px] text-slate-400">
            <Clock className="h-3 w-3" />
            <span className={isUrgent ? "text-red-400 font-extrabold" : ""}>
              {elapsedMinutes}m ago
            </span>
            <span>•</span>
            <span className="font-semibold text-slate-300">{formatPKR(order.totalAmount)}</span>
          </div>
        </div>

        {/* Fulfillment Badge & Pickup Code */}
        <div className="text-right">
          {isPickup ? (
            <div className="flex flex-col items-end">
              <span className="inline-flex items-center gap-1 rounded-md bg-amber-500/20 px-2 py-0.5 text-[11px] font-black text-amber-400 border border-amber-500/30">
                <ShoppingBag className="h-3 w-3" />
                PICKUP
              </span>
              <span className="mt-1 rounded bg-amber-400 px-1.5 py-0.5 text-[11px] font-black text-slate-950 tracking-wider">
                {order.pickupCode || "COUNTER"}
              </span>
            </div>
          ) : (
            <span className="inline-flex items-center gap-1 rounded-md bg-sky-500/20 px-2 py-0.5 text-[11px] font-black text-sky-400 border border-sky-500/30">
              <Bike className="h-3 w-3" />
              DELIVERY
            </span>
          )}
        </div>
      </div>

      {/* Items List (Large & Clear for Kitchen Staff) */}
      <div className="space-y-2 mb-3">
        {order.items.map((item, idx) => (
          <div key={idx} className="rounded-lg bg-black/40 border border-slate-800/60 p-2 text-xs">
            <div className="flex items-center justify-between font-black text-white">
              <div className="flex items-center gap-1.5">
                <span className="flex h-5 w-5 items-center justify-center rounded bg-amber-500/20 text-amber-400 font-bold text-[11px]">
                  {item.quantity}x
                </span>
                <span>{item.itemName}</span>
              </div>
              {item.sizeName && (
                <span className="rounded bg-slate-800 px-1.5 py-0.5 text-[10px] text-slate-300 font-medium">
                  {item.sizeName}
                </span>
              )}
            </div>

            {/* Modifiers / Addons */}
            {item.addons && item.addons.length > 0 && (
              <div className="mt-1 flex flex-wrap gap-1 pl-6">
                {item.addons.map((ad, i) => (
                  <span key={i} className="rounded bg-red-500/20 border border-red-500/30 px-1.5 py-0.2 text-[10px] text-red-300 font-bold">
                    + {ad.name}
                  </span>
                ))}
              </div>
            )}

            {/* Special Instruction */}
            {item.specialInstructions && (
              <p className="mt-1 pl-6 text-[10px] text-amber-300 font-semibold italic">
                Note: {item.specialInstructions}
              </p>
            )}
          </div>
        ))}
      </div>

      {/* Cooking Notes */}
      {order.notes && (
        <div className="mb-3 rounded-lg bg-amber-500/10 border border-amber-500/20 p-2 text-[11px] text-amber-200">
          <span className="font-bold">Order Note:</span> {order.notes}
        </div>
      )}

      {/* Address if delivery */}
      {!isPickup && order.deliveryAddress && (
        <p className="mb-3 text-[11px] text-slate-400 truncate">
          📍 {order.deliveryAddress} {order.landmark ? `(${order.landmark})` : ""}
        </p>
      )}

      {/* Big Touch Action Button */}
      <button
        onClick={onPrimaryAction}
        className={`w-full py-2.5 px-3 rounded-xl font-black text-xs shadow-md transition-all active:scale-[0.98] cursor-pointer flex items-center justify-center gap-2 ${primaryActionColor}`}
      >
        <span>{primaryActionLabel}</span>
      </button>
    </div>
  );
}

