"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { 
  Bike, Phone, MapPin, CheckCircle2, AlertTriangle, DollarSign, 
  Clock, ShieldCheck, ChevronRight, Navigation, Sparkles, ChefHat,
  PackageCheck, UserCheck, Hand
} from "lucide-react";
import { orderStore, FLEET_RIDERS } from "@/lib/store/orderStore";
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

  const activeRider = FLEET_RIDERS.find((r) => r.id === selectedRiderId) || FLEET_RIDERS[0];

  // Rider's assigned active deliveries (strictly assigned to THIS rider)
  const myAssignedOrders = orders.filter(
    (o) =>
      o.fulfillmentType === "delivery" &&
      o.riderId === activeRider.id &&
      (o.orderStatus === "out_for_delivery" || o.orderStatus === "ready_for_dispatch" || o.orderStatus === "preparing")
  );

  // Unassigned orders in kitchen waiting for rider pickup
  const unassignedPool = orders.filter(
    (o) =>
      o.fulfillmentType === "delivery" &&
      !o.riderId &&
      (o.orderStatus === "ready_for_dispatch" || o.orderStatus === "preparing")
  );

  // Delivered today strictly by this rider (for shift cash reconciliation)
  const deliveredToday = orders.filter(
    (o) =>
      o.fulfillmentType === "delivery" &&
      o.orderStatus === "delivered" &&
      o.riderId === activeRider.id
  );

  const totalCashCollected = deliveredToday
    .filter((o) => o.paymentMethod === "cod")
    .reduce((sum, o) => sum + o.totalAmount, 0);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleClaimOrder = (orderId: string, orderNumber: number) => {
    orderStore.assignRider(orderId, activeRider.id, activeRider.riderName, activeRider.phone, "ready_for_dispatch");
    showToast(`Order #${orderNumber} claimed by ${activeRider.riderName}!`);
  };

  const handleStartDelivery = (orderId: string, orderNumber: number) => {
    orderStore.startRiderDelivery(orderId);
    showToast(`Order #${orderNumber} marked Out for Delivery! Drive safe.`);
  };

  const handleCompleteDelivery = (orderId: string, orderNumber: number, amount: number, isCod: boolean) => {
    orderStore.markRiderDelivered(orderId);
    showToast(`Order #${orderNumber} delivered! ${isCod ? `Collected ${formatPKR(amount)} in cash.` : "Marked completed."}`);
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
            {FLEET_RIDERS.map((r) => (
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
      <div className="flex-1 max-w-xl w-full mx-auto p-4 space-y-5">
        {/* Shift Cash & Delivery Summary Card */}
        <div className="rounded-2xl border border-sky-500/30 bg-gradient-to-br from-sky-950/30 via-slate-900 to-slate-900 p-4 shadow-xl">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-3">
            <div>
              <span className="text-[11px] font-bold text-sky-400 uppercase tracking-wider">Active Shift Summary</span>
              <h2 className="text-base font-black text-white flex items-center gap-1.5">
                <UserCheck className="h-4 w-4 text-sky-400" />
                {activeRider.riderName}
              </h2>
              <p className="text-xs text-slate-400">Bike: {activeRider.vehicleNumber} • Tel: {activeRider.phone}</p>
            </div>
            <span className="rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2.5 py-1 text-[11px] font-black">
              On Duty
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3 text-center">
            <div className="rounded-xl bg-black/40 border border-slate-800 p-2.5">
              <span className="text-[11px] text-slate-400">Delivered by Me</span>
              <p className="text-xl font-black text-white">{deliveredToday.length}</p>
            </div>
            <div className="rounded-xl bg-black/40 border border-amber-500/30 p-2.5">
              <span className="text-[11px] text-amber-300">My Cash to Hand-in</span>
              <p className="text-xl font-black text-amber-400">{formatPKR(totalCashCollected)}</p>
            </div>
          </div>
        </div>

        {/* SECTION 1: My Assigned Deliveries */}
        <section className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-xs font-black uppercase tracking-wider text-sky-400 flex items-center gap-1.5">
              <Bike className="h-4 w-4" />
              My Assigned Deliveries ({myAssignedOrders.length})
            </h3>
            <span className="text-[11px] text-slate-500">Linked to Order IDs</span>
          </div>

          {myAssignedOrders.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-800 bg-[#0d1420] p-6 text-center text-slate-500">
              <Bike className="h-8 w-8 mx-auto mb-2 text-slate-700 stroke-1" />
              <p className="text-xs font-semibold">No deliveries assigned to {activeRider.riderName} right now.</p>
              <p className="text-[11px] text-slate-600 mt-0.5">Claim an unassigned order below or wait for cashier dispatch.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {myAssignedOrders.map((ord) => {
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
                            isOut
                              ? "bg-sky-500 text-slate-950 font-black animate-pulse"
                              : ord.orderStatus === "preparing"
                              ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                              : "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                          }`}>
                            {isOut ? "🚴 En Route" : ord.orderStatus === "preparing" ? "👨‍🍳 In Oven" : "📦 Ready at Counter"}
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
                      ord.orderStatus === "preparing" ? (
                        <div className="w-full py-2.5 px-3 rounded-xl bg-slate-800/80 border border-slate-700/80 text-amber-300 font-bold text-xs flex items-center justify-center gap-2">
                          <ChefHat className="h-4 w-4 animate-bounce text-amber-400" />
                          <span>Baking in Kitchen — Wait for Counter Dispatch</span>
                        </div>
                      ) : (
                        <button
                          onClick={() => handleStartDelivery(ord.id, ord.orderNumber)}
                          className="w-full py-2.5 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 text-slate-950 font-black text-xs shadow-md hover:brightness-110 active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer"
                        >
                          <Bike className="h-4 w-4" />
                          Start Delivery / Depart Kitchen
                        </button>
                      )
                    ) : (
                      <button
                        onClick={() => handleCompleteDelivery(ord.id, ord.orderNumber, ord.totalAmount, isCod)}
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
        </section>

        {/* SECTION 2: Available at Kitchen (Unassigned Pool) */}
        {unassignedPool.length > 0 && (
          <section className="space-y-3 pt-2">
            <div className="flex items-center justify-between px-1">
              <h3 className="text-xs font-black uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                <PackageCheck className="h-4 w-4" />
                Available at Kitchen ({unassignedPool.length} Unassigned)
              </h3>
              <span className="text-[11px] text-slate-400">Tap to claim for {activeRider.riderName}</span>
            </div>

            <div className="space-y-2.5">
              {unassignedPool.map((ord) => (
                <div
                  key={ord.id}
                  className="rounded-2xl border border-amber-500/30 bg-[#0f1725] p-3.5 flex items-center justify-between gap-3 shadow-md"
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-black text-white">#{ord.orderNumber}</span>
                      <span className="text-[10px] uppercase font-bold text-amber-400 bg-amber-500/10 border border-amber-500/30 rounded-md px-1.5 py-0.5">
                        {ord.orderStatus === "ready_for_dispatch" ? "Ready" : "Baking"}
                      </span>
                    </div>
                    <p className="text-xs text-slate-300 font-medium">{ord.customerName} • {ord.deliveryAddress}</p>
                    <p className="text-[11px] text-amber-300 font-mono font-bold">
                      {ord.paymentMethod === "cod" ? `COD: ${formatPKR(ord.totalAmount)}` : "Paid Online"}
                    </p>
                  </div>

                  <button
                    onClick={() => handleClaimOrder(ord.id, ord.orderNumber)}
                    className="shrink-0 flex items-center gap-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 px-3 py-2 text-xs font-black shadow-md transition-all active:scale-95 cursor-pointer"
                  >
                    <Hand className="h-3.5 w-3.5" />
                    <span>Claim Order</span>
                  </button>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
