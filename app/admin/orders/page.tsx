"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { 
  Volume2, VolumeX, Printer, CheckCircle2, Clock, ChefHat, Bike, 
  Check, X, Eye, Sparkles, AlertTriangle, ArrowRight, RefreshCw, 
  UtensilsCrossed, ShieldCheck, Phone, MapPin, Search
} from "lucide-react";
import { orderStore } from "@/lib/store/orderStore";
import { Order, OrderStatus } from "@/lib/types";
import { formatPKR } from "@/lib/utils";
import KitchenSlip from "@/components/admin/KitchenSlip";

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [activeReceiptModalOrder, setActiveReceiptModalOrder] = useState<Order | null>(null);
  const [printingOrder, setPrintingOrder] = useState<Order | null>(null);
  const [searchFilter, setSearchFilter] = useState("");
  const prevOrdersCountRef = useRef(0);

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
      // AudioContext could be blocked if user hasn't clicked yet
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

    return unsub;
  }, [soundEnabled]);

  const handleStatusChange = (orderId: string, nextStatus: OrderStatus) => {
    orderStore.updateOrderStatus(orderId, nextStatus);
  };

  const handleApprovePayment = (orderId: string) => {
    orderStore.updatePaymentStatus(orderId, "verified");
    setActiveReceiptModalOrder(null);
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

  const pendingOrders = filteredOrders.filter(o => o.orderStatus === "pending");
  const preparingOrders = filteredOrders.filter(o => o.orderStatus === "preparing");
  const outForDeliveryOrders = filteredOrders.filter(o => o.orderStatus === "out_for_delivery");
  const deliveredOrders = filteredOrders.filter(o => o.orderStatus === "delivered");

  const totalSales = orders
    .filter(o => o.orderStatus !== "cancelled")
    .reduce((sum, o) => sum + o.totalAmount, 0);

  return (
    <div className="min-h-screen bg-[#0a0e17] px-4 py-6 sm:px-6 space-y-6">
      {/* Top Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
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
              <p className="text-xs text-slate-400">Pizzeria D Café Real-Time Order Dispatch Board</p>
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Sound Alert Toggle with Graphic Equalizer Wave Animation */}
          <button
            onClick={() => {
              setSoundEnabled(!soundEnabled);
              if (!soundEnabled) playChime();
            }}
            className={`flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-bold transition-all border cursor-pointer hover:scale-105 active:scale-95 ${
              soundEnabled
                ? "border-amber-500/40 bg-amber-500/10 text-amber-300 shadow-sm shadow-amber-500/20"
                : "border-slate-800 bg-slate-900 text-slate-400 hover:text-white"
            }`}
          >
            {soundEnabled ? (
              <div className="flex items-center gap-1">
                <Volume2 className="h-4 w-4 text-amber-400" />
                {/* Audio visualizer wave bars */}
                <span className="flex items-end gap-0.5 h-3">
                  <span className="w-0.5 bg-amber-400 rounded-full" style={{ animation: "soundWave 0.6s infinite ease-in-out" }} />
                  <span className="w-0.5 bg-amber-400 rounded-full" style={{ animation: "soundWave 0.8s infinite ease-in-out 0.2s" }} />
                  <span className="w-0.5 bg-amber-400 rounded-full" style={{ animation: "soundWave 0.7s infinite ease-in-out 0.4s" }} />
                </span>
              </div>
            ) : (
              <VolumeX className="h-4 w-4" />
            )}
            <span>Sound Chime: {soundEnabled ? "ON" : "OFF"}</span>
          </button>

          {/* Test Chime Trigger */}
          <button
            onClick={playChime}
            className="rounded-xl border border-slate-800 bg-slate-900 px-3 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-800 hover:text-white hover:scale-105 active:scale-95 transition-all cursor-pointer"
            title="Test audio chime"
          >
            🔔 Test Ring
          </button>

          {/* Link to Menu Availability Stock Manager */}
          <Link
            href="/admin/menu"
            className="rounded-xl bg-slate-800 px-3.5 py-2 text-xs font-bold text-slate-200 hover:bg-slate-700 hover:text-white hover:scale-105 transition-all"
          >
            Manage Stock
          </Link>
        </div>
      </div>

      {/* Stats Cards with animated hover elevation */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div className="rounded-2xl border border-slate-800 bg-[#111724] p-3.5 sm:p-4 hover:border-amber-500/40 hover:-translate-y-0.5 transition-all duration-300">
          <div className="text-[11px] text-slate-400 font-medium">Active Kitchen Orders</div>
          <div className="mt-1 font-mono text-xl sm:text-2xl font-black text-amber-400">
            {pendingOrders.length + preparingOrders.length}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-[#111724] p-3.5 sm:p-4 hover:border-sky-500/40 hover:-translate-y-0.5 transition-all duration-300">
          <div className="text-[11px] text-slate-400 font-medium">Out for Delivery</div>
          <div className="mt-1 font-mono text-xl sm:text-2xl font-black text-sky-400">
            {outForDeliveryOrders.length}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-[#111724] p-3.5 sm:p-4 hover:border-emerald-500/40 hover:-translate-y-0.5 transition-all duration-300">
          <div className="text-[11px] text-slate-400 font-medium">Total Orders Today</div>
          <div className="mt-1 font-mono text-xl sm:text-2xl font-black text-emerald-400">
            {orders.length}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-[#111724] p-3.5 sm:p-4 hover:border-amber-300/40 hover:-translate-y-0.5 transition-all duration-300">
          <div className="text-[11px] text-slate-400 font-medium">Pipeline Value</div>
          <div className="mt-1 font-mono text-lg sm:text-xl font-black text-amber-300">
            {formatPKR(totalSales)}
          </div>
        </div>
      </div>

      {/* Filter / Search Bar */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-slate-400" />
        <input
          type="text"
          value={searchFilter}
          onChange={(e) => setSearchFilter(e.target.value)}
          placeholder="Filter by Order #, Customer, or Item..."
          className="w-full rounded-xl border border-slate-800 bg-[#121926] py-2 pl-10 pr-4 text-xs text-white placeholder-slate-500 focus:border-amber-500 focus:outline-none"
        />
      </div>

      {/* 4-Column Live Kanban Board */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
        {/* Column 1: New / Pending */}
        <KanbanColumn
          title="New Orders"
          badgeColor="bg-amber-500/20 text-amber-400 border-amber-500/30"
          count={pendingOrders.length}
          orders={pendingOrders}
          onStatusChange={handleStatusChange}
          onViewReceipt={(ord) => setActiveReceiptModalOrder(ord)}
          onPrint={(ord) => setPrintingOrder(ord)}
          actionLabel="Accept & Bake 👨‍🍳"
          nextStatus="preparing"
          isPendingColumn
        />

        {/* Column 2: In Kitchen / Preparing */}
        <KanbanColumn
          title="In Kitchen (Baking)"
          badgeColor="bg-red-500/20 text-red-400 border-red-500/30"
          count={preparingOrders.length}
          orders={preparingOrders}
          onStatusChange={handleStatusChange}
          onViewReceipt={(ord) => setActiveReceiptModalOrder(ord)}
          onPrint={(ord) => setPrintingOrder(ord)}
          actionLabel="Send with Rider 🛵"
          nextStatus="out_for_delivery"
        />

        {/* Column 3: Out for Delivery */}
        <KanbanColumn
          title="Out for Delivery"
          badgeColor="bg-sky-500/20 text-sky-400 border-sky-500/30"
          count={outForDeliveryOrders.length}
          orders={outForDeliveryOrders}
          onStatusChange={handleStatusChange}
          onViewReceipt={(ord) => setActiveReceiptModalOrder(ord)}
          onPrint={(ord) => setPrintingOrder(ord)}
          actionLabel="Mark Delivered ✓"
          nextStatus="delivered"
        />

        {/* Column 4: Delivered / Completed */}
        <KanbanColumn
          title="Completed"
          badgeColor="bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
          count={deliveredOrders.length}
          orders={deliveredOrders}
          onStatusChange={handleStatusChange}
          onViewReceipt={(ord) => setActiveReceiptModalOrder(ord)}
          onPrint={(ord) => setPrintingOrder(ord)}
          isCompletedColumn
        />
      </div>

      {/* Receipt & AI Verification Inspection Modal */}
      {activeReceiptModalOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-2xl rounded-3xl border border-slate-700 bg-[#121927] p-6 shadow-2xl space-y-5 animate-in zoom-in-95 duration-200">
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

      {/* Kitchen Slip Print Modal */}
      {printingOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative max-h-[90vh] overflow-y-auto rounded-3xl border border-slate-700 bg-slate-900 p-6 shadow-2xl animate-in zoom-in-95 duration-200">
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
  actionLabel?: string;
  nextStatus?: OrderStatus;
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
  actionLabel,
  nextStatus,
  isCompletedColumn,
  isPendingColumn
}: ColumnProps) {
  return (
    <div className="flex flex-col rounded-3xl border border-slate-800 bg-[#0d131f] p-4 min-h-[500px]">
      {/* Column Title */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-800">
        <h3 className="font-extrabold text-white text-sm">{title}</h3>
        <span className={`rounded-full px-2 py-0.5 text-xs font-bold border ${badgeColor}`}>
          {count}
        </span>
      </div>

      {/* Orders List */}
      <div className="mt-4 flex-1 space-y-3.5 overflow-y-auto pr-1">
        {orders.length === 0 ? (
          <div className="flex h-40 flex-col items-center justify-center text-center text-xs text-slate-500">
            <span>No orders in this stage</span>
          </div>
        ) : (
          orders.map((ord) => (
            <div
              key={ord.id}
              className={`rounded-2xl border p-4 space-y-3 transition-all duration-300 hover:shadow-xl ${
                isPendingColumn
                  ? "border-amber-500/40 bg-[#121927] hover:border-amber-500 shadow-sm shadow-amber-500/10"
                  : "border-slate-800/90 bg-[#121927] hover:border-slate-700"
              }`}
            >
              {/* Order Card Header */}
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-base font-black text-amber-400">
                      #{ord.orderNumber}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      {new Date(ord.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                  <div className="font-bold text-white text-xs mt-0.5">{ord.customerName}</div>
                </div>

                {/* Print Slip Icon Button */}
                <button
                  onClick={() => onPrint(ord)}
                  className="rounded-xl border border-slate-700 bg-slate-800 p-1.5 text-slate-300 hover:bg-amber-500 hover:text-black hover:scale-110 active:scale-95 transition-all cursor-pointer"
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

              {/* Next Stage Action Button */}
              {actionLabel && nextStatus && (
                <button
                  type="button"
                  onClick={() => onStatusChange(ord.id, nextStatus)}
                  className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-amber-500 py-2 text-xs font-black uppercase tracking-wider text-slate-950 shadow-md hover:bg-amber-400 hover:scale-[1.02] active:scale-98 transition-all cursor-pointer"
                >
                  <span>{actionLabel}</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              )}

              {isCompletedColumn && (
                <div className="flex items-center justify-center gap-1.5 py-1 text-[11px] font-bold text-emerald-400">
                  <CheckCircle2 className="h-4 w-4" />
                  <span>Delivered & Closed</span>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
