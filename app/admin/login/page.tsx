"use client";

import React, { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Lock, User, KeyRound, ArrowRight, ArrowLeft, ShieldCheck, Eye, EyeOff, Loader2, Sparkles, UtensilsCrossed } from "lucide-react";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnTo = searchParams.get("from") || "/admin/orders";

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        router.push(returnTo);
        router.refresh();
      } else {
        setError(data.error || "Invalid username or password.");
      }
    } catch (err: any) {
      setError("Network or server error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleFillDemo = () => {
    setUsername("admin");
    setPassword("pizzeria123");
    setError(null);
  };

  return (
    <div className="relative w-full max-w-md rounded-3xl border border-slate-800 bg-[#121927]/95 p-6 sm:p-8 shadow-2xl backdrop-blur-md">
      {/* Brand Header */}
      <div className="flex flex-col items-center text-center space-y-2 pb-6 border-b border-slate-800">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-400 via-amber-500 to-red-600 shadow-xl shadow-amber-500/20 mb-1">
          <UtensilsCrossed className="h-7 w-7 text-black stroke-[2.5]" />
        </div>
        <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
          Pizzeria D Café Staff Portal
        </h1>
        <p className="text-xs text-slate-400">
          Sign in to access Live Orders Kanban, Kitchen POS & Stock Controls.
        </p>
      </div>

      {/* Error alert */}
      {error && (
        <div className="mt-5 rounded-2xl border border-red-500/40 bg-red-950/40 p-3 text-xs text-red-300 animate-in fade-in duration-200 flex items-center gap-2">
          <Lock className="h-4 w-4 text-red-400 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <div>
          <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
            <User className="h-3.5 w-3.5 text-amber-400" />
            <span>Username</span>
          </label>
          <input
            type="text"
            required
            autoComplete="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="e.g. admin"
            className="mt-1.5 w-full rounded-xl border border-slate-700 bg-slate-900/80 px-3.5 py-2.5 text-base sm:text-xs text-white placeholder-slate-500 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
          />
        </div>

        <div>
          <label className="text-xs font-bold text-slate-300 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <KeyRound className="h-3.5 w-3.5 text-amber-400" />
              <span>Password</span>
            </span>
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="text-[11px] text-slate-400 hover:text-amber-400 flex items-center gap-1 cursor-pointer"
            >
              {showPassword ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
              <span>{showPassword ? "Hide" : "Show"}</span>
            </button>
          </label>
          <div className="relative mt-1.5">
            <input
              type={showPassword ? "text" : "password"}
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••••••"
              className="w-full rounded-xl border border-slate-700 bg-slate-900/80 px-3.5 py-2.5 text-base sm:text-xs text-white placeholder-slate-500 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500 pr-10"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="mt-2 flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-amber-500 via-amber-400 to-amber-600 py-3 text-xs font-black uppercase tracking-wider text-slate-950 shadow-xl shadow-amber-500/25 hover:from-amber-400 hover:to-amber-500 active:scale-98 transition-all cursor-pointer disabled:opacity-50"
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Signing in...</span>
            </>
          ) : (
            <>
              <span>Sign In to POS</span>
              <ArrowRight className="h-4 w-4" />
            </>
          )}
        </button>
      </form>

      {/* Quick Fill Demo Helper Button */}
      <div className="mt-5 pt-4 border-t border-slate-800 text-center space-y-3">
        <button
          type="button"
          onClick={handleFillDemo}
          className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-amber-400/90 hover:text-amber-300 hover:underline cursor-pointer"
        >
          <Sparkles className="h-3.5 w-3.5" />
          <span>Fill Default Credentials (admin / pizzeria123)</span>
        </button>

        <div>
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-300 transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Return to Customer Menu</span>
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function AdminLoginPage() {
  return (
    <div className="relative flex min-h-[calc(100vh-140px)] items-center justify-center px-4 py-12">
      {/* Background ambient lighting */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-amber-500/10 blur-[130px] pointer-events-none rounded-full" />
      <div className="absolute top-1/3 right-1/4 w-72 h-72 bg-red-600/10 blur-[100px] pointer-events-none rounded-full" />

      <Suspense fallback={
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <Loader2 className="h-4 w-4 animate-spin text-amber-400" />
          <span>Loading Staff Portal...</span>
        </div>
      }>
        <LoginForm />
      </Suspense>
    </div>
  );
}

