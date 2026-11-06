"use client";

import React, { useEffect, useState, useRef } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { 
  CheckCircle2, Clock, ChefHat, Bike, Home, Phone, ArrowLeft, 
  MessageSquare, Printer, ShieldCheck, Sparkles, AlertCircle, PartyPopper, Check, XCircle,
  ShoppingBag, Building, Navigation
} from "lucide-react";
import { orderStore } from "@/lib/store/orderStore";
import { Order, OrderStatus } from "@/lib/types";
import { formatPKR } from "@/lib/utils";

export default function OrderTrackingPage() {
  const params = useParams();
  const orderId = params?.id as string;
  const [order, setOrder] = useState<Order | null>(null);
  const prevStatusRef = useRef<OrderStatus | null>(null);

  const fireConfetti = async () => {
    if (typeof window === "undefined") return;
    try {
      const confetti = (await import("canvas-confetti")).default;
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

    const fetchOrder = () => {
      const found = orderStore.getOrderById(orderId);
      if (found) {
        if (prevStatusRef.current && prevStatusRef.current !== found.orderStatus) {
          // Status changed live!
          if (
            found.orderStatus === "accepted" || 
            found.orderStatus === "confirmed" || 
            found.orderStatus === "ready_for_dispatch" || 
            found.orderStatus === "delivered" ||
            found.orderStatus === "picked_up"
          ) {
            fireConfetti();
          }
        }
        prevStatusRef.current = found.orderStatus;
        setOrder(found);
      }
    };

    fetchOrder();

    const unsub = orderStore.subscribeOrders(() => {
      fetchOrder();
    });

    // Realtime listeners & heartbeat polling
    const handleCustomUpdate = () => fetchOrder();
    window.addEventListener("pizzeria_order_update", handleCustomUpdate);
    window.addEventListener("storage", handleCustomUpdate);
    const interval = setInterval(fetchOrder, 2500); // 2.5s live polling

    return () => {
      unsub();
      window.removeEventListener("pizzeria_order_update", handleCustomUpdate);
      window.removeEventListener("storage", handleCustomUpdate);
      clearInterval(interval);
    };
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

  const isPickup = order.fulfillmentType === "pickup";

  // Stepper definition based on fulfillment type
  const deliverySteps: { key: OrderStatus; label: string; icon: React.ReactNode; desc: string }[] = [
    { key: "pending", label: "Received", icon: <Clock className="h-4 w-4" />, desc: "Waiting kitchen acceptance" },
    { key: "confirmed", label: "Accepted", icon: <Check className="h-4 w-4" />, desc: "Kitchen accepted ticket" },
    { key: "preparing", label: "Baking", icon: <ChefHat className="h-4 w-4" />, desc: "Fresh in oven" },
    { key: "out_for_delivery", label: "Delivering", icon: <Bike className="h-4 w-4" />, desc: "Rider on the way" },
    { key: "delivered", label: "Delivered", icon: <Home className="h-4 w-4" />, desc: "Enjoy your hot meal!" },
  ];

  const pickupSteps: { key: OrderStatus; label: string; icon: React.ReactNode; desc: string }[] = [
    { key: "pending", label: "Received", icon: <Clock className="h-4 w-4" />, desc: "Ticket received" },
    { key: "confirmed", label: "Accepted", icon: <Check className="h-4 w-4" />, desc: "Order queued" },
    { key: "preparing", label: "Baking", icon: <ChefHat className="h-4 w-4" />, desc: "Fresh in oven" },
    { key: "ready_for_dispatch", label: "Ready", icon: <ShoppingBag className="h-4 w-4" />, desc: "Waiting at branch counter" },
    { key: "picked_up", label: "Collected", icon: <CheckCircle2 className="h-4 w-4" />, desc: "Handed over to you!" },
  ];

  const steps = isPickup ? pickupSteps : deliverySteps;

  const getStepIndex = (status: OrderStatus) => {
    switch (status) {
      case "pending":
      case "pending_confirmation":
      case "pending_payment":
        return 0;
      case "accepted":
      case "confirmed":
        return 1;
      case "preparing":
        return 2;
      case "ready_for_dispatch":
        return isPickup ? 3 : 2;
      case "delivering":
      case "out_for_delivery":
        return 3;
      case "delivered":
      case "picked_up":
        return 4;
      case "cancelled":
      case "failed_delivery":
        return -1;
      default:
        return 0;
    }
  };

  const currentStep = getStepIndex(order.orderStatus);
  const isCancelled = order.orderStatus === "cancelled" || order.orderStatus === "failed_delivery";

  // Generate WhatsApp message content for backup
  const itemsText = order.items.map(i => `${i.quantity}x ${i.itemName}${i.sizeName ? ` (${i.sizeName})` : ""}`).join("\n• ");
  const waMessage = encodeURIComponent(
    `*Pizzeria D Café - Order #${order.orderNumber} Confirmation*\n\n` +
    `*Customer:* ${order.customerName}\n` +
    `*Phone:* ${order.customerPhone}\n` +
    `*Fulfillment:* ${isPickup ? `Pickup (Code: ${order.pickupCode})` : `Delivery to: ${order.deliveryAddress}`}\n\n` +
    `*Items:*\n• ${itemsText}\n\n` +
    `*Total:* ${formatPKR(order.totalAmount)} (${order.paymentMethod === "cod" ? "Cash" : "Online Transfer"})\n` +
    `*Status:* ${order.orderStatus.toUpperCase()}`
  );

  return (
    <div className="mx-auto max-w-3xl px-3.5 py-6 sm:px-6 sm:py-8 space-y-4 sm:space-y-6">
      {/* Header Banner */}
      <div className={`rounded-3xl border p-4 sm:p-6 text-center sm:text-left flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xl transition-all ${
        isCancelled
          ? "border-red-500/50 bg-red-950/40 text-red-200"
          : "border-emerald-500/30 bg-gradient-to-r from-emerald-950/40 via-[#121a29] to-[#121a29]"
      }`}>
        <div className="flex items-center gap-4">
          <div className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border shadow-lg ${
            isCancelled
              ? "bg-red-500/20 text-red-400 border-red-500/30 shadow-red-500/10"
              : "bg-emerald-500/20 text-emerald-400 border-emerald-500/30 shadow-emerald-500/10 animate-badge-pop"
          }`}>
            {isCancelled ? <XCircle className="h-8 w-8 text-red-400" /> : <CheckCircle2 className="h-8 w-8 animate-bounce" />}
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap justify-center sm:justify-start">
              <h2 className="text-xl sm:text-2xl font-black text-white">Order #{order.orderNumber}</h2>
              <span className="rounded-full bg-slate-800 border border-slate-700 px-2.5 py-0.5 text-xs font-bold text-slate-300 uppercase">
                {isPickup ? "Pickup" : "Delivery"}
              </span>
              <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold border uppercase ${
                isCancelled
                  ? "bg-red-500/20 text-red-300 border-red-500/40"
                  : order.orderStatus === "delivered" || order.orderStatus === "picked_up"
                  ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30"
                  : "bg-amber-500/20 text-amber-300 border-amber-500/30 animate-pulse"
              }`}>
                {order.orderStatus === "ready_for_dispatch"
                  ? "Ready for Pickup"
                  : order.orderStatus === "out_for_delivery"
                  ? "Delivering"
                  : order.orderStatus}
              </span>
            </div>
            <p className="mt-0.5 text-xs text-slate-400">
              Placed on {new Date(order.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          {!isCancelled && (
            <button
              onClick={fireConfetti}
              className="flex items-center justify-center h-10 w-10 rounded-2xl border border-slate-700 bg-slate-800 text-amber-400 hover:scale-105 active:scale-95 transition-all cursor-pointer"
              title="Celebrate!"
            >
              <PartyPopper className="h-4 w-4" />
            </button>
          )}

          <a
            href={`https://wa.me/923084382003?text=${waMessage}`}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-2 rounded-2xl bg-emerald-600 px-4 py-2.5 text-xs font-black text-white hover:bg-emerald-500 hover:scale-105 shadow-md shadow-emerald-600/20 transition-all active:scale-95"
          >
            <MessageSquare className="h-4 w-4" />
            <span>WhatsApp Status</span>
          </a>
        </div>
      </div>

      {/* Pickup Code Hero Box (If Pickup order) */}
      {isPickup && !isCancelled && (
        <div className="rounded-3xl border-2 border-amber-500/50 bg-gradient-to-br from-amber-950/40 via-[#131b2c] to-[#131b2c] p-5 sm:p-6 shadow-2xl flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="space-y-1 text-center sm:text-left">
            <span className="text-xs font-black uppercase tracking-wider text-amber-400 flex items-center justify-center sm:justify-start gap-1.5">
              <ShoppingBag className="h-4 w-4" /> Counter Pickup Verification Code
            </span>
            <h3 className="text-sm text-slate-300">
              Show this 4-digit code to the cashier at Pizzeria D Café counter:
            </h3>
            <p className="text-[11px] text-slate-400">
              📍 Pizzeria D Café Lahore Main Branch • Tel: 0308-4382003
            </p>
          </div>

          <div className="rounded-2xl border border-amber-400 bg-amber-400/10 px-6 py-3 text-center shadow-lg shadow-amber-400/10">
            <span className="text-[10px] uppercase font-bold text-amber-300 tracking-wider">Pickup Code</span>
            <div className="font-mono text-3xl font-black text-amber-400 tracking-wider">
              {order.pickupCode || "P-0000"}
            </div>
          </div>
        </div>
      )}

      {/* Assigned Delivery Rider Banner (If Delivery & Assigned) */}
      {!isPickup && order.assignedRiderName && !isCancelled && (
        <div className="rounded-2xl border border-sky-500/40 bg-sky-950/20 p-4 flex items-center justify-between gap-3 shadow-lg">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-500/20 text-sky-400 font-black">
              <Bike className="h-5 w-5" />
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-sky-300">Assigned Rider</span>
              <h4 className="text-sm font-black text-white">{order.assignedRiderName}</h4>
              <p className="text-[11px] text-slate-400">Dispatched from kitchen</p>
            </div>
          </div>
          <a
            href="tel:03084382003"
            className="flex items-center gap-1.5 rounded-xl bg-sky-500 text-slate-950 px-3 py-1.5 text-xs font-black hover:bg-sky-400 transition-colors"
          >
            <Phone className="h-3.5 w-3.5" />
            <span>Call Branch</span>
          </a>
        </div>
      )}

      {/* Cancelled Notice if applicable */}
      {isCancelled && (
        <div className="rounded-3xl border border-red-500/40 bg-red-950/20 p-5 text-xs text-red-200 space-y-2">
          <div className="flex items-center gap-2 font-bold text-sm text-red-300">
            <AlertCircle className="h-4 w-4 text-red-400 shrink-0" />
            <span>Order Cancelled or Refused</span>
          </div>
          <p>
            This order could not be completed at this time. Please call our hotline <strong>0308-4382003</strong> for instant assistance.
          </p>
        </div>
      )}

      {/* Real-time 5-Step Stepper Tracker */}
      {!isCancelled && (
        <div className="rounded-3xl border border-slate-800 bg-[#121927] p-4 sm:p-6 space-y-4 sm:space-y-6 shadow-xl">
          <div className="flex items-center justify-between">
            <h3 className="font-extrabold text-white text-sm sm:text-base">Live Order Status</h3>
            <span className="flex items-center gap-1.5 text-xs font-semibold text-amber-400">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500" />
              </span>
              <span>100% Real-Time</span>
            </span>
          </div>

          {/* Stepper Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2.5 sm:gap-3">
            {steps.map((st, idx) => {
              const isCompleted = idx <= currentStep;
              const isCurrent = idx === currentStep;

              return (
                <div
                  key={st.key}
                  className={`relative flex flex-col items-center text-center p-3 rounded-2xl border transition-all duration-300 ${
                    idx === 4 ? "col-span-2 sm:col-span-1" : ""
                  } ${
                    isCurrent
                      ? "border-amber-400 bg-amber-400/10 shadow-lg shadow-amber-400/15 scale-105 animate-pulse-glow"
                      : isCompleted
                      ? "border-emerald-500/30 bg-emerald-950/20 text-slate-300"
                      : "border-slate-800/80 bg-slate-900/40 text-slate-500 opacity-50"
                  }`}
                >
                  <div className={`flex h-9 w-9 items-center justify-center rounded-xl mb-2 transition-transform ${
                    isCurrent
                      ? "bg-amber-500 text-black font-black scale-110 shadow-md"
                      : isCompleted
                      ? "bg-emerald-500/20 text-emerald-400 font-bold"
                      : "bg-slate-800 text-slate-600"
                  }`}>
                    {st.icon}
                  </div>
                  <span className="text-[11px] font-bold text-white">{st.label}</span>
                  <span className="text-[9px] text-slate-400 mt-0.5 leading-tight">{st.desc}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Order & Payment Details */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
        {/* Items List */}
        <div className="rounded-3xl border border-slate-800 bg-[#121927] p-4 sm:p-6 space-y-4 shadow-xl">
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
              <span>Fulfillment Fee ({isPickup ? "Pickup" : "Delivery"})</span>
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
            {isPickup ? "Pickup & Payment Details" : "Delivery & Payment"}
          </h4>

          <div className="space-y-2.5 text-xs text-slate-300">
            <div>
              <span className="text-[10px] uppercase font-semibold text-slate-500">
                {isPickup ? "Customer Information" : "Deliver To"}
              </span>
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
                  {order.paymentMethod === "cod"
                    ? isPickup ? "Pay at Counter (Cash)" : "Cash on Delivery (COD)"
                    : "Online Bank Transfer"}
                </span>
                <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                  order.paymentStatus === "verified" || order.paymentStatus === "paid"
                    ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                    : order.paymentStatus === "proof_submitted"
                    ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                    : "bg-slate-800 text-slate-300"
                }`}>
                  {order.paymentStatus === "verified" || order.paymentStatus === "paid"
                    ? "Paid / Verified"
                    : order.paymentStatus === "proof_submitted"
                    ? "Receipt Under Review"
                    : "Unpaid (Collect Cash)"}
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
