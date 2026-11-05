"use client";

import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import confetti from "canvas-confetti";
import { 
  CheckCircle2, Clock, ChefHat, Bike, Home, Phone, ArrowLeft, 
  MessageSquare, Printer, ShieldCheck, Sparkles, AlertCircle, PartyPopper 
} from "lucide-react";
import { orderStore } from "@/lib/store/orderStore";
import { Order, OrderStatus } from "@/lib/types";
import { formatPKR } from "@/lib/utils";

export default function OrderTrackingPage() {
  const params = useParams();
  const orderId = params?.id as string;
  const [order, setOrder] = useState<Order | null>(null);

  const fireConfetti = () => {
    try {
      confetti({
        particleCount: 75,
        spread: 70,
        origin: { y: 0.6 },
        colors: ["#f59e0b", "#ef4444", "#10b981", "#ffffff"],
      });
    } catch {}
  };

  useEffect(() => {
    if (!orderId) return;

    fireConfetti();

    const unsub = orderStore.subscribeOrders((orders) => {
      const found = orders.find(o => o.id === orderId || String(o.orderNumber) === orderId);
      if (found) setOrder(found);
    });

    return unsub;
  }, [orderId]);

  if (!order) {
    return (
      <div className="mx-auto max-w-xl px-4 py-20 text-center space-y-4">
        <div className="flex h-16 w-16 mx-auto items-center justify-center rounded-3xl bg-slate-800 text-slate-400">
          <Clock className="h-8 w-8 animate-spin" />
        </div>
        <h2 className="text-xl font-bold text-white">Loading Order #{orderId}...</h2>
        <p className="text-xs text-slate-400">Fetching live status from kitchen system.</p>
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 rounded-xl bg-slate-800 px-4 py-2 text-xs font-bold text-amber-400 hover:bg-slate-700"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Return to Menu</span>
        </Link>
      </div>
    );
  }

  const steps: { key: OrderStatus; label: string; icon: React.ReactNode; desc: string }[] = [
    { key: "pending", label: "Order Received", icon: <Clock className="h-4 w-4" />, desc: "Waiting kitchen acceptance" },
    { key: "preparing", label: "In Kitchen", icon: <ChefHat className="h-4 w-4" />, desc: "Baking fresh in oven" },
    { key: "out_for_delivery", label: "Out for Delivery", icon: <Bike className="h-4 w-4" />, desc: "Rider on the way" },
    { key: "delivered", label: "Delivered", icon: <Home className="h-4 w-4" />, desc: "Enjoy your hot meal!" },
  ];

  const getStepIndex = (status: OrderStatus) => {
    switch (status) {
      case "pending": return 0;
      case "confirmed": return 0;
      case "preparing": return 1;
      case "out_for_delivery": return 2;
      case "delivered": return 3;
      default: return 0;
    }
  };

  const currentStep = getStepIndex(order.orderStatus);

  // Generate WhatsApp message content for backup
  const itemsText = order.items.map(i => `${i.quantity}x ${i.itemName}${i.sizeName ? ` (${i.sizeName})` : ""}`).join("\n• ");
  const waMessage = encodeURIComponent(
    `*Pizzeria D Café - Order #${order.orderNumber} Confirmation*\n\n` +
    `*Customer:* ${order.customerName}\n` +
    `*Phone:* ${order.customerPhone}\n` +
    `*Address:* ${order.deliveryAddress}${order.landmark ? ` (Near ${order.landmark})` : ""}\n\n` +
    `*Items:*\n• ${itemsText}\n\n` +
    `*Total:* ${formatPKR(order.totalAmount)} (${order.paymentMethod === "cod" ? "Cash on Delivery" : `Online Transfer${order.verifiedTransactionId ? ` - TID: ${order.verifiedTransactionId}` : ""}`})\n` +
    `*Order Link:* ${typeof window !== "undefined" ? window.location.href : ""}`
  );

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 space-y-6">
      {/* Header Banner with celebratory pulse */}
      <div className="rounded-3xl border border-emerald-500/30 bg-gradient-to-r from-emerald-950/40 via-[#121a29] to-[#121a29] p-6 text-center sm:text-left flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xl">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shadow-lg shadow-emerald-500/10 animate-badge-pop">
            <CheckCircle2 className="h-8 w-8 animate-bounce" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl sm:text-2xl font-black text-white">Order #{order.orderNumber}</h2>
              <span className="rounded-full bg-emerald-500/20 px-2.5 py-0.5 text-xs font-bold text-emerald-300 border border-emerald-500/30">
                Confirmed
              </span>
            </div>
            <p className="mt-0.5 text-xs text-slate-400">
              Placed on {new Date(order.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </p>
          </div>
        </div>

        {/* Buttons: WhatsApp backup & Confetti pop */}
        <div className="flex items-center gap-2">
          <button
            onClick={fireConfetti}
            className="flex items-center justify-center h-10 w-10 rounded-2xl border border-slate-700 bg-slate-800 text-amber-400 hover:scale-105 active:scale-95 transition-all cursor-pointer"
            title="Celebrate!"
          >
            <PartyPopper className="h-4 w-4" />
          </button>

          <a
            href={`https://wa.me/923084382003?text=${waMessage}`}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-2 rounded-2xl bg-emerald-600 px-4 py-2.5 text-xs font-black text-white hover:bg-emerald-500 hover:scale-105 shadow-md shadow-emerald-600/20 transition-all active:scale-95"
          >
            <MessageSquare className="h-4 w-4" />
            <span>Send on WhatsApp</span>
          </a>
        </div>
      </div>

      {/* Live Stepper Tracker */}
      <div className="rounded-3xl border border-slate-800 bg-[#121927] p-6 space-y-6 shadow-xl">
        <div className="flex items-center justify-between">
          <h3 className="font-extrabold text-white text-base">Live Kitchen Tracker</h3>
          <span className="flex items-center gap-1.5 text-xs font-semibold text-amber-400">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500" />
            </span>
            <span>Real-time Updates</span>
          </span>
        </div>

        {/* Horizontal Stepper with active progress indicator */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {steps.map((st, idx) => {
            const isCompleted = idx <= currentStep;
            const isCurrent = idx === currentStep;

            return (
              <div
                key={st.key}
                className={`relative flex flex-col items-center text-center p-3.5 rounded-2xl border transition-all duration-300 ${
                  isCurrent
                    ? "border-amber-400 bg-amber-400/10 shadow-lg shadow-amber-400/10 scale-105 animate-pulse-glow"
                    : isCompleted
                    ? "border-emerald-500/30 bg-emerald-950/20 text-slate-300"
                    : "border-slate-800/80 bg-slate-900/40 text-slate-500 opacity-60"
                }`}
              >
                <div className={`flex h-10 w-10 items-center justify-center rounded-xl mb-2 transition-transform ${
                  isCurrent
                    ? "bg-amber-500 text-black font-black scale-110 shadow-md"
                    : isCompleted
                    ? "bg-emerald-500/20 text-emerald-400"
                    : "bg-slate-800 text-slate-600"
                }`}>
                  {st.icon}
                </div>
                <span className="text-xs font-bold text-white">{st.label}</span>
                <span className="text-[10px] text-slate-400 mt-1">{st.desc}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Order & Payment Details */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Items List */}
        <div className="rounded-3xl border border-slate-800 bg-[#121927] p-6 space-y-4 shadow-xl">
          <h4 className="font-extrabold text-white text-sm pb-2 border-b border-slate-800">
            Order Items
          </h4>
          <div className="space-y-3">
            {order.items.map((i, idx) => (
              <div key={idx} className="flex justify-between text-xs text-slate-300">
                <div>
                  <div className="font-bold text-white">
                    {i.quantity}x {i.itemName}
                  </div>
                  {i.sizeName && <div className="text-[11px] text-slate-400">{i.sizeName}</div>}
                  {i.addons && i.addons.length > 0 && (
                    <div className="text-[10px] text-amber-300">
                      {i.addons.map(a => a.name).join(", ")}
                    </div>
                  )}
                  {i.specialInstructions && (
                    <div className="text-[10px] italic text-slate-400">&ldquo;{i.specialInstructions}&rdquo;</div>
                  )}
                </div>
                <div className="font-mono font-bold text-slate-200">
                  {formatPKR(i.unitPrice * i.quantity)}
                </div>
              </div>
            ))}
          </div>

          <div className="border-t border-slate-800 pt-3 space-y-1.5 text-xs">
            <div className="flex justify-between text-slate-400">
              <span>Subtotal</span>
              <span className="font-mono text-slate-200">{formatPKR(order.subtotal)}</span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>Delivery Fee</span>
              <span className="font-mono">
                {order.deliveryFee === 0 ? (
                  <span className="font-bold text-emerald-400">FREE</span>
                ) : (
                  <span className="text-slate-200">{formatPKR(order.deliveryFee)}</span>
                )}
              </span>
            </div>
            <div className="flex justify-between border-t border-slate-800 pt-2 text-sm font-black text-white">
              <span>Grand Total</span>
              <span className="font-mono text-amber-400 text-base">{formatPKR(order.totalAmount)}</span>
            </div>
          </div>
        </div>

        {/* Customer & Payment Status */}
        <div className="rounded-3xl border border-slate-800 bg-[#121927] p-6 space-y-4 shadow-xl">
          <h4 className="font-extrabold text-white text-sm pb-2 border-b border-slate-800">
            Delivery & Payment
          </h4>

          <div className="space-y-2.5 text-xs text-slate-300">
            <div>
              <span className="text-[10px] uppercase font-semibold text-slate-500">Deliver To</span>
              <div className="font-bold text-white text-sm">{order.customerName}</div>
              <div className="text-slate-400">{order.customerPhone}</div>
              <div className="text-slate-300 mt-1">{order.deliveryAddress}</div>
              {order.landmark && (
                <div className="text-[11px] text-amber-400/90 font-medium">Near: {order.landmark}</div>
              )}
            </div>

            <div className="border-t border-slate-800/80 pt-2.5">
              <span className="text-[10px] uppercase font-semibold text-slate-500">Payment Status</span>
              <div className="mt-1 flex items-center justify-between">
                <span className="font-bold text-white uppercase text-xs">
                  {order.paymentMethod === "cod" ? "Cash on Delivery (COD)" : "Online Bank Transfer"}
                </span>
                <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                  order.paymentStatus === "verified"
                    ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                    : order.paymentStatus === "proof_submitted"
                    ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                    : "bg-slate-800 text-slate-300"
                }`}>
                  {order.paymentStatus === "verified" ? "Verified" : order.paymentStatus === "proof_submitted" ? "Receipt Under Review" : "Unpaid (COD)"}
                </span>
              </div>

              {order.verifiedTransactionId && (
                <div className="mt-2 rounded-xl bg-slate-900 border border-slate-800 p-2 font-mono text-[11px] text-slate-300 flex justify-between">
                  <span>Transaction TID:</span>
                  <strong className="text-amber-400">{order.verifiedTransactionId}</strong>
                </div>
              )}
            </div>
          </div>

          <div className="pt-2">
            <Link
              href="/"
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-800 py-3 text-xs font-bold text-slate-200 hover:bg-slate-700 hover:text-white transition-all cursor-pointer"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Back to Menu / Order More</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
