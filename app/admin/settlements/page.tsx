"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { 
  DollarSign, Bike, ShieldCheck, AlertCircle, ArrowLeft, 
  CheckCircle2, Clock, Calendar, FileText, ChevronRight, UserCheck
} from "lucide-react";
import { orderStore, DEMO_RIDERS } from "@/lib/store/orderStore";
import { Order, CodSettlement } from "@/lib/types";
import { formatPKR } from "@/lib/utils";

export default function CodSettlementPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [settlements, setSettlements] = useState<CodSettlement[]>([]);
  const [selectedRiderId, setSelectedRiderId] = useState<string>("r1");
  const [handedOverInput, setHandedOverInput] = useState<string>("");
  const [notesInput, setNotesInput] = useState<string>("");
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; msg: string } | null>(null);

  useEffect(() => {
    const unsub = orderStore.subscribeOrders((all) => {
      setOrders(all);
      setSettlements(orderStore.getSettlements());
    });
    return unsub;
  }, []);

  const activeRider = DEMO_RIDERS.find((r) => r.id === selectedRiderId) || DEMO_RIDERS[0];

  // Orders delivered today by this rider
  const riderDeliveredOrders = orders.filter(
    (o) =>
      o.fulfillmentType === "delivery" &&
      o.orderStatus === "delivered" &&
      (o.riderId === activeRider.id || !o.riderId)
  );

  const codOrders = riderDeliveredOrders.filter((o) => o.paymentMethod === "cod");
  const expectedCash = codOrders.reduce((sum, o) => sum + o.totalAmount, 0);

  const enteredHandedOver = parseFloat(handedOverInput) || 0;
  const currentDiscrepancy = enteredHandedOver - expectedCash;

  const handleSettleShift = (e: React.FormEvent) => {
    e.preventDefault();
    if (!handedOverInput || isNaN(parseFloat(handedOverInput))) {
      setFeedback({ type: "error", msg: "Please enter the physical cash amount handed over by the rider." });
      return;
    }

    try {
      const created = orderStore.recordSettlement({
        riderId: activeRider.id,
        riderName: activeRider.riderName,
        shiftDate: new Date().toISOString().split("T")[0],
        totalDeliveredOrders: riderDeliveredOrders.length,
        expectedCash,
        handedOverCash: enteredHandedOver,
        settledByManager: "Admin Manager",
        notes: notesInput.trim() || undefined,
      });

      setSettlements(orderStore.getSettlements());
      setHandedOverInput("");
      setNotesInput("");
      setFeedback({
        type: "success",
        msg: `Shift settled successfully for ${activeRider.riderName}! Discrepancy: ${formatPKR(created.discrepancy)}`,
      });
      setTimeout(() => setFeedback(null), 5000);
    } catch (err: any) {
      setFeedback({ type: "error", msg: err.message || "Settlement failed." });
    }
  };

  return (
    <div className="min-h-screen bg-[#070b12] text-slate-100 font-sans pb-16">
      {/* Header */}
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-slate-800 bg-[#0d1522]/95 px-4 sm:px-8 py-4 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <Link
            href="/admin/orders"
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-700 bg-slate-800 text-slate-300 hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <h1 className="text-lg font-black text-white flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-amber-400" />
              End-of-Shift COD Cash Settlements
            </h1>
            <p className="text-xs text-slate-400">Rider reconciliation & daily cash hand-in verification</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/kitchen"
            className="rounded-xl border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-bold text-slate-300 hover:bg-slate-700"
          >
            Kitchen KDS
          </Link>
          <Link
            href="/rider"
            className="rounded-xl border border-sky-500/30 bg-sky-500/10 px-3 py-1.5 text-xs font-bold text-sky-400 hover:bg-sky-500/20"
          >
            Rider Screen
          </Link>
        </div>
      </header>

      <div className="max-w-5xl mx-auto p-4 sm:p-8 space-y-6">
        {feedback && (
          <div
            className={`p-4 rounded-2xl text-xs font-bold flex items-center gap-2 ${
              feedback.type === "success"
                ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                : "bg-red-500/20 text-red-300 border border-red-500/30"
            }`}
          >
            {feedback.type === "success" ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
            {feedback.msg}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Rider Selection & Live Cash Calculation Form */}
          <div className="lg:col-span-2 space-y-5">
            <div className="rounded-2xl border border-slate-800 bg-[#0d1420] p-5 shadow-xl">
              <h2 className="text-sm font-black uppercase tracking-wider text-slate-300 mb-4 flex items-center gap-2">
                <Bike className="h-4 w-4 text-amber-400" />
                Select Rider for Settlement
              </h2>

              {/* Rider Select Pills */}
              <div className="grid grid-cols-2 gap-3 mb-5">
                {DEMO_RIDERS.map((r) => {
                  const isSelected = r.id === selectedRiderId;
                  return (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => setSelectedRiderId(r.id)}
                      className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                        isSelected
                          ? "border-amber-500 bg-amber-500/10 text-white shadow-md shadow-amber-500/10"
                          : "border-slate-800 bg-slate-900/60 text-slate-400 hover:text-white"
                      }`}
                    >
                      <p className="font-black text-xs text-white">{r.riderName}</p>
                      <p className="text-[11px] text-slate-400 mt-0.5">{r.vehicleNumber} • {r.phone}</p>
                    </button>
                  );
                })}
              </div>

              {/* Cash Reconciliation Summary */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 rounded-xl bg-black/40 border border-slate-800 mb-5">
                <div>
                  <span className="text-[11px] text-slate-400 font-medium">Delivered Orders</span>
                  <p className="text-xl font-black text-white">{riderDeliveredOrders.length}</p>
                  <p className="text-[10px] text-slate-500">COD Orders: {codOrders.length}</p>
                </div>
                <div>
                  <span className="text-[11px] text-amber-400 font-medium">Expected Cash</span>
                  <p className="text-xl font-black text-amber-400">{formatPKR(expectedCash)}</p>
                  <p className="text-[10px] text-slate-500">Calculated from slips</p>
                </div>
                <div>
                  <span className="text-[11px] text-slate-400 font-medium">Online Paid</span>
                  <p className="text-xl font-black text-emerald-400">
                    {formatPKR(
                      riderDeliveredOrders
                        .filter((o) => o.paymentMethod !== "cod")
                        .reduce((sum, o) => sum + o.totalAmount, 0)
                    )}
                  </p>
                  <p className="text-[10px] text-slate-500">No cash collected</p>
                </div>
              </div>

              {/* Form to Record Handover */}
              <form onSubmit={handleSettleShift} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    Handed-Over Cash (Rs.) <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="number"
                    value={handedOverInput}
                    onChange={(e) => setHandedOverInput(e.target.value)}
                    placeholder={`e.g. ${expectedCash}`}
                    className="w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-2.5 text-base sm:text-sm font-black text-white focus:border-amber-500 focus:outline-none"
                    required
                  />
                </div>

                {/* Live Discrepancy Indicator */}
                {handedOverInput !== "" && (
                  <div
                    className={`p-3 rounded-xl border text-xs font-bold flex items-center justify-between ${
                      currentDiscrepancy === 0
                        ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
                        : currentDiscrepancy > 0
                        ? "bg-amber-500/10 border-amber-500/30 text-amber-300"
                        : "bg-red-500/10 border-red-500/30 text-red-300"
                    }`}
                  >
                    <span>Calculated Discrepancy:</span>
                    <span className="text-sm font-black">
                      {currentDiscrepancy === 0
                        ? "Balanced (Rs. 0)"
                        : currentDiscrepancy > 0
                        ? `Excess: +${formatPKR(currentDiscrepancy)}`
                        : `Shortage: -${formatPKR(Math.abs(currentDiscrepancy))}`}
                    </span>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    Manager Settlement Notes (Optional)
                  </label>
                  <input
                    type="text"
                    value={notesInput}
                    onChange={(e) => setNotesInput(e.target.value)}
                    placeholder="e.g. Verified by night shift manager, cash locked in drawer."
                    className="w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-2 text-xs text-white focus:border-amber-500 focus:outline-none"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 font-black text-xs shadow-lg hover:brightness-110 active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  <ShieldCheck className="h-4 w-4" />
                  Confirm Cash Handover & Close Shift
                </button>
              </form>
            </div>
          </div>

          {/* Right Column: Recent Settlements Audit Log */}
          <div className="space-y-4">
            <div className="rounded-2xl border border-slate-800 bg-[#0d1420] p-5 shadow-xl">
              <h2 className="text-sm font-black uppercase tracking-wider text-slate-300 mb-4 flex items-center gap-2">
                <FileText className="h-4 w-4 text-emerald-400" />
                Settlement History Log
              </h2>

              {settlements.length === 0 ? (
                <div className="text-center p-6 text-slate-500 text-xs">
                  <Clock className="h-8 w-8 mx-auto mb-2 text-slate-700 stroke-1" />
                  No settlements recorded yet today.
                </div>
              ) : (
                <div className="space-y-3 max-h-[460px] overflow-y-auto">
                  {settlements.map((st) => (
                    <div key={st.id} className="p-3 rounded-xl bg-black/40 border border-slate-800 text-xs">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-bold text-white">{st.riderName}</span>
                        <span className="text-[10px] text-slate-400">{st.shiftDate}</span>
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-slate-300">
                        <span>Expected: {formatPKR(st.expectedCash)}</span>
                        <span>Handed: {formatPKR(st.handedOverCash)}</span>
                      </div>
                      <div className="mt-1 flex items-center justify-between border-t border-slate-800/80 pt-1 text-[11px]">
                        <span className="text-slate-500">By: {st.settledByManager}</span>
                        <span
                          className={`font-black ${
                            st.discrepancy === 0
                              ? "text-emerald-400"
                              : st.discrepancy > 0
                              ? "text-amber-400"
                              : "text-red-400"
                          }`}
                        >
                          {st.discrepancy === 0 ? "Balanced" : `${formatPKR(st.discrepancy)}`}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

