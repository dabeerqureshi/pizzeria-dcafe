"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { orderStore } from "@/lib/store/orderStore";
import { Order } from "@/lib/types";
import KitchenSlip from "@/components/admin/KitchenSlip";
import { ArrowLeft } from "lucide-react";

export default function PrintOrderPage() {
  const params = useParams();
  const router = useRouter();
  const orderId = params?.id as string;
  const [order, setOrder] = useState<Order | null>(null);

  useEffect(() => {
    if (!orderId) return;
    const found = orderStore.getOrderById(orderId);
    if (found) {
      setOrder(found);
      // Trigger print dialog automatically after brief delay
      const timer = setTimeout(() => {
        window.print();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [orderId]);

  if (!order) {
    return (
      <div className="p-8 text-center text-white text-xs">
        Finding order for print...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 p-6 flex flex-col items-center">
      <div className="w-full max-w-xl mb-4 no-print flex justify-between items-center">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-1.5 text-xs text-slate-300 hover:text-amber-400 font-bold"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Live Orders</span>
        </button>
      </div>

      <KitchenSlip order={order} />
    </div>
  );
}

