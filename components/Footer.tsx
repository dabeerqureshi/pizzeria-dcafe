import React from "react";
import Link from "next/link";
import { Phone, MapPin, Clock, ShieldCheck, Heart } from "lucide-react";

export default function Footer() {
  return (
    <footer className="mt-auto border-t border-slate-800 bg-[#0c121d] text-slate-400 text-xs">
      <div className="mx-auto max-w-7xl px-4 pt-10 pb-24 md:py-12 sm:px-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Col 1: Brand */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="text-2xl">🍕</span>
              <span className="font-black text-lg text-white tracking-tight">PIZZERIA D CAFÉ</span>
            </div>
            <p className="text-slate-400 leading-relaxed text-[11px]">
              Specialists in stuffed crust pizzas, Meltzilla Monsters, crispy brioche zingers, and loaded fries. Handcrafted with passion in Lahore.
            </p>
            <div className="flex items-center gap-3 pt-1">
              <a
                href="https://instagram.com/pizzeriadcafe"
                target="_blank"
                rel="noreferrer"
                className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-800 text-slate-300 hover:bg-pink-600 hover:text-white transition-all"
                title="Follow us on Instagram @pizzeriadcafe"
              >
                <svg className="h-4 w-4 fill-current" viewBox="0 0 24 24">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                </svg>
              </a>
              <a
                href="tel:03084382003"
                className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-800 text-slate-300 hover:bg-amber-500 hover:text-black transition-all"
              >
                <Phone className="h-4 w-4" />
              </a>
            </div>
          </div>

          {/* Col 2: Operational Rules */}
          <div className="space-y-2">
            <h5 className="font-bold uppercase tracking-wider text-white text-xs">Delivery Policy</h5>
            <ul className="space-y-1.5 text-[11px]">
              <li className="flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
                <span>Minimum Order: <strong>Rs. 1,000</strong></span>
              </li>
              <li className="flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                <span>Free Delivery on: <strong>Rs. 1,500+</strong></span>
              </li>
              <li className="flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
                <span>Standard Delivery: <strong>Rs. 100</strong></span>
              </li>
              <li className="flex items-center gap-1.5 text-amber-300/90 pt-1">
                <span>Waiting times may vary during rush hours</span>
              </li>
            </ul>
          </div>

          {/* Col 3: Contact & Location */}
          <div className="space-y-2">
            <h5 className="font-bold uppercase tracking-wider text-white text-xs">Contact & Timings</h5>
            <ul className="space-y-1.5 text-[11px]">
              <li className="flex items-center gap-2 text-slate-300">
                <Phone className="h-3.5 w-3.5 text-amber-400 shrink-0" />
                <a href="tel:03084382003" className="hover:text-amber-400">0308-4382003</a>
              </li>
              <li className="flex items-center gap-2">
                <Clock className="h-3.5 w-3.5 text-amber-400 shrink-0" />
                <span>Open Daily (Orders close at 12:00)</span>
              </li>
              <li className="flex items-center gap-2">
                <MapPin className="h-3.5 w-3.5 text-amber-400 shrink-0" />
                <span>Lahore, Pakistan</span>
              </li>
            </ul>
          </div>

          {/* Col 4: Quick Portals */}
          <div className="space-y-2">
            <h5 className="font-bold uppercase tracking-wider text-white text-xs">Staff Portals</h5>
            <ul className="space-y-2 text-[11px]">
              <li>
                <Link
                  href="/admin/orders"
                  className="inline-flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800/80 px-3 py-1.5 font-semibold text-slate-200 hover:border-red-500/50 hover:bg-slate-800"
                >
                  <span className="h-2 w-2 rounded-full bg-red-400" />
                  <span>Kitchen Kanban & POS</span>
                </Link>
              </li>
              <li>
                <Link
                  href="/kitchen"
                  className="inline-flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800/80 px-3 py-1.5 font-semibold text-slate-200 hover:border-amber-500/50 hover:bg-slate-800"
                >
                  <span className="h-2 w-2 rounded-full bg-amber-400" />
                  <span>Kitchen Display (KDS)</span>
                </Link>
              </li>
              <li>
                <Link
                  href="/rider"
                  className="inline-flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800/80 px-3 py-1.5 font-semibold text-slate-200 hover:border-sky-500/50 hover:bg-slate-800"
                >
                  <span className="h-2 w-2 rounded-full bg-sky-400" />
                  <span>Rider Dispatch Portal</span>
                </Link>
              </li>
              <li>
                <Link
                  href="/admin/menu"
                  className="inline-flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800/80 px-3 py-1.5 font-semibold text-slate-200 hover:border-amber-500/50 hover:bg-slate-800"
                >
                  <span>Stock & Sold Out Toggles</span>
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-8 border-t border-slate-800/80 pt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] text-slate-400">
          <p>© {new Date().getFullYear()} Pizzeria D Café. All rights reserved.</p>
          <p className="flex items-center gap-1">
            Built for peak operational performance with <Heart className="h-3 w-3 text-red-500 inline fill-red-500" />
          </p>
        </div>
      </div>
    </footer>
  );
}
