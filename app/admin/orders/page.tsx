"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { 
  Volume2, VolumeX, Printer, CheckCircle2, Clock, ChefHat, Bike, 
  Check, X, Eye, Sparkles, AlertTriangle, ArrowRight, RefreshCw, 
  UtensilsCrossed, ShieldCheck, Phone, MapPin, Search, Power, Clock8, AlertCircle, LogOut
} from "lucide-react";
import { orderStore, FLEET_RIDERS } from "@/lib/store/orderStore";
import { Order, OrderStatus } from "@/lib/types";
import { formatPKR } from "@/lib/utils";
import KitchenSlip from "@/components/admin/KitchenSlip";
import { getKitchenStatus, setKitchenOverride, setKitchenCutoffMode, KitchenStatus } from "@/lib/businessHours";

export default function AdminOrdersPage() {
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [activeReceiptModalOrder, setActiveReceiptModalOrder] = useState<Order | null>(null);
  const [printingOrder, setPrintingOrder] = useState<Order | null>(null);
  const [searchFilter, setSearchFilter] = useState("");
  const [showCancelledModal, setShowCancelledModal] = useState(false);
  const [kitchenStatus, setKitchenStatus] = useState<KitchenStatus>(getKitchenStatus());
  const prevOrdersCountRef = useRef(0);

  const handleLogout = async () => {
    try {
      await fetch("/api/admin/logout", { method: "POST" });
      router.push("/admin/login");
      router.refresh();
    } catch {
      router.push("/admin/login");
    }
  };

  // Web Audio Synthesizer for Kitchen Chime (zero asset latency)
  const playChime = () => {
    if (!soundEnabled || typeof window === "undefined") return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();

      // Tone 1: 587.33 Hz (D5)
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = "sine";
      osc1.frequency.setValueAtTime(587.33, ctx.currentTime);
      gain1.gain.setValueAtTime(0.25, ctx.currentTime);
      gain1.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.45);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start();
      osc1.stop(ctx.currentTime + 0.45);

      // Tone 2: 880 Hz (A5)
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = "sine";
      osc2.frequency.setValueAtTime(880, ctx.currentTime + 0.16);
      gain2.gain.setValueAtTime(0.35, ctx.currentTime + 0.16);
      gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.7);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(ctx.currentTime + 0.16);
      osc2.stop(ctx.currentTime + 0.7);
    } catch {
      // AudioContext could be blocked if user hasn't interacted yet
    }
  };

  useEffect(() => {
    const unsub = orderStore.subscribeOrders((newOrders) => {
      if (prevOrdersCountRef.current > 0 && newOrders.length > prevOrdersCountRef.current) {
        playChime();
      }
      prevOrdersCountRef.current = newOrders.length;
      setOrders(newOrders);
    });

    const updateStatus = () => {
      setKitchenStatus(getKitchenStatus());
    };

    window.addEventListener("kitchen_status_changed", updateStatus);
    const interval = setInterval(updateStatus, 10000);

    return () => {
      unsub();
      window.removeEventListener("kitchen_status_changed", updateStatus);
      clearInterval(interval);
    };
  }, [soundEnabled]);

  const handleStatusChange = (orderId: string, nextStatus: OrderStatus) => {
    if (nextStatus === "out_for_delivery") {
      const order = orders.find(o => o.id === orderId);
      if (order && !order.riderId && order.fulfillmentType === "delivery") {
        // Auto-assign default fleet rider so order ID always has a rider attached
        orderStore.assignRider(orderId, FLEET_RIDERS[0].id, FLEET_RIDERS[0].riderName, FLEET_RIDERS[0].phone, "out_for_delivery");
        return;
      }
    }
    orderStore.updateOrderStatus(orderId, nextStatus);
  };

  const handleApprovePayment = (orderId: string) => {
    orderStore.updatePaymentStatus(orderId, "verified");
    setActiveReceiptModalOrder(null);
  };

  const handleDeleteOrder = (orderId: string) => {
    if (typeof window !== "undefined" && window.confirm("Are you sure you want to archive and dismiss this order from the board?")) {
      orderStore.deleteOrder(orderId);
    }
  };

  const filteredOrders = orders.filter((o) => {
    const q = searchFilter.toLowerCase();
    return (
      String(o.orderNumber).includes(q) ||
      o.customerName.toLowerCase().includes(q) ||
      o.customerPhone.includes(q) ||
      o.items.some(i => i.itemName.toLowerCase().includes(q))
    );
  });

  const pendingOrders = filteredOrders.filter(
    (o) => o.orderStatus === "pending" || o.orderStatus === "pending_confirmation" || o.orderStatus === "pending_payment"
  );
  const acceptedOrders = filteredOrders.filter(
    (o) => o.orderStatus === "accepted" || o.orderStatus === "confirmed"
  );
  const preparingOrders = filteredOrders.filter(
    (o) => o.orderStatus === "preparing"
  );
  const deliveringOrders = filteredOrders.filter(
    (o) => o.orderStatus === "delivering" || o.orderStatus === "out_for_delivery" || o.orderStatus === "ready_for_dispatch"
  );
  const deliveredOrders = filteredOrders.filter(
    (o) => o.orderStatus === "delivered" || o.orderStatus === "picked_up"
  );
  const cancelledOrders = filteredOrders.filter(
    (o) => o.orderStatus === "cancelled" || o.orderStatus === "failed_delivery"
  );

  const totalSales = orders
    .filter(o => o.orderStatus !== "cancelled")
    .reduce((sum, o) => sum + o.totalAmount, 0);

  return (
    <div className="min-h-screen bg-[#0a0e17] px-4 py-6 sm:px-6 space-y-6">
      {/* Top Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-red-600/20 text-red-400 border border-red-500/30 shadow-lg shadow-red-500/10">
              <UtensilsCrossed className="h-5 w-5 animate-spin" style={{ animationDuration: "12s" }} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                  Kitchen Live Kanban & POS
                </h1>
                <span className="flex items-center gap-1.5 rounded-full bg-emerald-500/20 px-2.5 py-0.5 text-[10px] font-bold text-emerald-300 border border-emerald-500/30">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                  </span>
                  Live Sync
                </span>
              </div>
              <p className="text-xs text-slate-400">Pizzeria D Café Real-Time Order Management</p>
            </div>
          </div>
        </div>

        {/* Operational Controls & Hours Switch */}
        <div className="flex flex-wrap items-center gap-2.5 sm:gap-3 w-full lg:w-auto">
          {/* Kitchen Order Accepting Master Switch */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 rounded-2xl border border-slate-800 bg-[#121927] p-1.5 w-full sm:w-auto">
            <div className="flex items-center gap-1.5 px-2 py-0.5">
              <span className={`h-2.5 w-2.5 rounded-full ${kitchenStatus.isOpen ? "bg-emerald-400 animate-pulse" : "bg-red-500"}`} />
              <span className="text-[11px] font-bold text-white">
                Orders: {kitchenStatus.isOpen ? "OPEN" : "CLOSED (Past 12)"}
              </span>
            </div>

            <div className="flex items-center gap-1 border-t sm:border-t-0 sm:border-l border-slate-800 pt-1 sm:pt-0 sm:pl-1.5 w-full sm:w-auto justify-between sm:justify-start">
              <button
                onClick={() => setKitchenOverride("auto")}
                className={`flex-1 sm:flex-none rounded-lg px-2 py-1 text-[10px] font-bold transition-all text-center ${
                  kitchenStatus.overrideValue === "auto"
                    ? "bg-amber-500 text-black shadow-sm"
                    : "text-slate-400 hover:text-white"
                }`}
                title="Closes automatically after 12:00"
              >
                Auto (12 Cutoff)
              </button>
              <button
                onClick={() => setKitchenOverride("forced_open")}
                className={`flex-1 sm:flex-none rounded-lg px-2 py-1 text-[10px] font-bold transition-all text-center ${
                  kitchenStatus.overrideValue === "forced_open"
                    ? "bg-emerald-500 text-black shadow-sm"
                    : "text-slate-400 hover:text-white"
                }`}
                title="Force keep accepting orders"
              >
                Force Open
              </button>
              <button
                onClick={() => setKitchenOverride("forced_closed")}
                className={`flex-1 sm:flex-none rounded-lg px-2 py-1 text-[10px] font-bold transition-all text-center ${
                  kitchenStatus.overrideValue === "forced_closed"
                    ? "bg-red-500 text-white shadow-sm"
                    : "text-slate-400 hover:text-white"
                }`}
                title="Close kitchen immediately"
              >
                Stop Orders
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-start">
            {/* Sound Alert Toggle with Equalizer Wave */}
            <button
              onClick={() => {
                setSoundEnabled(!soundEnabled);
                if (!soundEnabled) playChime();
              }}
              className={`flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-bold transition-all border cursor-pointer hover:scale-105 active:scale-95 ${
                soundEnabled
                  ? "border-amber-500/40 bg-amber-500/10 text-amber-300 shadow-sm shadow-amber-500/20"
                  : "border-slate-800 bg-slate-900 text-slate-400 hover:text-white"
              }`}
            >
              {soundEnabled ? (
                <div className="flex items-center gap-1">
                  <Volume2 className="h-4 w-4 text-amber-400" />
                  <span className="flex items-end gap-0.5 h-3">
                    <span className="w-0.5 bg-amber-400 rounded-full" style={{ animation: "soundWave 0.6s infinite ease-in-out" }} />
                    <span className="w-0.5 bg-amber-400 rounded-full" style={{ animation: "soundWave 0.8s infinite ease-in-out 0.2s" }} />
                    <span className="w-0.5 bg-amber-400 rounded-full" style={{ animation: "soundWave 0.7s infinite ease-in-out 0.4s" }} />
                  </span>
                </div>
              ) : (
                <VolumeX className="h-4 w-4" />
              )}
              <span>Chime</span>
            </button>

            {/* Quick Operational Navigation */}
            <Link
              href="/kitchen"
              className="rounded-xl bg-amber-500/10 border border-amber-500/30 px-3 py-2 text-xs font-bold text-amber-300 hover:bg-amber-500 hover:text-black hover:scale-105 transition-all text-center"
            >
              Kitchen KDS
            </Link>

            <Link
              href="/rider"
              className="rounded-xl bg-sky-500/10 border border-sky-500/30 px-3 py-2 text-xs font-bold text-sky-400 hover:bg-sky-500 hover:text-black hover:scale-105 transition-all text-center"
            >
              Rider Portal
            </Link>

            <Link
              href="/admin/settlements"
              className="rounded-xl bg-emerald-500/10 border border-emerald-500/30 px-3 py-2 text-xs font-bold text-emerald-300 hover:bg-emerald-500 hover:text-black hover:scale-105 transition-all text-center"
            >
              COD Settlements
            </Link>

            {/* Stock Manager Link */}
            <Link
              href="/admin/menu"
              className="rounded-xl bg-slate-800 px-3 py-2 text-xs font-bold text-slate-200 hover:bg-slate-700 hover:text-white hover:scale-105 transition-all text-center"
            >
              Stock
            </Link>

            {/* Sign Out Button */}
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 rounded-xl border border-red-900/50 bg-red-950/30 px-3 py-2 text-xs font-bold text-red-300 hover:bg-red-900/40 hover:text-red-200 transition-all cursor-pointer"
              title="Sign out of POS"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </div>

      {/* 12:00 Cutoff Operational Banner */}
      {!kitchenStatus.isOpen && (
        <div className="rounded-2xl border border-red-500/40 bg-red-950/40 p-3.5 flex items-center justify-between text-xs text-red-200 shadow-lg">
          <div className="flex items-center gap-2.5">
            <Clock8 className="h-4 w-4 text-red-400 shrink-0 animate-bounce" />
            <div>
              <strong className="text-white">Kitchen Order Cutoff Active: </strong>
              <span>Customers cannot place orders after 12:00. Checkout is disabled.</span>
            </div>
          </div>
          <button
            onClick={() => setKitchenOverride("forced_open")}
            className="rounded-xl bg-red-600 px-3 py-1 text-[11px] font-black text-white hover:bg-red-500 transition-colors cursor-pointer"
          >
            Override: Accept Orders Now
          </button>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div className="rounded-2xl border border-slate-800 bg-[#111724] p-3.5 sm:p-4">
          <div className="text-[11px] text-slate-400 font-medium">New / Pending</div>
          <div className="mt-1 font-mono text-xl sm:text-2xl font-black text-amber-400">
            {pendingOrders.length}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-[#111724] p-3.5 sm:p-4">
          <div className="text-[11px] text-slate-400 font-medium">In Kitchen (Accepted & Baking)</div>
          <div className="mt-1 font-mono text-xl sm:text-2xl font-black text-red-400">
            {acceptedOrders.length + preparingOrders.length}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-[#111724] p-3.5 sm:p-4">
          <div className="text-[11px] text-slate-400 font-medium">Delivering by Rider</div>
          <div className="mt-1 font-mono text-xl sm:text-2xl font-black text-sky-400">
            {deliveringOrders.length}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-[#111724] p-3.5 sm:p-4">
          <div className="text-[11px] text-slate-400 font-medium">Delivered Today</div>
          <div className="mt-1 font-mono text-xl sm:text-2xl font-black text-emerald-400">
            {deliveredOrders.length}
          </div>
        </div>
      </div>

      {/* Filter / Search Bar & Cancelled Orders View */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative max-w-sm w-full">
          <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            placeholder="Filter by Order #, Customer, or Item..."
            className="w-full rounded-xl border border-slate-800 bg-[#121926] py-2 pl-10 pr-4 text-xs text-white placeholder-slate-500 focus:border-amber-500 focus:outline-none"
          />
        </div>

        {cancelledOrders.length > 0 && (
          <button
            type="button"
            onClick={() => setShowCancelledModal(true)}
            className="flex items-center gap-1.5 rounded-xl border border-red-900/40 bg-red-950/20 px-3 py-2 text-xs font-bold text-red-300 hover:bg-red-900/30 hover:border-red-500/50 transition-all cursor-pointer self-start sm:self-auto"
          >
            <AlertCircle className="h-4 w-4 text-red-400" />
            <span>Cancelled Orders ({cancelledOrders.length})</span>
          </button>
        )}
      </div>

      {/* 5-Column Full Status Kanban Board */}
      <div className="flex gap-4 overflow-x-auto pb-6 pt-1 scrollbar-none snap-x items-start">
        {/* Column 1: New Orders (Pending) */}
        <KanbanColumn
          title="1. New Orders"
          badgeColor="bg-amber-500/20 text-amber-400 border-amber-500/30"
          count={pendingOrders.length}
          orders={pendingOrders}
          onStatusChange={handleStatusChange}
          onViewReceipt={(ord) => setActiveReceiptModalOrder(ord)}
          onPrint={(ord) => setPrintingOrder(ord)}
          primaryActionLabel="Accept Order ✓"
          primaryNextStatus="accepted"
          showRejectAction
          isPendingColumn
        />

        {/* Column 2: Accepted Orders */}
        <KanbanColumn
          title="2. Accepted"
          badgeColor="bg-indigo-500/20 text-indigo-300 border-indigo-500/30"
          count={acceptedOrders.length}
          orders={acceptedOrders}
          onStatusChange={handleStatusChange}
          onViewReceipt={(ord) => setActiveReceiptModalOrder(ord)}
          onPrint={(ord) => setPrintingOrder(ord)}
          primaryActionLabel="Start Preparing 👨‍🍳"
          primaryNextStatus="preparing"
        />

        {/* Column 3: In Kitchen / Preparing */}
        <KanbanColumn
          title="3. In Kitchen (Baking)"
          badgeColor="bg-red-500/20 text-red-400 border-red-500/30"
          count={preparingOrders.length}
          orders={preparingOrders}
          onStatusChange={handleStatusChange}
          onViewReceipt={(ord) => setActiveReceiptModalOrder(ord)}
          onPrint={(ord) => setPrintingOrder(ord)}
          primaryActionLabel="Hand to Rider 🛵"
          primaryNextStatus="delivering"
        />

        {/* Column 4: Ready for Dispatch / Delivering */}
        <KanbanColumn
          title="4. Ready / Delivering"
          badgeColor="bg-sky-500/20 text-sky-400 border-sky-500/30"
          count={deliveringOrders.length}
          orders={deliveringOrders}
          onStatusChange={handleStatusChange}
          onViewReceipt={(ord) => setActiveReceiptModalOrder(ord)}
          onPrint={(ord) => setPrintingOrder(ord)}
          primaryActionLabel="Mark Delivered 🎉"
          primaryNextStatus="delivered"
        />

        {/* Column 5: Delivered / Completed */}
        <KanbanColumn
          title="5. Completed"
          badgeColor="bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
          count={deliveredOrders.length}
          orders={deliveredOrders}
          onStatusChange={handleStatusChange}
          onViewReceipt={(ord) => setActiveReceiptModalOrder(ord)}
          onPrint={(ord) => setPrintingOrder(ord)}
          onDelete={handleDeleteOrder}
          isCompletedColumn
        />
      </div>

      {/* Receipt & AI Verification Inspection Modal */}
      {activeReceiptModalOrder && (
        <div 
          onClick={() => setActiveReceiptModalOrder(null)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm animate-in fade-in duration-200"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-2xl rounded-3xl border border-slate-700 bg-[#121927] p-6 shadow-2xl space-y-5 animate-in zoom-in-95 duration-200"
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div>
                <h3 className="font-extrabold text-white text-base">
                  Payment Verification - Order #{activeReceiptModalOrder.orderNumber}
                </h3>
                <p className="text-xs text-slate-400">
                  Customer: {activeReceiptModalOrder.customerName} ({activeReceiptModalOrder.customerPhone})
                </p>
              </div>
              <button
                onClick={() => setActiveReceiptModalOrder(null)}
                className="rounded-full bg-slate-800 p-1.5 text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Screenshot Preview */}
              <div className="space-y-1.5">
                <span className="text-xs font-bold text-slate-300">Customer Transfer Screenshot</span>
                <div className="relative h-64 w-full rounded-2xl overflow-hidden border border-slate-800 bg-black flex items-center justify-center">
                  {activeReceiptModalOrder.paymentReceiptUrl ? (
                    <Image
                      src={activeReceiptModalOrder.paymentReceiptUrl}
                      alt="Payment Receipt"
                      fill
                      onError={(e) => {
                        (e.target as any).src = "https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=800&auto=format&fit=crop&q=80";
                      }}
                      className="object-contain"
                    />
                  ) : (
                    <span className="text-xs text-slate-500">No screenshot attached</span>
                  )}
                </div>
              </div>

              {/* Gemini Vision OCR Card */}
              <div className="space-y-3 flex flex-col justify-between">
                <div>
                  <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                    <Sparkles className="h-4 w-4 text-amber-400 animate-spin" style={{ animationDuration: "5s" }} />
                    <span>Gemini Vision OCR Extraction</span>
                  </span>

                  <div className="mt-2 rounded-2xl border border-slate-700 bg-slate-900/80 p-3.5 space-y-2.5 text-xs">
                    <div className="flex justify-between items-center pb-2 border-b border-slate-800">
                      <span className="text-slate-400">Status</span>
                      <span className={`rounded-md px-2 py-0.5 text-[10px] font-bold ${
                        activeReceiptModalOrder.verificationDetails?.matched
                          ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                          : "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                      }`}>
                        {activeReceiptModalOrder.verificationDetails?.matched ? "AMOUNT MATCHED" : "MANUAL REVIEW REQUIRED"}
                      </span>
                    </div>

                    <div className="space-y-1 font-mono text-[11px]">
                      <div className="flex justify-between">
                        <span className="text-slate-400">Order Total:</span>
                        <span className="font-bold text-white">{formatPKR(activeReceiptModalOrder.totalAmount)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">OCR Extracted Amount:</span>
                        <span className="font-bold text-amber-400">
                          {activeReceiptModalOrder.verificationDetails?.amount 
                            ? formatPKR(activeReceiptModalOrder.verificationDetails.amount) 
                            : "N/A"}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Transaction ID (TID):</span>
                        <span className="font-bold text-slate-200">
                          {activeReceiptModalOrder.verifiedTransactionId || activeReceiptModalOrder.verificationDetails?.tid || "Pending"}
                        </span>
                      </div>
                    </div>

                    {activeReceiptModalOrder.verificationDetails?.notes && (
                      <p className="text-[10px] text-slate-400 italic pt-1 border-t border-slate-800">
                        {activeReceiptModalOrder.verificationDetails.notes}
                      </p>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="space-y-2 pt-2">
                  <button
                    onClick={() => handleApprovePayment(activeReceiptModalOrder.id)}
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 py-2.5 text-xs font-black text-white hover:bg-emerald-500 hover:scale-[1.02] active:scale-98 transition-all shadow-md cursor-pointer"
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    <span>Approve & Mark Verified</span>
                  </button>

                  <button
                    onClick={() => {
                      orderStore.updatePaymentStatus(activeReceiptModalOrder.id, "failed");
                      setActiveReceiptModalOrder(null);
                    }}
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-slate-800 py-2 text-xs font-bold text-red-400 hover:bg-red-950/40 hover:scale-[1.02] active:scale-98 transition-all cursor-pointer"
                  >
                    <X className="h-4 w-4" />
                    <span>Reject Screenshot</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Cancelled Orders Modal */}
      {showCancelledModal && (
        <div 
          onClick={() => setShowCancelledModal(false)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm animate-in fade-in duration-200"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-xl max-h-[85vh] overflow-y-auto rounded-3xl border border-red-500/30 bg-[#121927] p-6 shadow-2xl space-y-4"
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-red-400" />
                <h3 className="font-extrabold text-white text-base">
                  Cancelled / Rejected Orders ({cancelledOrders.length})
                </h3>
              </div>
              <button
                onClick={() => setShowCancelledModal(false)}
                className="rounded-full bg-slate-800 p-1.5 text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-3">
              {cancelledOrders.map((ord) => (
                <div key={ord.id} className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4 space-y-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="font-mono text-amber-400 font-bold">#{ord.orderNumber}</span>
                      <h4 className="text-white text-sm font-bold">{ord.customerName}</h4>
                      <p className="text-xs text-slate-400">{ord.customerPhone} • {formatPKR(ord.totalAmount)}</p>
                    </div>
                    <span className="rounded-full bg-red-500/20 text-red-300 border border-red-500/40 px-2 py-0.5 text-[10px] font-bold uppercase">
                      Cancelled
                    </span>
                  </div>

                  <div className="text-[11px] text-slate-400">
                    Items: {ord.items.map(i => `${i.quantity}x ${i.itemName}`).join(", ")}
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800/80">
                    <button
                      type="button"
                      onClick={() => {
                        handleStatusChange(ord.id, "pending");
                        if (cancelledOrders.length <= 1) setShowCancelledModal(false);
                      }}
                      className="rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/40 px-3 py-1.5 text-xs font-bold hover:bg-amber-500 hover:text-black transition-all cursor-pointer"
                    >
                      Restore to Pending
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        handleDeleteOrder(ord.id);
                        if (cancelledOrders.length <= 1) setShowCancelledModal(false);
                      }}
                      className="rounded-xl bg-slate-800 text-slate-400 px-3 py-1.5 text-xs font-bold hover:bg-red-950/40 hover:text-red-300 transition-all cursor-pointer"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
      {printingOrder && (
        <div 
          onClick={() => setPrintingOrder(null)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm animate-in fade-in duration-200"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="relative max-h-[90vh] overflow-y-auto rounded-3xl border border-slate-700 bg-slate-900 p-6 shadow-2xl animate-in zoom-in-95 duration-200"
          >
            <KitchenSlip
              order={printingOrder}
              onClose={() => setPrintingOrder(null)}
            />
          </div>
        </div>
      )}
    </div>
  );
}

// Kanban Column Subcomponent
interface ColumnProps {
  title: string;
  badgeColor: string;
  count: number;
  orders: Order[];
  onStatusChange: (orderId: string, status: OrderStatus) => void;
  onViewReceipt: (order: Order) => void;
  onPrint: (order: Order) => void;
  onDelete?: (orderId: string) => void;
  primaryActionLabel?: string;
  primaryNextStatus?: OrderStatus;
  showRejectAction?: boolean;
  isCompletedColumn?: boolean;
  isPendingColumn?: boolean;
}

function KanbanColumn({
  title,
  badgeColor,
  count,
  orders,
  onStatusChange,
  onViewReceipt,
  onPrint,
  onDelete,
  primaryActionLabel,
  primaryNextStatus,
  showRejectAction,
  isCompletedColumn,
  isPendingColumn
}: ColumnProps) {
  return (
    <div className="flex flex-col rounded-3xl border border-slate-800 bg-[#0d131f] p-3.5 min-h-[550px] w-[310px] sm:w-[330px] shrink-0 snap-start">
      {/* Column Title */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-800">
        <h3 className="font-extrabold text-white text-xs sm:text-sm">{title}</h3>
        <span className={`rounded-full px-2 py-0.5 text-xs font-bold border ${badgeColor}`}>
          {count}
        </span>
      </div>

      {/* Orders List */}
      <div className="mt-3.5 flex-1 space-y-3 overflow-y-auto pr-1">
        {orders.length === 0 ? (
          <div className="flex h-32 flex-col items-center justify-center text-center text-xs text-slate-500">
            <span>No orders</span>
          </div>
        ) : (
          orders.map((ord) => (
            <div
              key={ord.id}
              className={`rounded-2xl border p-3.5 space-y-3 transition-all duration-300 hover:shadow-xl ${
                isPendingColumn
                  ? "border-amber-500/50 bg-[#121927] hover:border-amber-500 shadow-sm shadow-amber-500/10"
                  : "border-slate-800/90 bg-[#121927] hover:border-slate-700"
              }`}
            >
              {/* Order Card Header */}
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="font-mono text-base font-black text-amber-400">
                      #{ord.orderNumber}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      {new Date(ord.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </span>
                    {ord.fulfillmentType === "pickup" ? (
                      <span className="rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 px-1.5 py-0.2 text-[9px] font-black uppercase">
                        Pickup: {ord.pickupCode || "Counter"}
                      </span>
                    ) : (
                      <span className="rounded bg-sky-500/20 text-sky-300 border border-sky-500/30 px-1.5 py-0.2 text-[9px] font-black uppercase">
                        Delivery
                      </span>
                    )}
                  </div>
                  <div className="font-bold text-white text-xs mt-0.5">{ord.customerName}</div>
                </div>

                {/* Print Slip Icon Button */}
                <button
                  onClick={() => onPrint(ord)}
                  className="rounded-xl border border-slate-700 bg-slate-800 p-1.5 text-slate-300 hover:bg-amber-500 hover:text-black hover:scale-110 active:scale-95 transition-all cursor-pointer shrink-0"
                  title="Print 80mm Kitchen Order Ticket"
                >
                  <Printer className="h-4 w-4" />
                </button>
              </div>

              {/* Items List */}
              <div className="space-y-1.5 rounded-xl bg-slate-900/80 p-2.5 text-xs text-slate-300 border border-slate-800/80">
                {ord.items.map((i, idx) => (
                  <div key={idx} className="flex justify-between">
                    <div>
                      <span className="font-bold text-white">{i.quantity}x</span> {i.itemName}
                      {i.sizeName && <span className="text-[10px] text-amber-400 ml-1 font-semibold">({i.sizeName})</span>}
                      {i.addons && i.addons.length > 0 && (
                        <div className="text-[10px] text-slate-400">
                          {i.addons.map(a => `+ ${a.name}`).join(", ")}
                        </div>
                      )}
                      {i.specialInstructions && (
                        <div className="text-[10px] text-red-300 italic font-semibold">
                          *** {i.specialInstructions} ***
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Customer Delivery info */}
              <div className="text-[11px] text-slate-400 space-y-0.5">
                <div className="flex items-center gap-1.5 text-slate-300">
                  <Phone className="h-3 w-3 text-amber-400 shrink-0" />
                  <a href={`tel:${ord.customerPhone}`} className="hover:underline">{ord.customerPhone}</a>
                </div>
                <div className="flex items-start gap-1.5">
                  <MapPin className="h-3 w-3 text-slate-500 shrink-0 mt-0.5" />
                  <span className="line-clamp-2">{ord.deliveryAddress} {ord.landmark && `(Near ${ord.landmark})`}</span>
                </div>
              </div>

              {/* Financials & Payment Verification Badge */}
              <div className="flex items-center justify-between border-t border-slate-800/80 pt-2 text-xs">
                <div className="font-mono font-bold text-white">
                  {formatPKR(ord.totalAmount)}
                </div>

                {ord.paymentMethod === "cod" ? (
                  <span className="rounded-md bg-slate-800 px-2 py-0.5 text-[10px] font-semibold text-slate-300">
                    COD
                  </span>
                ) : (
                  <button
                    onClick={() => onViewReceipt(ord)}
                    className={`flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-bold transition-all cursor-pointer ${
                      ord.paymentStatus === "verified"
                        ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                        : "bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/30 hover:scale-105 active:scale-95"
                    }`}
                  >
                    <Eye className="h-3 w-3" />
                    <span>{ord.paymentStatus === "verified" ? "Verified" : "Verify Slip"}</span>
                  </button>
                )}
              </div>

              {/* Delivery Rider Assignment Control */}
              {ord.fulfillmentType === "delivery" && (
                <div className="pt-2 border-t border-slate-800/80">
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[9px] uppercase font-bold text-sky-400 flex items-center gap-1">
                      <Bike className="h-3 w-3" />
                      Assigned Rider:
                    </label>
                    {ord.assignedRiderName ? (
                      <span className="text-[10px] font-bold text-emerald-300 bg-emerald-500/15 px-1.5 py-0.5 rounded border border-emerald-500/30">
                        {ord.assignedRiderName}
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold text-amber-400 bg-amber-500/15 px-1.5 py-0.5 rounded border border-amber-500/30">
                        Unassigned
                      </span>
                    )}
                  </div>
                  <select
                    value={ord.riderId || ""}
                    onChange={(e) => {
                      const rId = e.target.value;
                      if (!rId) {
                        orderStore.unassignRider(ord.id);
                      } else {
                        const matched = FLEET_RIDERS.find((r) => r.id === rId);
                        orderStore.assignRider(
                          ord.id,
                          rId,
                          matched?.riderName,
                          matched?.phone
                        );
                      }
                    }}
                    className="w-full rounded-xl border border-sky-500/30 bg-sky-950/30 px-2 py-1.5 text-xs text-sky-200 focus:border-sky-400 focus:outline-none"
                  >
                    <option value="">-- Choose Rider --</option>
                    {FLEET_RIDERS.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.riderName} ({r.vehicleNumber})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Status Quick Switch Dropdown */}
              <div className="pt-1">
                <label className="text-[9px] uppercase font-bold text-slate-400 block mb-1">
                  Change Status Live:
                </label>
                <select
                  value={
                    ord.orderStatus === "delivering" ? "out_for_delivery" :
                    ord.orderStatus === "confirmed" ? "accepted" :
                    ord.orderStatus === "pending_confirmation" || ord.orderStatus === "pending_payment" ? "pending" :
                    ord.orderStatus
                  }
                  onChange={(e) => onStatusChange(ord.id, e.target.value as OrderStatus)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-900 px-2 py-1.5 text-xs text-white focus:border-amber-500 focus:outline-none"
                >
                  <option value="pending">Pending (New)</option>
                  <option value="accepted">Accepted</option>
                  <option value="preparing">Preparing (In Kitchen)</option>
                  <option value="ready_for_dispatch">Ready for Counter / Dispatch</option>
                  <option value="out_for_delivery">Out for Delivery (Rider)</option>
                  <option value="delivered">Delivered</option>
                  <option value="picked_up">Picked Up (Counter)</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>

              {/* Primary Next Action Button */}
              {(() => {
                let actionLabel = primaryActionLabel;
                let nextStatus = primaryNextStatus;

                if (primaryNextStatus === "delivering") {
                  if (ord.fulfillmentType === "pickup") {
                    actionLabel = "Ready for Pickup 🛍️";
                    nextStatus = "ready_for_dispatch";
                  } else {
                    actionLabel = "Hand to Rider 🛵";
                    nextStatus = "out_for_delivery";
                  }
                } else if (primaryNextStatus === "delivered") {
                  if (ord.fulfillmentType === "pickup") {
                    actionLabel = "Handed Over to Customer 🤝";
                    nextStatus = "picked_up";
                  } else {
                    actionLabel = "Mark Delivered 🎉";
                    nextStatus = "delivered";
                  }
                }

                if (!actionLabel || !nextStatus) return null;

                return (
                  <div className="space-y-1.5 pt-1">
                    <button
                      type="button"
                      onClick={() => onStatusChange(ord.id, nextStatus)}
                      className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-amber-500 py-2 text-xs font-black uppercase tracking-wider text-slate-950 shadow-md hover:bg-amber-400 hover:scale-[1.02] active:scale-98 transition-all cursor-pointer"
                    >
                      <span>{actionLabel}</span>
                      <ArrowRight className="h-3.5 w-3.5" />
                    </button>

                    {showRejectAction && (
                      <button
                        type="button"
                        onClick={() => onStatusChange(ord.id, "cancelled")}
                        className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-slate-800/80 py-1.5 text-[11px] font-bold text-red-400 hover:bg-red-950/40 hover:text-red-300 transition-colors cursor-pointer"
                      >
                        <X className="h-3.5 w-3.5" />
                        <span>Reject Order</span>
                      </button>
                    )}
                  </div>
                );
              })()}

              {isCompletedColumn && (
                <div className="flex items-center justify-between pt-1 border-t border-slate-800/60">
                  <div className="flex items-center gap-1.5 text-[11px] font-bold text-emerald-400">
                    <CheckCircle2 className="h-4 w-4" />
                    <span>{ord.fulfillmentType === "pickup" ? "Picked Up (Counter)" : "Delivered"}</span>
                  </div>
                  {onDelete && (
                    <button
                      type="button"
                      onClick={() => onDelete(ord.id)}
                      className="text-[10px] text-slate-500 hover:text-red-400 font-semibold transition-colors cursor-pointer"
                    >
                      Archive / Dismiss
                    </button>
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
