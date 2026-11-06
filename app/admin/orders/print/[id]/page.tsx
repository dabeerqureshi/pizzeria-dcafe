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
  const [notFound, setNotFound] = useState(false);

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
    } else {
      setNotFound(true);
    }
  }, [orderId]);

  if (notFound) {
    return (
      <div className="min-h-screen bg-[#0b0f17] p-8 flex flex-col items-center justify-center text-center space-y-3">
        <p className="text-white text-sm font-bold">Order #{orderId} could not be found.</p>
        <button
          onClick={() => router.push("/admin/orders")}
          className="rounded-xl bg-amber-500 px-4 py-2 text-xs font-bold text-black"
        >
          Return to Kitchen POS
        </button>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-[#0b0f17] p-8 flex items-center justify-center text-white text-xs">
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

