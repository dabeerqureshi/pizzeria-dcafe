"use client";

import React, { useState, useEffect } from "react";
import { 
  X, Phone, Lock, User, MapPin, ArrowRight, CheckCircle2, 
  AlertCircle, Sparkles, Building, KeyRound, Loader2, ShieldCheck
} from "lucide-react";
import { customerAuthStore } from "@/lib/store/customerAuthStore";

export default function CustomerAuthModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState<"phone_input" | "login_pin" | "register_profile">("phone_input");

  // Input states
  const [phone, setPhone] = useState("");
  const [pin, setPin] = useState("");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [addressLine, setAddressLine] = useState("");
  const [landmark, setLandmark] = useState("");
  const [detectedName, setDetectedName] = useState<string | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unsub = customerAuthStore.subscribeModal((open) => {
      setIsOpen(open);
      if (open) {
        // Reset states
        setError(null);
        setPin("");
        if (!phone) setStep("phone_input");
      }
    });
    return unsub;
  }, [phone]);

  if (!isOpen) return null;

  // Step 1: Check Phone (KFC Style)
  const handleCheckPhone = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const clean = phone.replace(/[^0-9]/g, "");
    if (clean.length < 10) {
      setError("Please enter a valid Pakistani mobile number (e.g. 0308-4382003).");
      return;
    }

    setLoading(true);
    setTimeout(() => {
      const result = customerAuthStore.checkPhoneRegistered(phone);
      setLoading(false);

      if (result.isRegistered) {
        // 2nd time: Login
        setDetectedName(result.customerName || "Customer");
        setStep("login_pin");
      } else {
        // 1st time: Create Account
        setStep("register_profile");
      }
    }, 300);
  };

  // Step 2A: Login Existing User
  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (pin.length < 4) {
      setError("Please enter your 4-digit PIN.");
      return;
    }

    setLoading(true);
    setTimeout(() => {
      const res = customerAuthStore.login(phone, pin);
      setLoading(false);
      if (!res.success) {
        setError(res.error || "Login failed.");
      }
    }, 300);
  };

  // Step 2B: Register New User
  const handleRegisterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!fullName.trim()) {
      setError("Please enter your full name.");
      return;
    }
    if (pin.length < 4) {
      setError("Please create a 4-digit PIN for future logins.");
      return;
    }

    setLoading(true);
    setTimeout(() => {
      const res = customerAuthStore.register({
        phone,
        fullName,
        email,
        pin,
        addressLine,
        landmark,
      });
      setLoading(false);
      if (!res.success) {
        setError(res.error || "Registration failed.");
      }
    }, 350);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-md overflow-hidden rounded-3xl border border-amber-500/30 bg-[#0f1726] p-6 shadow-2xl shadow-black/80 animate-in zoom-in-95 duration-200"
      >
        {/* Close Button */}
        <button
          onClick={() => customerAuthStore.setAuthModalOpen(false)}
          className="absolute top-4 right-4 rounded-full bg-slate-800 p-1.5 text-slate-400 hover:text-white cursor-pointer transition-colors"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Brand Header */}
        <div className="flex items-center gap-3 mb-5">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-tr from-amber-500 to-red-600 text-slate-950 font-black shadow-lg shadow-amber-500/20 text-xl">
            🍕
          </div>
          <div>
            <h3 className="text-base font-black text-white">PIZZERIA D CAFÉ</h3>
            <p className="text-[11px] text-amber-400 font-semibold">
              KFC-Style Fast Phone Sign-In
            </p>
          </div>
        </div>

        {error && (
          <div className="mb-4 rounded-xl border border-red-500/40 bg-red-950/30 p-3 text-xs text-red-300 flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-red-400 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* STEP 1: Phone Number Input */}
        {step === "phone_input" && (
          <form onSubmit={handleCheckPhone} className="space-y-4">
            <div>
              <span className="rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider">
                Step 1 of 2
              </span>
              <h4 className="text-lg font-black text-white mt-1">Enter your Mobile Number</h4>
              <p className="text-xs text-slate-400 mt-0.5">
                New users will create an account; returning users will quickly log in.
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">
                Mobile Number <span className="text-amber-400">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-mono text-xs font-bold text-slate-400">
                  🇵🇰 +92
                </span>
                <input
                  type="tel"
                  required
                  autoFocus
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="308 4382003"
                  className="w-full rounded-xl border border-slate-700 bg-slate-900/90 pl-20 pr-4 py-3 font-mono text-sm font-bold text-white placeholder-slate-500 focus:border-amber-500 focus:outline-none"
                />
              </div>
              <p className="text-[10px] text-slate-400 mt-1.5 flex items-center gap-1.5">
                <ShieldCheck className="h-3 w-3 text-emerald-400 shrink-0" />
                <span>Fast 1-step checkout • Quick delivery address auto-fill</span>
              </p>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 font-black text-xs uppercase tracking-wider shadow-lg hover:brightness-110 active:scale-98 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <span>Continue</span>
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </form>
        )}

        {/* STEP 2A: Login Existing User */}
        {step === "login_pin" && (
          <form onSubmit={handleLoginSubmit} className="space-y-4 animate-in slide-in-from-right-4 duration-200">
            <div>
              <div className="flex items-center justify-between">
                <span className="rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 text-[10px] font-bold">
                  Existing Customer Detected
                </span>
                <button
                  type="button"
                  onClick={() => setStep("phone_input")}
                  className="text-[11px] text-amber-400 hover:underline"
                >
                  Change Number
                </button>
              </div>
              <h4 className="text-lg font-black text-white mt-1">
                Welcome back, {detectedName}! 👋
              </h4>
              <p className="text-xs text-slate-400">
                Enter your 4-digit security PIN for <strong>{phone}</strong> to place your order.
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">
                4-Digit Account PIN
              </label>
              <input
                type="password"
                maxLength={4}
                required
                autoFocus
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                placeholder="••••"
                className="w-full rounded-xl border border-slate-700 bg-slate-900/90 px-4 py-3 text-center font-mono text-2xl font-black tracking-widest text-white placeholder-slate-600 focus:border-amber-500 focus:outline-none"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 text-slate-950 font-black text-xs uppercase tracking-wider shadow-lg hover:brightness-110 active:scale-98 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <ShieldCheck className="h-4 w-4" />
                  <span>Login & Proceed to Order</span>
                </>
              )}
            </button>
          </form>
        )}

        {/* STEP 2B: Register New User (1st time) */}
        {step === "register_profile" && (
          <form onSubmit={handleRegisterSubmit} className="space-y-3.5 animate-in slide-in-from-right-4 duration-200">
            <div>
              <div className="flex items-center justify-between">
                <span className="rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30 px-2 py-0.5 text-[10px] font-bold">
                  New Customer Registration
                </span>
                <button
                  type="button"
                  onClick={() => setStep("phone_input")}
                  className="text-[11px] text-amber-400 hover:underline"
                >
                  Change Number
                </button>
              </div>
              <h4 className="text-lg font-black text-white mt-1">Create Your Account</h4>
              <p className="text-xs text-slate-400">
                One-time registration for phone: <strong>{phone}</strong>
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">
                Full Name <span className="text-amber-400">*</span>
              </label>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="e.g. Usman Ali"
                className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3.5 py-2.5 text-base sm:text-xs text-white focus:border-amber-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">
                Create 4-Digit Login PIN <span className="text-amber-400">*</span>
              </label>
              <input
                type="password"
                maxLength={4}
                required
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                placeholder="e.g. 1234"
                className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3.5 py-2 text-center font-mono text-base sm:text-base font-black tracking-widest text-white focus:border-amber-500 focus:outline-none"
              />
              <span className="text-[10px] text-slate-500">You will use this PIN next time to log in instantly.</span>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">
                Default Delivery Address in Lahore
              </label>
              <textarea
                rows={2}
                value={addressLine}
                onChange={(e) => setAddressLine(e.target.value)}
                placeholder="House #, Street, Block, Phase, Area in Lahore..."
                className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3.5 py-2 text-base sm:text-xs text-white focus:border-amber-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">
                Nearest Landmark <span className="text-[10px] text-slate-500">(Optional)</span>
              </label>
              <input
                type="text"
                value={landmark}
                onChange={(e) => setLandmark(e.target.value)}
                placeholder="e.g. Near Shell Pump / Jalal Sons"
                className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3.5 py-2 text-base sm:text-xs text-white focus:border-amber-500 focus:outline-none"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 font-black text-xs uppercase tracking-wider shadow-lg hover:brightness-110 active:scale-98 transition-all flex items-center justify-center gap-2 cursor-pointer mt-2"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4" />
                  <span>Create Account & Start Ordering</span>
                </>
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

