"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, Check, X, Search, Sparkles, AlertCircle } from "lucide-react";
import { MENU_ITEMS, CATEGORIES } from "@/lib/data/menu";
import { orderStore } from "@/lib/store/orderStore";
import { formatPKR } from "@/lib/utils";

export default function AdminMenuPage() {
  const [stockMap, setStockMap] = useState<Record<string, boolean>>({});
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");

  useEffect(() => {
    const unsub = orderStore.subscribeStock((map) => {
      setStockMap(map);
    });
    return unsub;
  }, []);

  const handleToggle = (itemId: string, currentAvailable: boolean) => {
    orderStore.toggleItemStock(itemId, !currentAvailable);
  };

  const filteredItems = MENU_ITEMS.filter((item) => {
    const matchesCat = selectedCategory === "all" || item.categoryId === selectedCategory;
    const matchesSearch = item.name.toLowerCase().includes(search.toLowerCase());
    return matchesCat && matchesSearch;
  });

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <Link
            href="/admin/orders"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-amber-400 mb-2 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back to Kitchen Kanban</span>
          </Link>
          <h1 className="text-2xl font-black text-white">Menu Stock & Availability Manager</h1>
          <p className="text-xs text-slate-400">
            Quickly toggle items to &quot;Sold Out&quot; during peak rush to stop customer orders immediately.
          </p>
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search item to toggle..."
            className="w-full rounded-xl border border-slate-800 bg-[#121926] py-2 pl-10 pr-4 text-xs text-white placeholder-slate-500 focus:border-amber-500 focus:outline-none"
          />
        </div>
      </div>

      {/* Category selector */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
        <button
          onClick={() => setSelectedCategory("all")}
          className={`shrink-0 rounded-xl px-3 py-1.5 text-xs font-bold transition-all ${
            selectedCategory === "all"
              ? "bg-amber-500 text-black shadow-md shadow-amber-500/20"
              : "border border-slate-800 bg-[#121926] text-slate-300 hover:bg-slate-800"
          }`}
        >
          All Items ({MENU_ITEMS.length})
        </button>
        {CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setSelectedCategory(cat.slug)}
            className={`shrink-0 rounded-xl px-3 py-1.5 text-xs font-bold transition-all ${
              selectedCategory === cat.slug
                ? "bg-amber-500 text-black shadow-md shadow-amber-500/20"
                : "border border-slate-800 bg-[#121926] text-slate-300 hover:bg-slate-800"
            }`}
          >
            {cat.name}
          </button>
        ))}
      </div>

      {/* Table / Grid */}
      <div className="rounded-3xl border border-slate-800 bg-[#121927] overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-[#141e30] border-b border-slate-800 text-[11px] uppercase font-bold text-slate-400">
              <tr>
                <th className="py-3.5 px-4">Item</th>
                <th className="py-3.5 px-4">Category</th>
                <th className="py-3.5 px-4">Base Price</th>
                <th className="py-3.5 px-4 text-center">Status</th>
                <th className="py-3.5 px-4 text-right">Quick Stock Toggle</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {filteredItems.map((item) => {
                const isAvailable = stockMap[item.id] !== false && item.isAvailable;

                return (
                  <tr key={item.id} className="hover:bg-slate-850/50 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <div className="relative h-10 w-10 shrink-0 rounded-xl overflow-hidden bg-slate-900 border border-slate-700">
                          <Image src={item.image} alt={item.name} fill className="object-cover" />
                        </div>
                        <div>
                          <div className="font-bold text-white text-sm">{item.name}</div>
                          {item.badge && (
                            <span className="text-[10px] text-amber-400 font-medium">{item.badge}</span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-slate-400 uppercase text-[10px] font-semibold">
                      {item.categoryId}
                    </td>
                    <td className="py-3.5 px-4 font-mono font-bold text-amber-400">
                      {formatPKR(item.basePrice)}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                        isAvailable
                          ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                          : "bg-red-500/20 text-red-300 border border-red-500/30"
                      }`}>
                        {isAvailable ? "Available" : "Sold Out"}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => handleToggle(item.id, isAvailable)}
                        className={`rounded-xl px-3.5 py-1.5 text-xs font-bold transition-all border ${
                          isAvailable
                            ? "bg-red-950/40 text-red-300 border-red-800 hover:bg-red-900/60"
                            : "bg-emerald-950/40 text-emerald-300 border-emerald-800 hover:bg-emerald-900/60"
                        }`}
                      >
                        {isAvailable ? "Mark Sold Out" : "Mark Available"}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

