"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import { X, Plus, Minus, Check, Flame, ShieldAlert } from "lucide-react";
import { MenuItem, ItemVariant, CartItemAddon } from "@/lib/types";
import { cartStore } from "@/lib/store/cartStore";
import { getPizzaAddonPrice } from "@/lib/pricing";
import { formatPKR } from "@/lib/utils";

interface Props {
  item: MenuItem | null;
  onClose: () => void;
}

export default function ItemCustomizeModal({ item, onClose }: Props) {
  const [selectedVariant, setSelectedVariant] = useState<ItemVariant | undefined>(undefined);
  const [extraCheese, setExtraCheese] = useState(false);
  const [extraChicken, setExtraChicken] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [instructions, setInstructions] = useState("");

  useEffect(() => {
    if (item) {
      if (item.variants && item.variants.length > 0) {
        // default to medium if available or first
        const defaultVar = item.variants.find(v => v.sizeName.toLowerCase().includes("medium")) || item.variants[0];
        setSelectedVariant(defaultVar);
      } else {
        setSelectedVariant(undefined);
      }
      setExtraCheese(false);
      setExtraChicken(false);
      setQuantity(1);
      setInstructions("");
    }
  }, [item]);

  if (!item) return null;

  const currentSizeName = selectedVariant?.sizeName || "Medium";
  const cheesePrice = getPizzaAddonPrice("cheese", currentSizeName);
  const chickenPrice = getPizzaAddonPrice("chicken", currentSizeName);

  const baseUnitPrice = selectedVariant ? selectedVariant.price : item.basePrice;
  const addonsTotal = (extraCheese ? cheesePrice : 0) + (extraChicken ? chickenPrice : 0);
  const singleUnitPrice = baseUnitPrice + addonsTotal;
  const grandLineTotal = singleUnitPrice * quantity;

  const isPizzaCategory = ["house-specials", "showstopper", "premium", "old-school", "elites-choice"].includes(item.categoryId);

  const handleAddToCart = () => {
    const addons: CartItemAddon[] = [];
    if (extraCheese) {
      addons.push({ id: `addon-cheese-${Date.now()}`, name: `Extra Cheese (${currentSizeName})`, price: cheesePrice });
    }
    if (extraChicken) {
      addons.push({ id: `addon-chicken-${Date.now()}`, name: `Extra Chicken (${currentSizeName})`, price: chickenPrice });
    }

    cartStore.addItem({
      menuItemId: item.id,
      name: item.name,
      variant: selectedVariant,
      addons,
      unitPrice: baseUnitPrice,
      quantity,
      specialInstructions: instructions.trim() || undefined,
    });

    cartStore.setDrawerOpen(true);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="relative w-full max-w-lg overflow-hidden rounded-3xl border border-slate-700/80 bg-[#121926] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-black/60 text-slate-300 backdrop-blur-md hover:bg-black hover:text-white transition-colors"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Item Header Image */}
        <div className="relative h-48 w-full bg-slate-900">
          <Image
            src={item.image}
            alt={item.name}
            fill
            className="object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#121926] via-[#121926]/40 to-transparent" />
          {item.badge && (
            <span className="absolute bottom-3 left-4 rounded-full bg-amber-500 px-3 py-1 text-xs font-black text-black uppercase tracking-wider shadow-md">
              {item.badge}
            </span>
          )}
        </div>

        {/* Content Body */}
        <div className="max-h-[60vh] overflow-y-auto px-6 py-4 space-y-5">
          <div>
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-extrabold text-white">{item.name}</h3>
              <span className="font-mono text-lg font-black text-amber-400">
                {formatPKR(singleUnitPrice)}
              </span>
            </div>
            <p className="mt-1 text-xs text-slate-400 leading-relaxed">
              {item.description}
            </p>
          </div>

          {/* Size / Variant Selector */}
          {item.variants && item.variants.length > 0 && (
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                <span>Choose Size / Portion</span>
                <span className="text-amber-400 text-[10px] lowercase font-normal">(Required)</span>
              </label>
              <div className="mt-2 grid grid-cols-2 sm:grid-cols-3 gap-2">
                {item.variants.map((v) => {
                  const isSelected = selectedVariant?.id === v.id;
                  return (
                    <button
                      key={v.id}
                      type="button"
                      onClick={() => setSelectedVariant(v)}
                      className={`flex flex-col items-center justify-center rounded-2xl p-2.5 text-center border transition-all ${
                        isSelected
                          ? "border-amber-400 bg-amber-400/10 text-white shadow-sm shadow-amber-400/20"
                          : "border-slate-800 bg-slate-900/60 text-slate-300 hover:border-slate-700 hover:bg-slate-800/80"
                      }`}
                    >
                      <span className="text-xs font-bold">{v.sizeName}</span>
                      <span className="text-[11px] font-mono text-amber-400 font-semibold mt-0.5">
                        {formatPKR(v.price)}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Pizza Add-ons (Extra Cheese & Extra Chicken) */}
          {isPizzaCategory && (
            <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-3.5 space-y-2.5">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center justify-between">
                <span>Extra Crust & Toppings</span>
                <span className="text-[11px] text-slate-400 font-normal">Optional</span>
              </label>

              <div className="space-y-2 pt-1">
                {/* Extra Cheese */}
                <button
                  type="button"
                  onClick={() => setExtraCheese(!extraCheese)}
                  className={`flex w-full items-center justify-between rounded-xl p-2.5 text-xs transition-all border ${
                    extraCheese
                      ? "border-amber-500 bg-amber-500/10 text-amber-200"
                      : "border-slate-800 bg-slate-900/60 text-slate-300 hover:bg-slate-850"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <div className={`flex h-5 w-5 items-center justify-center rounded-md border ${
                      extraCheese ? "border-amber-500 bg-amber-500 text-black" : "border-slate-600"
                    }`}>
                      {extraCheese && <Check className="h-3.5 w-3.5 stroke-[3]" />}
                    </div>
                    <span className="font-semibold">Add Extra Cheese</span>
                  </div>
                  <span className="font-mono text-amber-400 font-bold">+{formatPKR(cheesePrice)}</span>
                </button>

                {/* Extra Chicken */}
                <button
                  type="button"
                  onClick={() => setExtraChicken(!extraChicken)}
                  className={`flex w-full items-center justify-between rounded-xl p-2.5 text-xs transition-all border ${
                    extraChicken
                      ? "border-amber-500 bg-amber-500/10 text-amber-200"
                      : "border-slate-800 bg-slate-900/60 text-slate-300 hover:bg-slate-850"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <div className={`flex h-5 w-5 items-center justify-center rounded-md border ${
                      extraChicken ? "border-amber-500 bg-amber-500 text-black" : "border-slate-600"
                    }`}>
                      {extraChicken && <Check className="h-3.5 w-3.5 stroke-[3]" />}
                    </div>
                    <span className="font-semibold">Add Extra Chicken</span>
                  </div>
                  <span className="font-mono text-amber-400 font-bold">+{formatPKR(chickenPrice)}</span>
                </button>
              </div>
            </div>
          )}

          {/* Kitchen Special Instructions */}
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-slate-300">
              Kitchen Instructions / Notes
            </label>
            <input
              type="text"
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              placeholder="e.g. Extra spicy, sauce on the side, well done..."
              className="mt-1.5 w-full rounded-xl border border-slate-700 bg-slate-900/80 px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
            />
          </div>
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between border-t border-slate-800 bg-[#0e141f] p-4">
          {/* Quantity Controls */}
          <div className="flex items-center gap-3 rounded-2xl border border-slate-700 bg-slate-900 px-3 py-1.5">
            <button
              type="button"
              onClick={() => setQuantity(Math.max(1, quantity - 1))}
              className="text-slate-400 hover:text-white transition-colors"
              disabled={quantity <= 1}
            >
              <Minus className="h-4 w-4" />
            </button>
            <span className="w-5 text-center font-mono text-sm font-bold text-white">
              {quantity}
            </span>
            <button
              type="button"
              onClick={() => setQuantity(quantity + 1)}
              className="text-slate-400 hover:text-white transition-colors"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>

          {/* Add to Order Button */}
          <button
            type="button"
            onClick={handleAddToCart}
            className="flex items-center gap-2 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 px-5 py-2.5 text-xs font-black uppercase tracking-wider text-slate-950 shadow-lg shadow-amber-500/20 hover:from-amber-400 hover:to-amber-500 active:scale-95 transition-all"
          >
            <span>Add to Order</span>
            <span className="font-mono font-extrabold">({formatPKR(grandLineTotal)})</span>
          </button>
        </div>
      </div>
    </div>
  );
}

