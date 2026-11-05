"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { 
  ArrowLeft, CheckCircle2, ShieldCheck, Upload, Copy, Check, 
  Sparkles, AlertCircle, Phone, MapPin, Building, FileText, Loader2, CreditCard, Banknote
} from "lucide-react";
import { cartStore } from "@/lib/store/cartStore";
import { orderStore } from "@/lib/store/orderStore";
import { BANK_ACCOUNTS } from "@/lib/data/menu";
import { CartItem, PaymentMethod, VerificationResult } from "@/lib/types";
import { formatPKR } from "@/lib/utils";
import { MINIMUM_ORDER_AMOUNT } from "@/lib/pricing";

export default function CheckoutPage() {
  const router = useRouter();
  const [items, setItems] = useState<CartItem[]>([]);
  const [totals, setTotals] = useState(cartStore.getTotals());

  // Form Fields
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [landmark, setLandmark] = useState("");
  const [notes, setNotes] = useState("");

  // Payment State
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("online_transfer");
  const [selectedBankId, setSelectedBankId] = useState("easypaisa");
  const [copiedBankField, setCopiedBankField] = useState<string | null>(null);

  // Receipt Upload & AI Verification
  const [receiptBase64, setReceiptBase64] = useState<string | null>(null);
  const [receiptFileName, setReceiptFileName] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [ocrResult, setOcrResult] = useState<VerificationResult | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    const unsub = cartStore.subscribe((newItems) => {
      setItems(newItems);
      setTotals(cartStore.getTotals());
    });
    return unsub;
  }, []);

  const handleCopy = (text: string, fieldId: string) => {
    navigator.clipboard.writeText(text);
    setCopiedBankField(fieldId);
    setTimeout(() => setCopiedBankField(null), 2000);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setReceiptFileName(file.name);
    setOcrResult(null);

    const reader = new FileReader();
    reader.onload = async (event) => {
      const base64 = event.target?.result as string;
      setReceiptBase64(base64);

      // Trigger automatic background verification
      await runAiVerification(base64);
    };
    reader.readAsDataURL(file);
  };

  const runAiVerification = async (base64Img: string) => {
    setIsVerifying(true);
    setFormError(null);
    try {
      const res = await fetch("/api/verify-receipt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageBase64: base64Img,
          expectedAmount: totals.total,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setOcrResult(data);
      }
    } catch {
      // verification error, staff will inspect manually
    } finally {
      setIsVerifying(false);
    }
  };

  const handleSubmitOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (items.length === 0) {
      setFormError("Your cart is empty. Please add items to proceed.");
      return;
    }

    if (totals.subtotal < MINIMUM_ORDER_AMOUNT) {
      setFormError(`Minimum order requirement is Rs. ${MINIMUM_ORDER_AMOUNT}. Please add more items.`);
      return;
    }

    if (!customerName.trim() || !customerPhone.trim() || !deliveryAddress.trim()) {
      setFormError("Please fill in your Name, Phone Number, and Delivery Address.");
      return;
    }

    if (paymentMethod === "online_transfer" && !receiptBase64) {
      setFormError("Please upload a screenshot of your bank/wallet transfer receipt.");
      return;
    }

    setIsSubmitting(true);

    try {
      const created = orderStore.addOrder({
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim(),
        deliveryAddress: deliveryAddress.trim(),
        landmark: landmark.trim() || undefined,
        subtotal: totals.subtotal,
        deliveryFee: totals.deliveryFee,
        totalAmount: totals.total,
        paymentMethod,
        paymentStatus: paymentMethod === "cod" 
          ? "unpaid" 
          : ocrResult?.matched ? "verified" : "proof_submitted",
        paymentReceiptUrl: receiptBase64 || undefined,
        verifiedTransactionId: ocrResult?.tid || undefined,
        verificationDetails: ocrResult || undefined,
        orderStatus: "pending",
        notes: notes.trim() || undefined,
        items: items.map(i => ({
          id: i.id,
          menuItemId: i.menuItemId,
          itemName: i.name,
          sizeName: i.variant?.sizeName,
          unitPrice: i.unitPrice,
          quantity: i.quantity,
          addons: i.addons,
          specialInstructions: i.specialInstructions,
        }))
      });

      // Clear Cart
      cartStore.clearCart();

      // Redirect to Order Confirmation / Tracking page
      router.push(`/order/${created.id}`);
    } catch (err) {
      setFormError("Failed to submit order. Please try again or WhatsApp us directly.");
      setIsSubmitting(false);
    }
  };

  const selectedBank = BANK_ACCOUNTS.find(b => b.id === selectedBankId) || BANK_ACCOUNTS[0];

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      {/* Back button */}
      <Link
        href="/"
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-amber-400 mb-6 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        <span>Back to Menu</span>
      </Link>

      <div className="flex flex-col lg:flex-row gap-8 items-start">
        {/* Left Column: Form Details & Payment */}
        <div className="w-full lg:w-7/12 space-y-6">
          <form onSubmit={handleSubmitOrder} className="space-y-6">
            {/* Step 1: Contact & Delivery Information */}
            <div className="rounded-3xl border border-slate-800 bg-[#121927] p-5 sm:p-6 space-y-4">
              <div className="flex items-center gap-2.5 pb-2 border-b border-slate-800">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-500/20 text-amber-400 font-black text-xs">
                  1
                </div>
                <h3 className="font-extrabold text-white text-base">Delivery Information</h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-300">
                    Full Name <span className="text-amber-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="e.g. Usman Ali"
                    className="mt-1.5 w-full rounded-xl border border-slate-700 bg-slate-900/80 px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-300">
                    Phone Number <span className="text-amber-400">*</span>
                  </label>
                  <input
                    type="tel"
                    required
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    placeholder="e.g. 0300-1234567"
                    className="mt-1.5 w-full rounded-xl border border-slate-700 bg-slate-900/80 px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300">
                  Complete Delivery Address <span className="text-amber-400">*</span>
                </label>
                <textarea
                  required
                  rows={2}
                  value={deliveryAddress}
                  onChange={(e) => setDeliveryAddress(e.target.value)}
                  placeholder="House/Apartment #, Street, Block/Phase, Area..."
                  className="mt-1.5 w-full rounded-xl border border-slate-700 bg-slate-900/80 px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-300">
                    Nearest Landmark <span className="text-[11px] text-slate-400 font-normal">(Optional)</span>
                  </label>
                  <input
                    type="text"
                    value={landmark}
                    onChange={(e) => setLandmark(e.target.value)}
                    placeholder="e.g. Near Shell pump / Jamia Mosque"
                    className="mt-1.5 w-full rounded-xl border border-slate-700 bg-slate-900/80 px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-300">
                    Delivery Notes <span className="text-[11px] text-slate-400 font-normal">(Optional)</span>
                  </label>
                  <input
                    type="text"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="e.g. Ring bell twice, leave with guard"
                    className="mt-1.5 w-full rounded-xl border border-slate-700 bg-slate-900/80 px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
                  />
                </div>
              </div>
            </div>

            {/* Step 2: Payment Method */}
            <div className="rounded-3xl border border-slate-800 bg-[#121927] p-5 sm:p-6 space-y-5">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-500/20 text-amber-400 font-black text-xs">
                    2
                  </div>
                  <h3 className="font-extrabold text-white text-base">Select Payment Method</h3>
                </div>
                <span className="text-[11px] text-slate-400">Zero Card Machine Needed</span>
              </div>

              {/* Payment Type Selector: Online Transfer vs COD */}
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setPaymentMethod("online_transfer")}
                  className={`flex flex-col items-start rounded-2xl p-4 border text-left transition-all ${
                    paymentMethod === "online_transfer"
                      ? "border-amber-500 bg-amber-500/10 text-white shadow-md shadow-amber-500/10"
                      : "border-slate-800 bg-slate-900/60 text-slate-400 hover:border-slate-700"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <CreditCard className="h-4 w-4 text-amber-400" />
                    <span className="font-bold text-xs text-white">Online Transfer</span>
                  </div>
                  <span className="text-[11px] text-slate-400 mt-1">
                    Easypaisa / JazzCash / SadaPay / Nayapay / Alfalah
                  </span>
                  <span className="mt-2 rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-semibold text-emerald-300">
                    Instant AI Verification
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentMethod("cod")}
                  className={`flex flex-col items-start rounded-2xl p-4 border text-left transition-all ${
                    paymentMethod === "cod"
                      ? "border-amber-500 bg-amber-500/10 text-white shadow-md shadow-amber-500/10"
                      : "border-slate-800 bg-slate-900/60 text-slate-400 hover:border-slate-700"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Banknote className="h-4 w-4 text-emerald-400" />
                    <span className="font-bold text-xs text-white">Cash on Delivery</span>
                  </div>
                  <span className="text-[11px] text-slate-400 mt-1">
                    Pay with cash at your doorstep upon arrival
                  </span>
                  <span className="mt-2 rounded-full bg-slate-800 px-2 py-0.5 text-[10px] font-semibold text-slate-300">
                    Standard COD
                  </span>
                </button>
              </div>

              {/* Bank Details & Receipt Upload (When Online Transfer is chosen) */}
              {paymentMethod === "online_transfer" && (
                <div className="space-y-4 rounded-2xl border border-slate-700/80 bg-slate-900/70 p-4">
                  <div>
                    <label className="text-xs font-bold text-slate-300">
                      Choose Account to Transfer To:
                    </label>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {BANK_ACCOUNTS.map((bank) => (
                        <button
                          key={bank.id}
                          type="button"
                          onClick={() => setSelectedBankId(bank.id)}
                          className={`rounded-xl px-3 py-1.5 text-xs font-bold transition-all ${
                            selectedBankId === bank.id
                              ? "bg-amber-500 text-black shadow-md shadow-amber-500/20"
                              : "border border-slate-700 bg-slate-800/80 text-slate-300 hover:bg-slate-700"
                          }`}
                        >
                          {bank.name}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Selected Account Details Box */}
                  <div className="rounded-xl border border-amber-500/30 bg-amber-950/20 p-3.5 space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-amber-300">{selectedBank.name} Account</span>
                      <span className="rounded-md bg-amber-500/20 px-2 py-0.5 text-[10px] font-mono text-amber-300">
                        {selectedBank.badge}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 font-mono text-slate-200">
                      <div className="flex items-center justify-between rounded-lg bg-black/40 px-3 py-2">
                        <div>
                          <div className="text-[10px] text-slate-400">Account Title</div>
                          <div className="font-bold">{selectedBank.accountTitle}</div>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleCopy(selectedBank.accountTitle, "title")}
                          className="text-slate-400 hover:text-white"
                        >
                          {copiedBankField === "title" ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
                        </button>
                      </div>

                      <div className="flex items-center justify-between rounded-lg bg-black/40 px-3 py-2">
                        <div>
                          <div className="text-[10px] text-slate-400">Account / Mobile #</div>
                          <div className="font-bold">{selectedBank.accountNumber}</div>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleCopy(selectedBank.accountNumber, "acc")}
                          className="text-slate-400 hover:text-white"
                        >
                          {copiedBankField === "acc" ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>

                    {selectedBank.iban && (
                      <div className="flex items-center justify-between rounded-lg bg-black/40 px-3 py-2 font-mono text-slate-200">
                        <div>
                          <div className="text-[10px] text-slate-400">IBAN</div>
                          <div className="font-bold text-[11px]">{selectedBank.iban}</div>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleCopy(selectedBank.iban!, "iban")}
                          className="text-slate-400 hover:text-white"
                        >
                          {copiedBankField === "iban" ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
                        </button>
                      </div>
                    )}

                    <p className="text-[11px] text-amber-200/80 italic pt-1">
                      {selectedBank.instruction}
                    </p>
                  </div>

                  {/* Screenshot Uploader */}
                  <div className="space-y-2 pt-1">
                    <label className="text-xs font-bold text-slate-300 flex items-center justify-between">
                      <span>Upload Transfer Screenshot <span className="text-amber-400">*</span></span>
                      <span className="text-[11px] text-slate-400 font-normal">PNG, JPG, or Screenshot</span>
                    </label>

                    <div className="relative flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-700 bg-slate-900/60 p-5 text-center hover:border-amber-500/50 transition-colors">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleFileChange}
                        className="absolute inset-0 opacity-0 cursor-pointer"
                      />
                      <Upload className="h-7 w-7 text-amber-400 mb-2" />
                      <span className="text-xs font-bold text-white">
                        {receiptFileName || "Click or Drag & Drop screenshot here"}
                      </span>
                      <span className="text-[11px] text-slate-400 mt-0.5">
                        Automatic AI Transaction ID (TID) and Amount extraction
                      </span>
                    </div>

                    {/* Screenshot Preview & OCR Output */}
                    {receiptBase64 && (
                      <div className="mt-3 rounded-2xl border border-slate-700 bg-black/40 p-3 space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-300">Screenshot Attached</span>
                          {isVerifying ? (
                            <span className="flex items-center gap-1.5 text-xs text-amber-400 font-semibold">
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              <span>Gemini OCR Verifying...</span>
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => runAiVerification(receiptBase64)}
                              className="text-[11px] font-bold text-amber-400 hover:underline flex items-center gap-1"
                            >
                              <Sparkles className="h-3 w-3" />
                              <span>Re-verify OCR</span>
                            </button>
                          )}
                        </div>

                        {/* OCR Result Badge */}
                        {ocrResult && (
                          <div className={`rounded-xl p-3 text-xs space-y-1.5 border ${
                            ocrResult.matched 
                              ? "border-emerald-500/50 bg-emerald-950/30 text-emerald-200"
                              : "border-amber-500/50 bg-amber-950/30 text-amber-200"
                          }`}>
                            <div className="flex items-center justify-between font-bold">
                              <span className="flex items-center gap-1.5">
                                {ocrResult.matched ? (
                                  <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                                ) : (
                                  <AlertCircle className="h-4 w-4 text-amber-400" />
                                )}
                                <span>{ocrResult.matched ? "Amount Verified Match!" : "Pending Manual Review"}</span>
                              </span>
                              <span className="font-mono">{ocrResult.tid ? `TID: ${ocrResult.tid}` : "TID: Extracted"}</span>
                            </div>
                            <div className="text-[11px] text-slate-300 flex justify-between">
                              <span>Extracted Amount: <strong>{ocrResult.amount ? formatPKR(ocrResult.amount) : "Detected"}</strong></span>
                              <span>Expected: <strong>{formatPKR(totals.total)}</strong></span>
                            </div>
                            {ocrResult.notes && (
                              <p className="text-[10px] text-slate-400 italic pt-0.5">{ocrResult.notes}</p>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {formError && (
              <div className="flex items-center gap-2 rounded-2xl border border-red-500/40 bg-red-950/30 p-3.5 text-xs text-red-300">
                <AlertCircle className="h-4 w-4 text-red-400 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            {/* Place Order CTA */}
            <button
              type="submit"
              disabled={isSubmitting || items.length === 0}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 py-4 text-sm font-black uppercase tracking-wider text-slate-950 shadow-xl shadow-amber-500/20 hover:from-amber-400 hover:to-amber-500 active:scale-98 transition-all disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Submitting Order...</span>
                </>
              ) : (
                <>
                  <span>Confirm Order ({formatPKR(totals.total)})</span>
                </>
              )}
            </button>
          </form>
        </div>

        {/* Right Column: Order Summary Card */}
        <div className="w-full lg:w-5/12">
          <div className="sticky top-20 rounded-3xl border border-slate-800 bg-[#121927] p-5 sm:p-6 space-y-4">
            <h3 className="font-extrabold text-white text-base pb-2 border-b border-slate-800 flex items-center justify-between">
              <span>Order Summary</span>
              <span className="text-xs font-bold text-amber-400 font-mono">
                {items.length} {items.length === 1 ? "item" : "items"}
              </span>
            </h3>

            {/* Items scroll */}
            <div className="max-h-60 overflow-y-auto space-y-3 pr-1">
              {items.map((item) => {
                const addonsSum = item.addons.reduce((sum, a) => sum + a.price, 0);
                const lineTotal = (item.unitPrice + addonsSum) * item.quantity;
                return (
                  <div key={item.id} className="flex items-start justify-between text-xs text-slate-300 border-b border-slate-800/60 pb-2.5">
                    <div>
                      <div className="font-bold text-white flex items-center gap-1.5">
                        <span className="text-amber-400">{item.quantity}x</span>
                        <span>{item.name}</span>
                      </div>
                      {item.variant && (
                        <div className="text-[11px] text-slate-400">{item.variant.sizeName}</div>
                      )}
                      {item.addons.length > 0 && (
                        <div className="text-[10px] text-amber-300/80">
                          {item.addons.map(a => `+ ${a.name}`).join(", ")}
                        </div>
                      )}
                    </div>
                    <span className="font-mono font-bold text-slate-200">
                      {formatPKR(lineTotal)}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Totals Breakdown */}
            <div className="space-y-2 pt-2 text-xs">
              <div className="flex justify-between text-slate-400">
                <span>Subtotal</span>
                <span className="font-mono text-slate-200">{formatPKR(totals.subtotal)}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Delivery Charges</span>
                <span className="font-mono">
                  {totals.deliveryFee === 0 ? (
                    <span className="font-bold text-emerald-400">FREE</span>
                  ) : (
                    <span className="text-slate-200">{formatPKR(totals.deliveryFee)}</span>
                  )}
                </span>
              </div>
              <div className="flex justify-between border-t border-slate-800 pt-3 text-base font-black text-white">
                <span>Total Amount</span>
                <span className="font-mono text-amber-400 text-lg">{formatPKR(totals.total)}</span>
              </div>
            </div>

            {/* Guarantee note */}
            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-3 text-[11px] text-slate-400 space-y-1">
              <div className="flex items-center gap-1.5 font-bold text-slate-300">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
                <span>Pizzeria D Café Promise</span>
              </div>
              <p>Fresh dough, 100% pure mozzarella, freshly prepared upon order confirmation.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

