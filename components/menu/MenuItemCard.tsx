"use client";

import React, { useState } from "react";
import Image from "next/image";
import { Plus, Flame, Sparkles, Check } from "lucide-react";
import { MenuItem } from "@/lib/types";
import { formatPKR } from "@/lib/utils";

interface Props {
  item: MenuItem;
  isAvailable: boolean;
  onCustomize: (item: MenuItem) => void;
}

export default function MenuItemCard({ item, isAvailable, onCustomize }: Props) {
  const [clicked, setClicked] = useState(false);
  const [imgSrc, setImgSrc] = useState(item.image);

  const minPrice = item.variants && item.variants.length > 0
    ? Math.min(...item.variants.map(v => v.price))
    : item.basePrice;

  const handleClick = () => {
    setClicked(true);
    setTimeout(() => setClicked(false), 500);
    onCustomize(item);
  };

  return (
    <div className={`group relative flex flex-col justify-between overflow-hidden rounded-3xl border transition-all duration-300 hover:-translate-y-1 ${
      isAvailable
        ? "border-slate-800 bg-[#111723]/90 hover:border-amber-500/60 hover:bg-[#151c2b] hover:shadow-2xl hover:shadow-amber-500/10"
        : "border-slate-800/50 bg-slate-900/40 opacity-60"
    }`}>
      {/* Top Image & Badges */}
      <div className="relative h-44 sm:h-48 w-full overflow-hidden bg-slate-950 shrink-0">
        <Image
          src={imgSrc}
          alt={item.name}
          fill
          onError={() => setImgSrc("https://images.unsplash.com/photo-1513104890138-7c749659a591?w=800&auto=format&fit=crop&q=80")}
          className={`object-cover transition-transform duration-700 ease-out group-hover:scale-110 ${
            !isAvailable ? "grayscale" : ""
          }`}
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#111723] via-transparent to-black/30 group-hover:opacity-80 transition-opacity" />

        {/* Badges */}
        <div className="absolute left-3 top-3 flex flex-wrap gap-1.5 z-10">
          {item.badge && (
            <span className="rounded-full bg-amber-500/90 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-black shadow-lg backdrop-blur-md transition-transform group-hover:scale-105">
              {item.badge}
            </span>
          )}
          {item.spiceLevel && item.spiceLevel !== "Mild" && (
            <span className="flex items-center gap-1 rounded-full bg-red-600/90 px-2 py-0.5 text-[10px] font-bold text-white shadow-lg backdrop-blur-md">
              <Flame className="h-3 w-3 animate-flame" />
              <span>{item.spiceLevel}</span>
            </span>
          )}
        </div>

        {!isAvailable && (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/65 backdrop-blur-[2px]">
            <span className="rounded-xl border border-red-500/50 bg-red-950/90 px-3.5 py-1.5 text-xs font-black uppercase tracking-wider text-red-300 shadow-xl">
              Sold Out Today
            </span>
          </div>
        )}
      </div>

      {/* Content Details */}
      <div className="flex flex-1 flex-col justify-between p-3.5 sm:p-5">
        <div>
          <div className="flex items-start justify-between gap-2">
            <h4 className="font-extrabold text-sm sm:text-base text-white group-hover:text-amber-400 transition-colors line-clamp-1">
              {item.name}
            </h4>
          </div>
          <p className="mt-1 text-xs text-slate-400 line-clamp-2 leading-relaxed">
            {item.description}
          </p>
        </div>

        {/* Pricing & Add Button */}
        <div className="mt-4 flex items-center justify-between border-t border-slate-800/80 pt-3">
          <div>
            <span className="text-[10px] uppercase font-semibold text-slate-400">
              {item.variants && item.variants.length > 0 ? "Starts from" : "Price"}
            </span>
            <div className="font-mono text-sm sm:text-base font-black text-amber-400">
              {formatPKR(minPrice)}
            </div>
          </div>

          <button
            type="button"
            disabled={!isAvailable}
            onClick={handleClick}
            className={`flex items-center justify-center gap-1.5 rounded-2xl px-3 sm:px-3.5 py-2 text-xs font-black transition-all cursor-pointer min-h-[38px] ${
              clicked ? "scale-90" : "hover:scale-105 active:scale-95"
            } ${
              isAvailable
                ? "bg-amber-500/15 text-amber-400 border border-amber-500/30 hover:bg-amber-500 hover:text-black hover:shadow-lg hover:shadow-amber-500/20"
                : "bg-slate-800 text-slate-600 cursor-not-allowed border border-slate-800"
            }`}
          >
            <Plus className="h-4 w-4" />
            <span>{item.hasSizes ? "Customize" : "Add"}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
