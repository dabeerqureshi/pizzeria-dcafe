"use client";

import React from "react";
import { Order } from "@/lib/types";
import { formatPKR } from "@/lib/utils";

interface Props {
  order: Order;
  onClose?: () => void;
}

export default function KitchenSlip({ order, onClose }: Props) {
  const handlePrint = () => {
    if (typeof window !== "undefined") {
      window.print();
    }
  };

  return (
    <div className="space-y-4">
      {/* Action buttons (hidden when printing) */}
      <div className="no-print flex items-center justify-between pb-3 border-b border-slate-700">
        <div className="text-xs text-slate-300">
          ESC/POS 80mm Kitchen Order Ticket (KOT) Preview
        </div>
        <div className="flex gap-2">
          <button
            onClick={handlePrint}
            className="rounded-xl bg-amber-500 px-4 py-2 text-xs font-black text-black hover:bg-amber-400 shadow-md"
          >
            🖨️ 1-Click Print 80mm Slip
          </button>
          {onClose && (
            <button
              onClick={onClose}
              className="rounded-xl bg-slate-800 px-3 py-2 text-xs font-bold text-slate-300 hover:bg-slate-700"
            >
              Close
            </button>
          )}
        </div>
      </div>

      {/* The Printable 80mm Receipt Component */}
      <div 
        id="thermal-receipt-printable"
        className="mx-auto w-[76mm] bg-white p-3 text-black font-mono text-[11px] leading-tight border border-slate-300 shadow-xl rounded-sm print:border-none print:shadow-none print:p-0"
      >
        {/* Header */}
        <div className="text-center space-y-1 pb-2 border-b border-dashed border-black">
          <div className="text-base font-black tracking-tight uppercase">PIZZERIA D CAFÉ</div>
          <div className="text-[10px]">Artisanal Pizzas & Fast Food</div>
          <div className="text-[10px]">Lahore, Pakistan • Tel: 0308-4382003</div>
          <div className="text-[10px]">Instagram: @pizzeriadcafe</div>
        </div>

        {/* Order Meta */}
        <div className="py-2 border-b border-dashed border-black space-y-0.5 text-[10px]">
          <div className="flex justify-between font-bold text-xs">
            <span>ORDER #: {order.orderNumber}</span>
            <span>{order.paymentMethod === "cod" ? "COD" : "ONLINE"}</span>
          </div>
          <div className="flex justify-between">
            <span>Date: {new Date(order.createdAt).toLocaleDateString()}</span>
            <span>Time: {new Date(order.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
          </div>
          <div className="pt-1">
            <div><strong>Cust:</strong> {order.customerName}</div>
            <div><strong>Tel:</strong> {order.customerPhone}</div>
            <div><strong>Addr:</strong> {order.deliveryAddress}</div>
            {order.landmark && <div><strong>Near:</strong> {order.landmark}</div>}
          </div>
        </div>

        {/* Itemized Table */}
        <div className="py-2 border-b border-dashed border-black space-y-1.5">
          <div className="flex justify-between font-bold text-[10px] pb-1 border-b border-black">
            <span>ITEM</span>
            <span>QTY / AMT</span>
          </div>

          {order.items.map((i, idx) => (
            <div key={idx} className="space-y-0.5">
              <div className="flex justify-between font-bold">
                <span>{i.itemName}</span>
                <span>{i.quantity}x {formatPKR(i.unitPrice * i.quantity)}</span>
              </div>
              {i.sizeName && <div className="text-[10px] pl-2 text-gray-700">• {i.sizeName}</div>}
              {i.addons && i.addons.length > 0 && (
                <div className="text-[10px] pl-2 text-gray-700">
                  {i.addons.map(a => `+ ${a.name}`).join(", ")}
                </div>
              )}
              {i.specialInstructions && (
                <div className="text-[10px] pl-2 italic font-bold">
                  *** NOTE: {i.specialInstructions} ***
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Totals */}
        <div className="py-2 border-b border-dashed border-black space-y-0.5 text-[10px]">
          <div className="flex justify-between">
            <span>Subtotal:</span>
            <span>{formatPKR(order.subtotal)}</span>
          </div>
          <div className="flex justify-between">
            <span>Delivery Fee:</span>
            <span>{order.deliveryFee === 0 ? "FREE" : formatPKR(order.deliveryFee)}</span>
          </div>
          <div className="flex justify-between font-black text-xs pt-1 border-t border-black">
            <span>TOTAL AMOUNT:</span>
            <span>{formatPKR(order.totalAmount)}</span>
          </div>
        </div>

        {/* Payment & Verification Badge */}
        <div className="py-2 text-[10px] text-center space-y-1">
          <div>
            Payment: <strong>{order.paymentMethod === "cod" ? "Cash On Delivery (Collect Cash)" : "Online Bank Transfer"}</strong>
          </div>
          {order.verifiedTransactionId && (
            <div className="font-bold">
              VERIFIED TID: {order.verifiedTransactionId}
            </div>
          )}
          {order.notes && (
            <div className="pt-1 text-left italic">
              <strong>Kitchen Note:</strong> {order.notes}
            </div>
          )}
          <div className="pt-2 text-[9px] uppercase">
            *** THANK YOU FOR ORDERING ***
          </div>
        </div>
      </div>
    </div>
  );
}

