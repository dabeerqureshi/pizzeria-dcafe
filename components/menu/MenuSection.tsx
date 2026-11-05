"use client";

import React, { useState, useEffect } from "react";
import { Search, Sparkles, Flame, Crown, Pizza, Sandwich, Utensils, Drumstick, GlassWater, Trophy, Check } from "lucide-react";
import { CATEGORIES, MENU_ITEMS } from "@/lib/data/menu";
import { CategorySlug, MenuItem } from "@/lib/types";
import MenuItemCard from "./MenuItemCard";
import ItemCustomizeModal from "./ItemCustomizeModal";
import { orderStore } from "@/lib/store/orderStore";

export default function MenuSection() {
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [customizingItem, setCustomizingItem] = useState<MenuItem | null>(null);
  const [stockMap, setStockMap] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const unsub = orderStore.subscribeStock((map) => {
      setStockMap(map);
    });
    return unsub;
  }, []);

  const getCategoryIcon = (slug: CategorySlug) => {
    switch (slug) {
      case "house-specials": return <Crown className="h-4 w-4" />;
      case "showstopper": return <Flame className="h-4 w-4" />;
      case "premium": return <Sparkles className="h-4 w-4" />;
      case "old-school": return <Pizza className="h-4 w-4" />;
      case "elites-choice": return <Trophy className="h-4 w-4" />;
      case "burgers": return <Sandwich className="h-4 w-4" />;
      case "wraps": return <Sandwich className="h-4 w-4" />;
      case "fries": return <Utensils className="h-4 w-4" />;
      case "wings-nuggets": return <Drumstick className="h-4 w-4" />;
      case "dips-drinks": return <GlassWater className="h-4 w-4" />;
      default: return <Pizza className="h-4 w-4" />;
    }
  };

  const filteredItems = MENU_ITEMS.filter((item) => {
    const matchesCategory = selectedCategory === "all" || item.categoryId === selectedCategory;
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <section id="menu-section" className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      {/* Search & Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-6 border-b border-slate-800">
        <div>
          <h2 className="text-2xl sm:text-3xl font-black text-white flex items-center gap-2">
            <span>Explore Our Menu</span>
            <span className="text-amber-400">🍕</span>
          </h2>
          <p className="mt-1 text-xs sm:text-sm text-slate-400">
            Freshly prepared artisanal dough, gourmet melted cheeses, and signature sauces.
          </p>
        </div>

        {/* Search input */}
        <div className="relative w-full md:w-72">
          <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search pizza, burger, wraps..."
            className="w-full rounded-2xl border border-slate-800 bg-[#121926] py-2.5 pl-10 pr-4 text-xs text-white placeholder-slate-500 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-2.5 text-xs text-slate-400 hover:text-white"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Category Pills Slider */}
      <div className="mt-6 flex items-center gap-2 overflow-x-auto pb-3 pt-1 scrollbar-none">
        <button
          onClick={() => setSelectedCategory("all")}
          className={`flex items-center gap-2 shrink-0 rounded-2xl px-4 py-2.5 text-xs font-bold transition-all ${
            selectedCategory === "all"
              ? "bg-amber-500 text-black shadow-lg shadow-amber-500/20"
              : "border border-slate-800 bg-[#121926] text-slate-300 hover:border-slate-700 hover:bg-slate-800"
          }`}
        >
          <Sparkles className="h-4 w-4" />
          <span>All Items ({MENU_ITEMS.length})</span>
        </button>

        {CATEGORIES.map((cat) => {
          const isSelected = selectedCategory === cat.slug;
          const count = MENU_ITEMS.filter(i => i.categoryId === cat.slug).length;
          return (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.slug)}
              className={`flex items-center gap-2 shrink-0 rounded-2xl px-4 py-2.5 text-xs font-bold transition-all ${
                isSelected
                  ? "bg-amber-500 text-black shadow-lg shadow-amber-500/20"
                  : "border border-slate-800 bg-[#121926] text-slate-300 hover:border-slate-700 hover:bg-slate-800"
              }`}
            >
              {getCategoryIcon(cat.slug)}
              <span>{cat.name}</span>
              <span className={`text-[10px] rounded-full px-1.5 py-0.2 ${
                isSelected ? "bg-black/20 text-black" : "bg-slate-800 text-slate-400"
              }`}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Items Grid */}
      <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
        {filteredItems.map((item) => {
          const isAvailable = stockMap[item.id] !== false && item.isAvailable;
          return (
            <MenuItemCard
              key={item.id}
              item={item}
              isAvailable={isAvailable}
              onCustomize={(selected) => setCustomizingItem(selected)}
            />
          );
        })}
      </div>

      {filteredItems.length === 0 && (
        <div className="mt-12 text-center py-12 rounded-3xl border border-dashed border-slate-800">
          <p className="text-slate-400 text-sm font-medium">No items found matching your filter.</p>
          <button
            onClick={() => { setSelectedCategory("all"); setSearchQuery(""); }}
            className="mt-3 rounded-xl bg-slate-800 px-4 py-2 text-xs font-bold text-amber-400 hover:bg-slate-700"
          >
            Reset Filters
          </button>
        </div>
      )}

      {/* Customization Modal */}
      <ItemCustomizeModal
        item={customizingItem}
        onClose={() => setCustomizingItem(null)}
      />
    </section>
  );
}

