import { Order, OrderStatus, PaymentStatus, VerificationResult } from "../types";
import { isSupabaseConfigured, supabase } from "../supabase";

const ORDERS_STORAGE_KEY = "pizzeria_dcafe_orders_v1";
const MENU_STOCK_STORAGE_KEY = "pizzeria_dcafe_stock_v1";

// Initial demo seed orders to show the owner a bustling kitchen board right away
const INITIAL_DEMO_ORDERS: Order[] = [
  {
    id: "ord-1001",
    orderNumber: 101,
    customerName: "Hamza Tariq",
    customerPhone: "0321-4455889",
    deliveryAddress: "House 42-B, Sector C, Bahria Town",
    landmark: "Near Talha Mosque",
    subtotal: 2699,
    deliveryFee: 0,
    totalAmount: 2699,
    paymentMethod: "online_transfer",
    paymentStatus: "verified",
    paymentReceiptUrl: "https://images.unsplash.com/photo-1556742049-0a67c5574f73?w=800&auto=format&fit=crop&q=80",
    verifiedTransactionId: "EP-98234710",
    verificationDetails: {
      matched: true,
      amount: 2699,
      tid: "EP-98234710",
      bankName: "Easypaisa",
      confidence: "HIGH",
      timestamp: "Today at 01:25 AM",
      notes: "Amount matches order total exactly. Verified via Gemini Vision."
    },
    orderStatus: "preparing",
    notes: "Make it extra crispy with plenty of garlic dip.",
    items: [
      {
        id: "item-1",
        menuItemId: "ec-meltzilla-monster",
        itemName: "Meltzilla Monster",
        sizeName: "10\" Triple Layer",
        unitPrice: 2699,
        quantity: 1,
        addons: [{ id: "ad-ch", name: "Extra Cheese", price: 250 }],
        specialInstructions: "Sauce on the side please"
      }
    ],
    createdAt: new Date(Date.now() - 1000 * 60 * 18).toISOString(),
  },
  {
    id: "ord-1002",
    orderNumber: 102,
    customerName: "Ayesha Malik",
    customerPhone: "0300-8812345",
    deliveryAddress: "Flat 4, Gulberg III, Main Boulevard",
    landmark: "Behind Xinhua Mall",
    subtotal: 1948,
    deliveryFee: 0,
    totalAmount: 1948,
    paymentMethod: "cod",
    paymentStatus: "unpaid",
    orderStatus: "pending",
    notes: "Please bring change for Rs. 5,000 note.",
    items: [
      {
        id: "item-2",
        menuItemId: "bg-mighty-zinger-combo",
        itemName: "Mighty Zinger Combo",
        unitPrice: 950,
        quantity: 1,
        specialInstructions: "Extra spicy mayo"
      },
      {
        id: "item-3",
        menuItemId: "wp-dynamite",
        itemName: "Dynamite Wrap",
        unitPrice: 649,
        quantity: 1
      },
      {
        id: "item-4",
        menuItemId: "fr-pizza-fries",
        itemName: "Pizza Fries",
        unitPrice: 799,
        quantity: 1
      }
    ],
    createdAt: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
  },
  {
    id: "ord-1003",
    orderNumber: 103,
    customerName: "Bilal Sheikh",
    customerPhone: "0333-5128990",
    deliveryAddress: "Street 7, Phase 5 DHA",
    landmark: "Corner House next to Jalal Sons",
    subtotal: 1799,
    deliveryFee: 0,
    totalAmount: 1799,
    paymentMethod: "online_transfer",
    paymentStatus: "proof_submitted",
    paymentReceiptUrl: "https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=800&auto=format&fit=crop&q=80",
    verifiedTransactionId: "SADA-8819234",
    verificationDetails: {
      matched: true,
      amount: 1799,
      tid: "SADA-8819234",
      bankName: "SadaPay",
      confidence: "HIGH",
      timestamp: "Today at 01:40 AM",
      notes: "Receipt verified with high confidence."
    },
    orderStatus: "out_for_delivery",
    items: [
      {
        id: "item-5",
        menuItemId: "hs-my-crust",
        itemName: "My Crust (Crown Shape)",
        sizeName: "Large (13\")",
        unitPrice: 1799,
        quantity: 1,
        addons: [{ id: "ad-ch", name: "Extra Cheese", price: 300 }]
      }
    ],
    createdAt: new Date(Date.now() - 1000 * 60 * 35).toISOString(),
  }
];

class OrderStore {
  private channel: BroadcastChannel | null = null;
  private listeners: Set<(orders: Order[]) => void> = new Set();
  private stockListeners: Set<(stockMap: Record<string, boolean>) => void> = new Set();

  constructor() {
    if (typeof window !== "undefined") {
      try {
        this.channel = new BroadcastChannel("pizzeria_dcafe_realtime");
        this.channel.onmessage = (event) => {
          if (event.data?.type === "ORDER_UPDATE") {
            const current = this.getLocalOrders();
            this.notifyOrderListeners(current);
          } else if (event.data?.type === "STOCK_UPDATE") {
            const current = this.getStockMap();
            this.notifyStockListeners(current);
          }
        };
      } catch {
        // Fallback if BroadcastChannel unavailable
      }
    }
  }

  // --- Orders API ---
  public getOrders(): Order[] {
    return this.getLocalOrders();
  }

  public getOrderById(id: string): Order | undefined {
    const orders = this.getLocalOrders();
    return orders.find(o => o.id === id || String(o.orderNumber) === id);
  }

  public addOrder(newOrder: Omit<Order, "id" | "orderNumber" | "createdAt">): Order {
    const orders = this.getLocalOrders();
    const nextNumber = orders.length > 0 ? Math.max(...orders.map(o => o.orderNumber)) + 1 : 101;
    
    const created: Order = {
      ...newOrder,
      id: `ord-${Date.now().toString().slice(-6)}`,
      orderNumber: nextNumber,
      createdAt: new Date().toISOString(),
    };

    const updated = [created, ...orders];
    this.saveOrders(updated);

    // Also persist to Supabase if configured
    if (isSupabaseConfigured && supabase) {
      supabase.from("orders").insert({
        customer_name: created.customerName,
        customer_phone: created.customerPhone,
        delivery_address: created.deliveryAddress,
        landmark: created.landmark,
        subtotal: created.subtotal,
        delivery_fee: created.deliveryFee,
        total_amount: created.totalAmount,
        payment_method: created.paymentMethod,
        payment_status: created.paymentStatus,
        payment_receipt_url: created.paymentReceiptUrl,
        verified_transaction_id: created.verifiedTransactionId,
        verification_details: created.verificationDetails,
        order_status: created.orderStatus,
        notes: created.notes,
      }).then(() => {});
    }

    this.broadcast({ type: "ORDER_UPDATE" });
    return created;
  }

  public updateOrderStatus(orderId: string, status: OrderStatus): void {
    const orders = this.getLocalOrders();
    const index = orders.findIndex(o => o.id === orderId);
    if (index === -1) return;

    orders[index] = {
      ...orders[index],
      orderStatus: status,
      updatedAt: new Date().toISOString()
    };

    this.saveOrders(orders);

    if (isSupabaseConfigured && supabase) {
      supabase.from("orders").update({ order_status: status }).eq("id", orderId).then(() => {});
    }

    this.broadcast({ type: "ORDER_UPDATE" });
  }

  public updatePaymentStatus(orderId: string, paymentStatus: PaymentStatus, details?: VerificationResult): void {
    const orders = this.getLocalOrders();
    const index = orders.findIndex(o => o.id === orderId);
    if (index === -1) return;

    orders[index] = {
      ...orders[index],
      paymentStatus,
      verificationDetails: details || orders[index].verificationDetails,
      verifiedTransactionId: details?.tid || orders[index].verifiedTransactionId,
      updatedAt: new Date().toISOString()
    };

    this.saveOrders(orders);
    this.broadcast({ type: "ORDER_UPDATE" });
  }

  public subscribeOrders(cb: (orders: Order[]) => void): () => void {
    this.listeners.add(cb);
    cb(this.getLocalOrders());
    return () => this.listeners.delete(cb);
  }

  // --- Stock / Menu availability ---
  public getStockMap(): Record<string, boolean> {
    if (typeof window === "undefined") return {};
    try {
      const stored = localStorage.getItem(MENU_STOCK_STORAGE_KEY);
      return stored ? JSON.parse(stored) : {};
    } catch {
      return {};
    }
  }

  public toggleItemStock(itemId: string, isAvailable: boolean): void {
    const map = this.getStockMap();
    map[itemId] = isAvailable;
    try {
      localStorage.setItem(MENU_STOCK_STORAGE_KEY, JSON.stringify(map));
    } catch {}
    this.notifyStockListeners(map);
    this.broadcast({ type: "STOCK_UPDATE" });
  }

  public subscribeStock(cb: (stockMap: Record<string, boolean>) => void): () => void {
    this.stockListeners.add(cb);
    cb(this.getStockMap());
    return () => this.stockListeners.delete(cb);
  }

  // --- Private Helpers ---
  private getLocalOrders(): Order[] {
    if (typeof window === "undefined") return INITIAL_DEMO_ORDERS;
    try {
      const stored = localStorage.getItem(ORDERS_STORAGE_KEY);
      if (!stored) {
        localStorage.setItem(ORDERS_STORAGE_KEY, JSON.stringify(INITIAL_DEMO_ORDERS));
        return INITIAL_DEMO_ORDERS;
      }
      return JSON.parse(stored);
    } catch {
      return INITIAL_DEMO_ORDERS;
    }
  }

  private saveOrders(orders: Order[]): void {
    if (typeof window === "undefined") return;
    try {
      localStorage.setItem(ORDERS_STORAGE_KEY, JSON.stringify(orders));
    } catch {}
    this.notifyOrderListeners(orders);
  }

  private notifyOrderListeners(orders: Order[]): void {
    this.listeners.forEach(cb => cb(orders));
  }

  private notifyStockListeners(map: Record<string, boolean>): void {
    this.stockListeners.forEach(cb => cb(map));
  }

  private broadcast(payload: { type: string }): void {
    try {
      this.channel?.postMessage(payload);
    } catch {}
  }
}

export const orderStore = new OrderStore();

