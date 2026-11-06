"use client";

import React, { useState } from "react";
import { ShieldCheck, ChevronDown, ChevronUp, AlertCircle } from "lucide-react";

export default function FoodSafetyBanner() {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="w-full bg-emerald-950/40 border-y border-emerald-800/40 px-4 py-2.5 transition-all text-xs text-emerald-200">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <ShieldCheck className="h-4 w-4 text-emerald-400 shrink-0" />
          <span className="font-semibold text-emerald-300 truncate">
            <span className="hidden sm:inline">Food Safety & </span>Freshness Guarantee:
          </span>
          <span className="hidden md:inline text-emerald-300/80 truncate">
            Freshly prepared to order. Refrigerate at 4°C if stored.
          </span>
        </div>

        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-1 font-medium text-emerald-400 hover:text-emerald-300 underline underline-offset-2 transition-colors cursor-pointer shrink-0"
        >
          <span>{expanded ? "Hide" : "Safety Notice"}</span>
          {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
        </button>
      </div>

      {expanded && (
        <div className="mx-auto max-w-7xl pt-3 pb-1 border-t border-emerald-800/30 mt-2 text-[11px] grid grid-cols-1 md:grid-cols-3 gap-3 text-emerald-200/90">
          <div className="flex items-start gap-2">
            <span className="text-emerald-400 font-bold">•</span>
            <p><strong>Refrigeration:</strong> If storing your food, refrigerate immediately at 4°C (40°F) or below.</p>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-emerald-400 font-bold">•</span>
            <p><strong>Thorough Reheat:</strong> Reheat thoroughly to piping hot before enjoying leftovers.</p>
          </div>
          <div className="flex items-start gap-2">
            <AlertCircle className="h-3.5 w-3.5 text-amber-400 shrink-0 mt-0.5" />
            <p><strong>Time Limit:</strong> Avoid keeping food out for more than 2 hours (or 1 hour in hot weather).</p>
          </div>
        </div>
      )}
    </div>
  );
}

