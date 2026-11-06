"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { 
  Bike, Phone, MapPin, CheckCircle2, AlertTriangle, DollarSign, 
  Clock, ShieldCheck, ChevronRight, Navigation, Sparkles, ChefHat
} from "lucide-react";
import { orderStore, DEMO_RIDERS } from "@/lib/store/orderStore";
import { Order } from "@/lib/types";
import { formatPKR } from "@/lib/utils";

export default function RiderDispatchPage() {
  const [selectedRiderId, setSelectedRiderId] = useState<string>("r1");
  const [orders, setOrders] = useState<Order[]>([]);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    const unsub = orderStore.subscribeOrders((all) => {
      setOrders(all);
    });
    return unsub;
  }, []);

  const activeRider = DEMO_RIDERS.find((r) => r.id === selectedRiderId) || DEMO_RIDERS[0];

  // Rider's active deliveries (either assigned directly or ready for dispatch)
  const riderOrders = orders.filter(
    (o) =>
      o.fulfillmentType === "delivery" &&
      (o.orderStatus === "out_for_delivery" || o.orderStatus === "ready_for_dispatch" || o.orderStatus === "preparing")
  );

  // Delivered today by this rider (for shift cash calculation)
  const deliveredToday = orders.filter(
    (o) =>
      o.fulfillmentType === "delivery" &&
      o.orderStatus === "delivered" &&
      (o.riderId === activeRider.id || !o.riderId)
  );

  const totalCashCollected = deliveredToday
    .filter((o) => o.paymentMethod === "cod")
    .reduce((sum, o) => sum + o.totalAmount, 0);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleStartDelivery = (orderId: string) => {
    orderStore.assignRider(orderId, activeRider.id, activeRider.riderName);
    showToast(`Order #${orderId.replace("ord-", "")} marked Out for Delivery!`);
  };

  const handleCompleteDelivery = (orderId: string, amount: number, isCod: boolean) => {
    orderStore.markRiderDelivered(orderId);
    showToast(`Order delivered! ${isCod ? `Collected ${formatPKR(amount)} in cash.` : "Marked completed."}`);
  };

  return (
    <div className="min-h-screen bg-[#070b12] text-slate-100 flex flex-col font-sans pb-16">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 rounded-2xl bg-emerald-500 text-slate-950 px-4 py-2 text-xs font-black shadow-2xl animate-in fade-in slide-in-from-top-4">
          {toastMessage}
        </div>
      )}

      {/* Header */}
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-slate-800 bg-[#0d1522]/95 px-4 py-3.5 backdrop-blur-md">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-sky-500 to-blue-600 text-slate-950 font-black shadow-md">
            <Bike className="h-5 w-5 stroke-[2.5]" />
          </div>
          <div>
            <h1 className="text-base font-black text-white">Rider Dispatch Portal</h1>
            <p className="text-[11px] text-slate-400">Pizzeria D Café Lahore Delivery Fleet</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Rider Switcher */}
          <select
            value={selectedRiderId}
            onChange={(e) => setSelectedRiderId(e.target.value)}
            className="rounded-xl border border-slate-700 bg-slate-900 px-2.5 py-1.5 text-xs font-bold text-amber-400 focus:outline-none"
          >
            {DEMO_RIDERS.map((r) => (
              <option key={r.id} value={r.id}>
                {r.riderName} ({r.vehicleNumber})
              </option>
            ))}
          </select>

          <Link
            href="/kitchen"
            className="rounded-xl border border-slate-700 bg-slate-800 px-2.5 py-1.5 text-xs font-bold text-slate-300 hover:bg-slate-700"
          >
            Kitchen KDS
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 max-w-xl w-full mx-auto p-4 space-y-4">
        {/* Shift Cash & Delivery Summary Card */}
        <div className="rounded-2xl border border-sky-500/30 bg-gradient-to-br from-sky-950/30 via-slate-900 to-slate-900 p-4 shadow-xl">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-3">
            <div>
              <span className="text-[11px] font-bold text-sky-400 uppercase tracking-wider">Active Shift Summary</span>
              <h2 className="text-base font-black text-white">{activeRider.riderName}</h2>
              <p className="text-xs text-slate-400">Bike: {activeRider.vehicleNumber} • Tel: {activeRider.phone}</p>
            </div>
            <span className="rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2.5 py-1 text-[11px] font-black">
              On Duty
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3 text-center">
            <div className="rounded-xl bg-black/40 border border-slate-800 p-2.5">
              <span className="text-[11px] text-slate-400">Completed Orders</span>
              <p className="text-xl font-black text-white">{deliveredToday.length}</p>
            </div>
            <div className="rounded-xl bg-black/40 border border-amber-500/30 p-2.5">
              <span className="text-[11px] text-amber-300">Cash in Hand to Settle</span>
              <p className="text-xl font-black text-amber-400">{formatPKR(totalCashCollected)}</p>
            </div>
          </div>
        </div>

        {/* Deliveries Queue */}
        <div>
          <div className="flex items-center justify-between mb-3 px-1">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-400">
              Assigned Deliveries ({riderOrders.length})
            </h3>
            <span className="text-[11px] text-slate-500">Auto-refreshes live</span>
          </div>

          {riderOrders.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-800 bg-[#0d1420] p-8 text-center text-slate-500">
              <Bike className="h-10 w-10 mx-auto mb-2 text-slate-700 stroke-1" />
              <p className="text-xs font-semibold">No active deliveries assigned right now.</p>
              <p className="text-[11px] text-slate-600 mt-1">When kitchen packages orders, they appear here instantly.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {riderOrders.map((ord) => {
                const isCod = ord.paymentMethod === "cod";
                const isOut = ord.orderStatus === "out_for_delivery";

                return (
                  <div
                    key={ord.id}
                    className={`rounded-2xl border p-4 bg-[#0e1624] shadow-lg transition-all ${
                      isOut ? "border-sky-500/60 ring-1 ring-sky-500/20" : "border-slate-800"
                    }`}
                  >
                    {/* Top Row: Order # & Cash Status */}
                    <div className="flex items-start justify-between border-b border-slate-800/80 pb-3 mb-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-base font-black text-white">#{ord.orderNumber}</span>
                          <span className={`rounded-full px-2 py-0.5 text-[10px] font-black uppercase ${
                            isOut ? "bg-sky-500 text-slate-950" : "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                          }`}>
                            {isOut ? "🚴 En Route" : "Waiting for Pickup"}
                          </span>
                        </div>
                        <p className="text-xs font-bold text-slate-200 mt-0.5">{ord.customerName}</p>
                      </div>

                      {/* Cash Tag */}
                      <div className="text-right">
                        {isCod ? (
                          <div className="rounded-xl bg-amber-500/10 border border-amber-500/30 px-3 py-1 text-right">
                            <span className="block text-[10px] font-bold text-amber-300 uppercase">Collect Cash</span>
                            <span className="text-sm font-black text-amber-400">{formatPKR(ord.totalAmount)}</span>
                          </div>
                        ) : (
                          <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/30 px-3 py-1 text-right">
                            <span className="block text-[10px] font-bold text-emerald-300 uppercase">Paid Online</span>
                            <span className="text-xs font-black text-emerald-400">Rs. 0 to collect</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Delivery Address & Maps Button */}
                    <div className="rounded-xl bg-black/40 border border-slate-800/80 p-3 mb-3 space-y-1.5 text-xs">
                      <div className="flex items-start gap-2 text-slate-200">
                        <MapPin className="h-4 w-4 text-red-400 shrink-0 mt-0.5" />
                        <div>
                          <p className="font-medium">{ord.deliveryAddress || "Address not provided"}</p>
                          {ord.landmark && (
                            <p className="text-[11px] text-amber-300 font-semibold mt-0.5">
                              Landmark: {ord.landmark}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Phone call & Google Maps actions */}
                      <div className="pt-2 flex items-center gap-2">
                        <a
                          href={`tel:${ord.customerPhone.replace(/[^0-9]/g, "")}`}
                          className="flex-1 flex items-center justify-center gap-1.5 rounded-lg bg-emerald-500/20 border border-emerald-500/30 py-2 text-xs font-bold text-emerald-400 hover:bg-emerald-500/30 transition-colors"
                        >
                          <Phone className="h-3.5 w-3.5" />
                          Call ({ord.customerPhone})
                        </a>
                        <a
                          href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${ord.deliveryAddress}, Lahore`)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center justify-center gap-1.5 rounded-lg bg-sky-500/20 border border-sky-500/30 px-3 py-2 text-xs font-bold text-sky-400 hover:bg-sky-500/30 transition-colors"
                        >
                          <Navigation className="h-3.5 w-3.5" />
                          Navigate
                        </a>
                      </div>
                    </div>

                    {/* Order Items Summary */}
                    <div className="text-[11px] text-slate-400 mb-3 px-1">
                      <span className="font-semibold text-slate-300">Items: </span>
                      {ord.items.map((it) => `${it.quantity}x ${it.itemName}${it.sizeName ? ` (${it.sizeName})` : ""}`).join(", ")}
                    </div>

                    {/* Actions */}
                    {!isOut ? (
                      <button
                        onClick={() => handleStartDelivery(ord.id)}
                        className="w-full py-2.5 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 text-slate-950 font-black text-xs shadow-md hover:brightness-110 active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer"
                      >
                        <Bike className="h-4 w-4" />
                        Start Delivery / Picked Up from Kitchen
                      </button>
                    ) : (
                      <button
                        onClick={() => handleCompleteDelivery(ord.id, ord.totalAmount, isCod)}
                        className="w-full py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 text-slate-950 font-black text-xs shadow-md hover:brightness-110 active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer"
                      >
                        <CheckCircle2 className="h-4 w-4" />
                        {isCod
                          ? `Collected ${formatPKR(ord.totalAmount)} & Handed Over`
                          : "Delivered & Handed Over"}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

