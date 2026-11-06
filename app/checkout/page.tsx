"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { 
  ArrowLeft, CheckCircle2, ShieldCheck, Upload, Copy, Check, 
  Sparkles, AlertCircle, Phone, MapPin, Building, FileText, Loader2, CreditCard, Banknote, Clock8,
  ChevronDown, ShoppingBag, Bike, KeyRound, ShieldAlert, User
} from "lucide-react";
import { cartStore } from "@/lib/store/cartStore";
import { orderStore } from "@/lib/store/orderStore";
import { customerAuthStore } from "@/lib/store/customerAuthStore";
import { BANK_ACCOUNTS } from "@/lib/data/menu";
import { CartItem, PaymentMethod, VerificationResult, FulfillmentType, CustomerProfile } from "@/lib/types";
import { formatPKR } from "@/lib/utils";
import { MINIMUM_ORDER_AMOUNT } from "@/lib/pricing";
import { getKitchenStatus, setKitchenOverride, KitchenStatus } from "@/lib/businessHours";

export default function CheckoutPage() {
  const router = useRouter();
  const [items, setItems] = useState<CartItem[]>([]);
  const [totals, setTotals] = useState(cartStore.getTotals());
  const [kitchenStatus, setKitchenStatus] = useState<KitchenStatus>(getKitchenStatus());
  const [customer, setCustomer] = useState<CustomerProfile | null>(customerAuthStore.getCustomer());

  // Fulfillment Choice: Delivery vs Pickup
  const [fulfillmentType, setFulfillmentType] = useState<FulfillmentType>("delivery");
  const [pickupSlot, setPickupSlot] = useState("ASAP (20-30 mins)");

  // Form Fields
  const [customerName, setCustomerName] = useState(customer?.fullName || "");
  const [customerPhone, setCustomerPhone] = useState(customer?.phone || "");
  const [deliveryAddress, setDeliveryAddress] = useState(customer?.defaultAddress || "");
  const [landmark, setLandmark] = useState(customer?.defaultLandmark || "");
  const [notes, setNotes] = useState("");

  // Payment State
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("online_transfer");
  const [selectedBankId, setSelectedBankId] = useState("easypaisa");
  const [copiedBankField, setCopiedBankField] = useState<string | null>(null);

  // COD OTP Verification State
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  const [isPhoneVerified, setIsPhoneVerified] = useState(Boolean(customer));
  const [otpDevHint, setOtpDevHint] = useState<string | null>(null);
  const [otpError, setOtpError] = useState<string | null>(null);

  // Receipt Upload & AI Verification
  const [receiptBase64, setReceiptBase64] = useState<string | null>(null);
  const [receiptFileName, setReceiptFileName] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [ocrResult, setOcrResult] = useState<VerificationResult | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [mobileSummaryOpen, setMobileSummaryOpen] = useState(false);

  // Unique session idempotency key to prevent double submissions
  const [idempotencyKey] = useState<string>(() => `idem-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`);

  useEffect(() => {
    const unsub = cartStore.subscribe((newItems) => {
      setItems(newItems);
      setTotals(cartStore.getTotals());
    });

    const unsubAuth = customerAuthStore.subscribe((c) => {
      setCustomer(c);
      if (c) {
        setCustomerName(c.fullName);
        setCustomerPhone(c.phone);
        if (c.defaultAddress) setDeliveryAddress(c.defaultAddress);
        if (c.defaultLandmark) setLandmark(c.defaultLandmark);
        setIsPhoneVerified(true);
      }
    });

    return () => {
      unsub();
      unsubAuth();
    };
  }, []);

  // When fulfillment changes to pickup, delivery fee is Rs. 0
  const effectiveDeliveryFee = fulfillmentType === "pickup" ? 0 : totals.deliveryFee;
  const effectiveTotal = totals.subtotal + effectiveDeliveryFee;

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
          expectedAmount: effectiveTotal,
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

  // OTP Handlers for COD fraud protection
  const handleSendOtp = async () => {
    if (!customerPhone.trim() || customerPhone.trim().length < 10) {
      setOtpError("Please enter your phone number first.");
      return;
    }
    setOtpError(null);
    setIsSendingOtp(true);
    try {
      const res = await fetch("/api/checkout/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: customerPhone.trim() }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setOtpError(data.error || "Failed to dispatch code.");
      } else {
        setOtpSent(true);
        if (data.devHintCode) {
          setOtpDevHint(data.devHintCode);
          setOtpCode(data.devHintCode); // Auto-fill for convenience
        }
      }
    } catch {
      setOtpError("Network error. Please try again.");
    } finally {
      setIsSendingOtp(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!otpCode.trim() || otpCode.trim().length !== 4) {
      setOtpError("Please enter the 4-digit code.");
      return;
    }
    setOtpError(null);
    setIsVerifyingOtp(true);
    try {
      const res = await fetch("/api/checkout/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: customerPhone.trim(), code: otpCode.trim() }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setOtpError(data.error || "Incorrect verification code.");
      } else {
        setIsPhoneVerified(true);
        setOtpSent(false);
      }
    } catch {
      setOtpError("Network error. Please try again.");
    } finally {
      setIsVerifyingOtp(false);
    }
  };

  const handleSubmitOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    // KFC Style Customer Account Enforced
    if (!customer) {
      setFormError("Account required: Please log in or create an account to complete your order.");
      customerAuthStore.setAuthModalOpen(true);
      return;
    }

    if (!kitchenStatus.isOpen) {
      setFormError("Orders are not accepted after 12:00 as per Pizzeria D Café operational rules. Kitchen is currently closed.");
      return;
    }

    if (items.length === 0) {
      setFormError("Your cart is empty. Please add items to proceed.");
      return;
    }

    if (fulfillmentType === "delivery" && totals.subtotal < MINIMUM_ORDER_AMOUNT) {
      setFormError(`Minimum delivery order is Rs. ${MINIMUM_ORDER_AMOUNT}. Please add more items or choose Pickup.`);
      return;
    }

    if (!customerName.trim() || !customerPhone.trim()) {
      setFormError("Please fill in your Name and Phone Number.");
      return;
    }

    if (fulfillmentType === "delivery" && !deliveryAddress.trim()) {
      setFormError("Please enter your complete delivery address in Lahore.");
      return;
    }

    // COD Fraud Verification Gate
    if (paymentMethod === "cod" && !isPhoneVerified) {
      setFormError("Please verify your phone number via OTP to place a Cash on Delivery order.");
      return;
    }

    if (paymentMethod === "online_transfer" && !receiptBase64) {
      setFormError("Please upload a screenshot of your bank/wallet transfer receipt.");
      return;
    }

    setIsSubmitting(true);

    try {
      // 1. Submit through Server Pricing & Idempotency Endpoint
      const res = await fetch("/api/checkout/create-order", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": idempotencyKey,
        },
        body: JSON.stringify({
          customerName: customerName.trim(),
          customerPhone: customerPhone.trim(),
          fulfillmentType,
          deliveryAddress: fulfillmentType === "delivery" ? deliveryAddress.trim() : "Pizzeria D Café Lahore (Counter Pickup)",
          landmark: landmark.trim() || undefined,
          scheduledFor: fulfillmentType === "pickup" ? pickupSlot : "ASAP (35-45 mins)",
          paymentMethod,
          notes: notes.trim() || undefined,
          items: items.map((i) => ({
            menuItemId: i.menuItemId,
            sizeName: i.variant?.sizeName,
            quantity: i.quantity,
            addons: i.addons,
          })),
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to process order.");
      }

      const serverOrder = data.order;

      // 2. Add to Local Reactive Store so Kitchen, Admin & Customer see it immediately
      const created = orderStore.addOrder({
        idempotencyKey,
        customerName: serverOrder.customerName,
        customerPhone: serverOrder.customerPhone,
        fulfillmentType,
        deliveryAddress: serverOrder.deliveryAddress,
        landmark: serverOrder.landmark,
        pickupCode: serverOrder.pickupCode,
        scheduledFor: serverOrder.scheduledFor,
        subtotal: serverOrder.subtotal,
        deliveryFee: serverOrder.deliveryFee,
        totalAmount: serverOrder.totalAmount,
        paymentMethod,
        paymentStatus: paymentMethod === "cod" 
          ? "unpaid" 
          : ocrResult?.matched ? "verified" : "proof_submitted",
        paymentReceiptUrl: receiptBase64 || undefined,
        verifiedTransactionId: ocrResult?.tid || undefined,
        verificationDetails: ocrResult || undefined,
        orderStatus: serverOrder.orderStatus,
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
    } catch (err: any) {
      setFormError(err?.message || "Failed to submit order. Please try again or call us at 0308-4382003.");
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
          {!kitchenStatus.isOpen && (
            <div className="rounded-2xl border border-red-500/50 bg-red-950/40 p-4 text-xs text-red-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-lg">
              <div className="flex items-center gap-2.5">
                <Clock8 className="h-5 w-5 text-red-400 shrink-0 animate-pulse" />
                <div>
                  <strong>Kitchen Currently Closed:</strong> No orders accepted after 12:00 cutoff.
                  <p className="text-[11px] text-red-300 mt-0.5">Please WhatsApp us at 0308-4382003 for advance bookings.</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setKitchenOverride("forced_open");
                  setKitchenStatus(getKitchenStatus());
                }}
                className="rounded-xl bg-amber-500/20 px-3 py-1.5 text-xs font-bold text-amber-300 border border-amber-500/40 hover:bg-amber-500 hover:text-black transition-colors shrink-0"
              >
                ⚡ Test Mode: Open
              </button>
            </div>
          )}

          {/* Fulfillment Choice Tabs (Delivery vs. Pickup) */}
          <div className="rounded-3xl border border-slate-800 bg-[#121927] p-2 flex gap-2">
            <button
              type="button"
              onClick={() => setFulfillmentType("delivery")}
              className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl text-xs font-black transition-all cursor-pointer ${
                fulfillmentType === "delivery"
                  ? "bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 shadow-lg shadow-amber-500/20"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <Bike className="h-4 w-4" />
              <span>Doorstep Delivery (Lahore)</span>
            </button>
            <button
              type="button"
              onClick={() => setFulfillmentType("pickup")}
              className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl text-xs font-black transition-all cursor-pointer ${
                fulfillmentType === "pickup"
                  ? "bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 shadow-lg shadow-amber-500/20"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <ShoppingBag className="h-4 w-4" />
              <span>Branch Pickup (Free)</span>
            </button>
          </div>

          {/* Mobile Quick Order Summary Accordion */}
          <div className="lg:hidden rounded-2xl border border-slate-800 bg-[#121927] p-3.5 shadow-md">
            <button
              type="button"
              onClick={() => setMobileSummaryOpen(!mobileSummaryOpen)}
              className="flex w-full items-center justify-between text-xs font-bold text-white cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <ShoppingBag className="h-4 w-4 text-amber-400" />
                <span>{mobileSummaryOpen ? "Hide Order Summary" : "Show Order Summary"}</span>
                <span className="text-[11px] text-slate-400 font-mono">({items.length} items)</span>
              </div>
              <div className="flex items-center gap-1.5 font-mono text-amber-400 font-black">
                <span>{formatPKR(effectiveTotal)}</span>
                <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${mobileSummaryOpen ? "rotate-180" : ""}`} />
              </div>
            </button>
            {mobileSummaryOpen && (
              <div className="mt-3 pt-3 border-t border-slate-800 space-y-2 text-xs animate-in fade-in duration-200">
                {items.map((i) => (
                  <div key={i.id} className="flex justify-between text-slate-300">
                    <span className="font-medium">{i.quantity}x {i.name}</span>
                    <span className="font-mono text-slate-200">{formatPKR(i.unitPrice * i.quantity)}</span>
                  </div>
                ))}
                <div className="flex justify-between border-t border-slate-800/80 pt-2 text-slate-400">
                  <span>Delivery Fee:</span>
                  <span className="font-mono font-bold text-emerald-400">
                    {effectiveDeliveryFee === 0 ? "FREE" : formatPKR(effectiveDeliveryFee)}
                  </span>
                </div>
              </div>
            )}
          </div>

          <form onSubmit={handleSubmitOrder} className="space-y-6">
            {/* Step 1: Customer & Fulfillment Details */}
            <div className="rounded-3xl border border-slate-800 bg-[#121927] p-5 sm:p-6 space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-500/20 text-amber-400 font-black text-xs">
                    1
                  </div>
                  <h3 className="font-extrabold text-white text-base">
                    {fulfillmentType === "delivery" ? "Delivery Information" : "Pickup Information"}
                  </h3>
                </div>
                {customer && (
                  <button
                    type="button"
                    onClick={() => customerAuthStore.setAuthModalOpen(true)}
                    className="text-[11px] font-bold text-amber-400 hover:underline cursor-pointer"
                  >
                    Switch Account
                  </button>
                )}
              </div>

              {/* KFC App Style: Account Gate Banner */}
              {!customer ? (
                <div className="rounded-2xl border-2 border-dashed border-amber-500/40 bg-gradient-to-r from-amber-500/10 to-red-500/10 p-4 sm:p-5 text-center space-y-2.5">
                  <div className="flex h-11 w-11 mx-auto items-center justify-center rounded-2xl bg-gradient-to-tr from-amber-500 to-red-600 text-slate-950 font-black shadow-lg shadow-amber-500/20">
                    <User className="h-6 w-6" />
                  </div>
                  <div>
                    <h4 className="font-black text-white text-sm sm:text-base">
                      Customer Account Required (KFC Style)
                    </h4>
                    <p className="text-xs text-slate-300 mt-0.5 max-w-md mx-auto">
                      <strong>First time?</strong> Create your account in 30 seconds.
                      <br />
                      <strong>2nd time onwards?</strong> Enter your phone number to login and place order.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => customerAuthStore.setAuthModalOpen(true)}
                    className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 font-black text-xs uppercase tracking-wider shadow-lg hover:scale-105 active:scale-95 transition-all cursor-pointer inline-flex items-center gap-2"
                  >
                    <User className="h-4 w-4" />
                    <span>Login or Create Account with Mobile</span>
                  </button>
                </div>
              ) : (
                <div className="flex items-center justify-between p-3 rounded-2xl border border-emerald-500/30 bg-emerald-950/20 text-xs">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-400 font-bold">
                      <CheckCircle2 className="h-4 w-4" />
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-bold text-emerald-400">Logged in Customer</span>
                      <h4 className="font-black text-white">{customer.fullName} ({customer.phone})</h4>
                    </div>
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono">1-Tap Fast Checkout</span>
                </div>
              )}

              {/* Saved Address Quick Selector (For Returning Customers) */}
              {customer && customer.addresses && customer.addresses.length > 0 && fulfillmentType === "delivery" && (
                <div className="space-y-1.5 pt-1">
                  <label className="text-xs font-bold text-slate-300">
                    Select from Saved Addresses:
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {customer.addresses.map((addr) => {
                      const isSelected = deliveryAddress === addr.addressLine;
                      return (
                        <button
                          key={addr.id}
                          type="button"
                          onClick={() => {
                            setDeliveryAddress(addr.addressLine);
                            if (addr.landmark) setLandmark(addr.landmark);
                          }}
                          className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                            isSelected
                              ? "bg-amber-500 text-slate-950 border-amber-500 shadow-sm"
                              : "bg-slate-900 border-slate-700 text-slate-300 hover:border-slate-500"
                          }`}
                        >
                          <MapPin className="h-3.5 w-3.5 text-red-400" />
                          <span>{addr.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

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
                    className="mt-1.5 w-full rounded-xl border border-slate-700 bg-slate-900/80 px-3.5 py-2.5 text-base sm:text-xs text-white placeholder-slate-500 focus:border-amber-500 focus:outline-none"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-300">
                      Phone Number <span className="text-amber-400">*</span>
                    </label>
                    {isPhoneVerified && (
                      <span className="text-[10px] text-emerald-400 font-bold flex items-center gap-1">
                        <CheckCircle2 className="h-3 w-3" /> Verified
                      </span>
                    )}
                  </div>
                  <input
                    type="tel"
                    required
                    value={customerPhone}
                    onChange={(e) => {
                      setCustomerPhone(e.target.value);
                      setIsPhoneVerified(false); // Reset if changed
                    }}
                    placeholder="e.g. 0308-4382003"
                    className="mt-1.5 w-full rounded-xl border border-slate-700 bg-slate-900/80 px-3.5 py-2.5 text-base sm:text-xs text-white placeholder-slate-500 focus:border-amber-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Delivery specific fields */}
              {fulfillmentType === "delivery" ? (
                <>
                  <div>
                    <label className="text-xs font-bold text-slate-300">
                      Complete Delivery Address <span className="text-amber-400">*</span>
                    </label>
                    <textarea
                      required
                      rows={2}
                      value={deliveryAddress}
                      onChange={(e) => setDeliveryAddress(e.target.value)}
                      placeholder="House/Apartment #, Street, Block/Phase, Area in Lahore..."
                      className="mt-1.5 w-full rounded-xl border border-slate-700 bg-slate-900/80 px-3.5 py-2.5 text-base sm:text-xs text-white placeholder-slate-500 focus:border-amber-500 focus:outline-none"
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
                        className="mt-1.5 w-full rounded-xl border border-slate-700 bg-slate-900/80 px-3.5 py-2.5 text-base sm:text-xs text-white placeholder-slate-500 focus:border-amber-500 focus:outline-none"
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
                        className="mt-1.5 w-full rounded-xl border border-slate-700 bg-slate-900/80 px-3.5 py-2.5 text-base sm:text-xs text-white placeholder-slate-500 focus:border-amber-500 focus:outline-none"
                      />
                    </div>
                  </div>
                </>
              ) : (
                /* Pickup specific fields */
                <div className="space-y-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 p-4">
                  <div className="flex items-start gap-3">
                    <Building className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-extrabold text-white text-xs">Pizzeria D Café - Main Lahore Branch</h4>
                      <p className="text-[11px] text-slate-300 mt-0.5">
                        Lahore, Pakistan • Phone: 0308-4382003
                      </p>
                      <p className="text-[10px] text-amber-400 font-bold mt-1">
                        ✨ Ready for counter collection with zero delivery charges.
                      </p>
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-300 block mb-1">
                      Choose Pickup Time Slot:
                    </label>
                    <select
                      value={pickupSlot}
                      onChange={(e) => setPickupSlot(e.target.value)}
                      className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3.5 py-2 text-xs text-white font-bold focus:border-amber-500 focus:outline-none"
                    >
                      <option value="ASAP (20-30 mins)">ASAP (20-30 mins)</option>
                      <option value="In 45 mins">In 45 mins</option>
                      <option value="In 1 hour">In 1 hour</option>
                      <option value="In 1.5 hours">In 1.5 hours</option>
                    </select>
                  </div>
                </div>
              )}
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
                <span className="text-[11px] text-slate-400">COD & Bank Transfer</span>
              </div>

              {/* Payment Type Selector: Online Transfer vs COD */}
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setPaymentMethod("online_transfer")}
                  className={`flex flex-col items-start rounded-2xl p-4 border text-left transition-all cursor-pointer ${
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
                    Easypaisa / JazzCash / Nayapay / Banks
                  </span>
                  <span className="mt-2 rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-semibold text-emerald-300">
                    Instant AI Verification
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentMethod("cod")}
                  className={`flex flex-col items-start rounded-2xl p-4 border text-left transition-all cursor-pointer ${
                    paymentMethod === "cod"
                      ? "border-amber-500 bg-amber-500/10 text-white shadow-md shadow-amber-500/10"
                      : "border-slate-800 bg-slate-900/60 text-slate-400 hover:border-slate-700"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Banknote className="h-4 w-4 text-emerald-400" />
                    <span className="font-bold text-xs text-white">
                      {fulfillmentType === "pickup" ? "Pay at Counter" : "Cash on Delivery"}
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-400 mt-1">
                    {fulfillmentType === "pickup" ? "Pay cash when picking up" : "Pay with cash at your doorstep"}
                  </span>
                  <span className="mt-2 rounded-full bg-slate-800 px-2 py-0.5 text-[10px] font-semibold text-slate-300">
                    OTP Protected
                  </span>
                </button>
              </div>

              {/* COD OTP Phone Verification Module */}
              {paymentMethod === "cod" && (
                <div className="rounded-2xl border border-amber-500/30 bg-amber-950/20 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <KeyRound className="h-4 w-4 text-amber-400" />
                      <span className="text-xs font-black text-amber-300">Phone Verification (Anti-Fraud)</span>
                    </div>
                    {isPhoneVerified && (
                      <span className="rounded-full bg-emerald-500/20 border border-emerald-500/30 px-2.5 py-0.5 text-[10px] font-bold text-emerald-400">
                        Phone Verified ✓
                      </span>
                    )}
                  </div>

                  {!isPhoneVerified ? (
                    <div>
                      <p className="text-[11px] text-slate-300 mb-2">
                        To protect against fake orders, a 4-digit verification code is sent to your phone.
                      </p>

                      {!otpSent ? (
                        <button
                          type="button"
                          onClick={handleSendOtp}
                          disabled={isSendingOtp}
                          className="w-full py-2.5 rounded-xl bg-amber-500 text-slate-950 font-black text-xs hover:bg-amber-400 transition-colors cursor-pointer flex items-center justify-center gap-2"
                        >
                          {isSendingOtp ? <Loader2 className="h-4 w-4 animate-spin" /> : <Phone className="h-4 w-4" />}
                          Send 4-Digit Verification Code
                        </button>
                      ) : (
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <input
                              type="text"
                              maxLength={4}
                              value={otpCode}
                              onChange={(e) => setOtpCode(e.target.value)}
                              placeholder="4-digit code"
                              className="flex-1 rounded-xl border border-slate-700 bg-slate-900 px-3.5 py-2 text-center font-mono text-base font-black tracking-widest text-white focus:border-amber-500 focus:outline-none"
                            />
                            <button
                              type="button"
                              onClick={handleVerifyOtp}
                              disabled={isVerifyingOtp}
                              className="px-4 py-2 rounded-xl bg-emerald-500 text-slate-950 font-black text-xs hover:bg-emerald-400 transition-colors cursor-pointer"
                            >
                              {isVerifyingOtp ? "Verifying..." : "Verify Code"}
                            </button>
                          </div>
                          {otpDevHint && (
                            <p className="text-[10px] text-amber-300 font-mono">
                              [Test Mode Code: {otpDevHint}]
                            </p>
                          )}
                        </div>
                      )}

                      {otpError && (
                        <p className="text-[11px] text-red-400 font-medium mt-1.5 flex items-center gap-1">
                          <AlertCircle className="h-3.5 w-3.5" />
                          {otpError}
                        </p>
                      )}
                    </div>
                  ) : (
                    <p className="text-xs text-emerald-400 font-semibold">
                      Your phone is verified! You can now place this order.
                    </p>
                  )}
                </div>
              )}

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
                          className={`rounded-xl px-3 py-1.5 text-xs font-bold transition-all cursor-pointer ${
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
                          className="text-slate-400 hover:text-white cursor-pointer"
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
                          className="text-slate-400 hover:text-white cursor-pointer"
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
                          className="text-slate-400 hover:text-white cursor-pointer"
                        >
                          {copiedBankField === "iban" ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Upload Screenshot */}
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-300">
                      Upload Payment Screenshot <span className="text-amber-400">*</span>
                    </label>
                    <label className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-700 bg-slate-900/60 p-5 text-center hover:border-amber-500/60 transition-colors cursor-pointer">
                      <Upload className="h-6 w-6 text-amber-400 mb-2" />
                      <span className="text-xs font-semibold text-slate-200">
                        {receiptFileName ? receiptFileName : "Tap to upload receipt screenshot"}
                      </span>
                      <span className="text-[10px] text-slate-400 mt-1">PNG, JPG, or PDF (Max 5MB)</span>
                      <input
                        type="file"
                        accept="image/*,application/pdf"
                        onChange={handleFileChange}
                        className="hidden"
                      />
                    </label>

                    {/* AI Verification Status Card */}
                    {isVerifying && (
                      <div className="rounded-xl border border-sky-500/30 bg-sky-950/20 p-3 text-xs flex items-center gap-2.5 text-sky-200">
                        <Loader2 className="h-4 w-4 animate-spin text-sky-400 shrink-0" />
                        <span>AI verifying transaction ID, timestamp, and amount...</span>
                      </div>
                    )}

                    {ocrResult && (
                      <div className={`rounded-xl border p-3.5 text-xs space-y-1.5 ${
                        ocrResult.matched 
                          ? "border-emerald-500/40 bg-emerald-950/30 text-emerald-200" 
                          : "border-amber-500/40 bg-amber-950/30 text-amber-200"
                      }`}>
                        <div className="flex items-center justify-between font-bold">
                          <span className="flex items-center gap-1.5">
                            {ocrResult.matched ? <ShieldCheck className="h-4 w-4 text-emerald-400" /> : <AlertCircle className="h-4 w-4 text-amber-400" />}
                            {ocrResult.matched ? "AI Verified Payment!" : "Manual Review Required"}
                          </span>
                          {ocrResult.tid && <span className="font-mono text-[11px]">TID: {ocrResult.tid}</span>}
                        </div>
                        {ocrResult.notes && <p className="text-[11px] opacity-90">{ocrResult.notes}</p>}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {formError && (
              <div className="rounded-2xl border border-red-500/50 bg-red-950/30 p-3.5 text-xs text-red-300 flex items-center gap-2 shadow-lg">
                <AlertCircle className="h-4 w-4 text-red-400 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting || !kitchenStatus.isOpen}
              className="w-full py-4 rounded-2xl bg-gradient-to-r from-amber-500 via-amber-400 to-red-600 text-slate-950 font-black text-sm uppercase tracking-wider shadow-xl shadow-amber-500/20 hover:brightness-110 active:scale-[0.98] transition-all disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  <span>Placing Order...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-5 w-5" />
                  <span>
                    Confirm & Place Order ({formatPKR(effectiveTotal)})
                  </span>
                </>
              )}
            </button>
          </form>
        </div>

        {/* Right Column: Sticky Order Summary on Laptop/Desktop */}
        <div className="w-full lg:w-5/12 hidden lg:block lg:sticky lg:top-24">
          <div className="rounded-3xl border border-slate-800 bg-[#121927] p-6 shadow-xl space-y-4">
            <h3 className="font-extrabold text-white text-base border-b border-slate-800 pb-3 flex items-center justify-between">
              <span>Order Summary</span>
              <span className="text-xs font-mono text-amber-400">{items.length} items</span>
            </h3>

            {/* Cart Items List */}
            <div className="space-y-3 max-h-[360px] overflow-y-auto pr-1">
              {items.map((i) => (
                <div key={i.id} className="flex items-start justify-between text-xs pb-3 border-b border-slate-800/60">
                  <div>
                    <span className="font-bold text-white">{i.quantity}x {i.name}</span>
                    {i.variant && (
                      <p className="text-[11px] text-slate-400">Size: {i.variant.sizeName}</p>
                    )}
                    {i.addons && i.addons.length > 0 && (
                      <div className="text-[10px] text-amber-300">
                        {i.addons.map((a) => `+ ${a.name} (Rs. ${a.price})`).join(", ")}
                      </div>
                    )}
                  </div>
                  <span className="font-mono text-slate-200 font-bold">
                    {formatPKR(i.unitPrice * i.quantity)}
                  </span>
                </div>
              ))}
            </div>

            {/* Financials Calculation */}
            <div className="space-y-2 pt-2 text-xs text-slate-300">
              <div className="flex justify-between">
                <span>Subtotal:</span>
                <span className="font-mono">{formatPKR(totals.subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span>Fulfillment:</span>
                <span className="font-bold text-white capitalize">{fulfillmentType}</span>
              </div>
              <div className="flex justify-between">
                <span>Delivery Charges:</span>
                <span className="font-mono text-emerald-400 font-bold">
                  {effectiveDeliveryFee === 0 ? "FREE" : formatPKR(effectiveDeliveryFee)}
                </span>
              </div>
              <div className="flex justify-between border-t border-slate-800 pt-3 text-sm font-black text-white">
                <span>Total Amount:</span>
                <span className="font-mono text-amber-400 text-base">{formatPKR(effectiveTotal)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
