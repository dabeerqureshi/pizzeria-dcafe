"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import { ArrowDown, Sparkles, Flame, ShieldCheck, Clock, Award, Star, Pizza, Clock8 } from "lucide-react";
import { getKitchenStatus, setKitchenOverride, KitchenStatus } from "@/lib/businessHours";

export default function Hero() {
  const [kitchenStatus, setKitchenStatus] = useState<KitchenStatus>(getKitchenStatus());

  useEffect(() => {
    const updateKitchen = () => setKitchenStatus(getKitchenStatus());
    window.addEventListener("kitchen_status_changed", updateKitchen);
    updateKitchen();
    return () => window.removeEventListener("kitchen_status_changed", updateKitchen);
  }, []);

  const scrollToMenu = () => {
    document.getElementById("menu-section")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-[#0e1422] via-[#0b0f17] to-[#0b0f17] pt-8 pb-14 sm:pt-14 sm:pb-24 border-b border-slate-900">
      {/* Background ambient lighting */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-96 bg-amber-500/10 blur-[130px] pointer-events-none rounded-full" />
      <div className="absolute top-32 right-10 w-72 h-72 bg-red-600/10 blur-[100px] pointer-events-none rounded-full" />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          {/* Left Column: Headlines & Animated CTAs */}
          <div className="lg:col-span-7 space-y-6 text-center lg:text-left">
            <div className="inline-flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/10 px-4 py-1.5 text-xs font-bold text-amber-400 shadow-sm backdrop-blur-md animate-float">
              <Sparkles className="h-4 w-4 text-amber-400 animate-spin" style={{ animationDuration: "6s" }} />
              <span className="shimmer-text">Lahore&apos;s Artisanal Dough & Stuffed Crust Pioneer</span>
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight text-white leading-tight">
              Craving Real <br />
              <span className="bg-gradient-to-r from-amber-400 via-amber-300 to-red-500 bg-clip-text text-transparent drop-shadow-sm">
                Cheesy Perfection?
              </span>
            </h1>

            <p className="text-sm sm:text-base text-slate-300 max-w-xl mx-auto lg:mx-0 leading-relaxed">
              From our legendary <span className="text-amber-400 font-bold underline decoration-amber-500/40 underline-offset-4">Meltzilla Monster 10&quot; Triple Layer</span> and crown-shaped <span className="text-white font-bold">My Crust</span> to double crispy Zingers and loaded Pizza Fries. Handcrafted and delivered piping hot.
            </p>

            {!kitchenStatus.isOpen && (
              <div className="rounded-2xl border border-red-500/40 bg-red-950/40 p-3.5 text-xs text-red-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 shadow-lg">
                <div className="flex items-center gap-2.5">
                  <Clock8 className="h-4 w-4 text-red-400 shrink-0" />
                  <span>
                    <strong>Kitchen Closed for the Night:</strong> Cutoff is 12:00. Kitchen reopens daily at 12:00 PM.
                  </span>
                </div>
                <a
                  href="https://wa.me/923084382003?text=Hi%20Pizzeria%20D%20Cafe%2C%20I%20would%20like%20to%20place%20an%20advance%20order."
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-xl bg-emerald-500/20 px-3 py-1.5 text-[11px] font-bold text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500 hover:text-black transition-colors shrink-0"
                >
                  WhatsApp Advance Booking
                </a>
              </div>
            )}

            {/* Value propositions with hover lifts */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2 text-left">
              <div className="group rounded-2xl border border-slate-800 bg-[#121927]/90 p-3.5 hover:border-amber-500/40 hover:-translate-y-1 transition-all duration-300 shadow-lg">
                <div className="text-amber-400 font-black text-sm sm:text-base group-hover:scale-105 transition-transform">Rs. 1,000</div>
                <div className="text-[11px] text-slate-400 mt-0.5">Min Order for Delivery</div>
              </div>

              <div className="group rounded-2xl border border-emerald-900/40 bg-emerald-950/20 p-3.5 hover:border-emerald-500/50 hover:-translate-y-1 transition-all duration-300 shadow-lg">
                <div className="text-emerald-400 font-black text-sm sm:text-base group-hover:scale-105 transition-transform flex items-center gap-1">
                  <span>FREE Delivery</span>
                  <span className="inline-block h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5">On Orders &ge; Rs. 1,500</div>
              </div>

              <div className="col-span-2 sm:col-span-1 group rounded-2xl border border-slate-800 bg-[#121927]/90 p-3.5 hover:border-red-500/40 hover:-translate-y-1 transition-all duration-300 shadow-lg">
                <div className="text-red-400 font-black text-sm sm:text-base group-hover:scale-105 transition-transform">Zero Card Needed</div>
                <div className="text-[11px] text-slate-400 mt-0.5">COD, Easypaisa, JazzCash</div>
              </div>
            </div>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-3.5 pt-3">
              <button
                onClick={scrollToMenu}
                className="w-full sm:w-auto flex items-center justify-center gap-2.5 rounded-2xl bg-gradient-to-r from-amber-500 via-amber-400 to-amber-600 px-8 py-4 text-xs font-black uppercase tracking-wider text-slate-950 shadow-xl shadow-amber-500/25 hover:shadow-amber-500/40 hover:scale-105 active:scale-95 transition-all duration-300 cursor-pointer animate-pulse-glow"
              >
                <span>Order Online Now</span>
                <ArrowDown className="h-4 w-4 animate-bounce" />
              </button>

              <a
                href="https://wa.me/923084382003"
                target="_blank"
                rel="noreferrer"
                className="w-full sm:w-auto flex items-center justify-center gap-2.5 rounded-2xl border border-slate-700 bg-slate-900/80 px-7 py-4 text-xs font-bold text-slate-200 hover:border-emerald-500/50 hover:bg-slate-850 hover:text-white hover:scale-105 active:scale-95 transition-all duration-300"
              >
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
                </span>
                <span>WhatsApp: 0308-4382003</span>
              </a>
            </div>
          </div>

          {/* Right Column: Animated Pizza Showcase with Floating Badges */}
          <div className="lg:col-span-5 relative">
            {/* Floating Mini Badge 1: Top Right */}
            <div className="absolute -top-3 right-2 sm:-right-4 z-20 rounded-2xl border border-amber-500/40 bg-[#141d2e]/95 p-2 sm:p-3 backdrop-blur-md shadow-2xl animate-float">
              <div className="flex items-center gap-2">
                <span className="text-base sm:text-xl">👑</span>
                <div>
                  <div className="text-[9px] sm:text-[10px] font-bold text-amber-400 uppercase">Chef's Signature</div>
                  <div className="text-[11px] sm:text-xs font-black text-white">Crown Shape My Crust</div>
                </div>
              </div>
            </div>

            {/* Floating Mini Badge 2: Bottom Left (Hidden on mobile to prevent overlapping bottom price banner) */}
            <div className="hidden sm:flex absolute -bottom-4 -left-4 z-20 rounded-2xl border border-red-500/40 bg-[#141d2e]/95 p-3 backdrop-blur-md shadow-2xl animate-float-reverse">
              <div className="flex items-center gap-2">
                <Flame className="h-5 w-5 text-red-500 animate-flame" />
                <div>
                  <div className="text-[10px] font-bold text-red-400 uppercase">Triple Layer Beast</div>
                  <div className="text-xs font-black text-white">Meltzilla Monster 10&quot;</div>
                </div>
              </div>
            </div>

            {/* Main Pizza Card Container with subtle 3D tilt feel */}
            <div className="relative mx-auto w-full max-w-md aspect-square rounded-3xl overflow-hidden border-2 border-amber-500/30 bg-slate-900 shadow-2xl shadow-amber-500/15 group">
              <Image
                src="https://images.unsplash.com/photo-1513104890138-7c749659a591?w=1000&auto=format&fit=crop&q=80"
                alt="Pizzeria D Cafe Signature Artisanal Pizza"
                fill
                priority
                className="object-cover group-hover:scale-110 transition-transform duration-700 ease-out"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-transparent" />
              
              {/* Bottom Info Banner */}
              <div className="absolute bottom-2.5 left-2.5 right-2.5 sm:bottom-4 sm:left-4 sm:right-4 rounded-2xl border border-slate-700/80 bg-black/85 p-3 sm:p-4 backdrop-blur-md transition-all group-hover:border-amber-500/50">
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400">
                      House Specials
                    </span>
                    <h3 className="font-extrabold text-white text-xs sm:text-base truncate">My Crust & Chicago Dynamite</h3>
                  </div>
                  <span className="font-mono text-xs sm:text-sm font-black text-amber-400 shrink-0">
                    Rs. 1,299 / 1,799
                  </span>
                </div>
                <p className="mt-1 text-[10px] sm:text-[11px] text-slate-300 line-clamp-1 sm:line-clamp-2">
                  Two types of chicken, crown crust, fries in middle & melted mozzarella.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
