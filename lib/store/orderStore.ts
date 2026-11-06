import { Order, OrderStatus, PaymentStatus, VerificationResult, Rider, CodSettlement, FulfillmentType } from "../types";
import { isSupabaseConfigured, supabase } from "../supabase";
import { getKitchenStatus } from "../businessHours";

const ORDERS_STORAGE_KEY = "pizzeria_dcafe_orders_v2";
const MENU_STOCK_STORAGE_KEY = "pizzeria_dcafe_stock_v2";
const SETTLEMENTS_STORAGE_KEY = "pizzeria_dcafe_settlements_v2";

export const DEMO_RIDERS: Rider[] = [
  {
    id: "r1",
    riderName: "Ali Hassan (Rider 1)",
    phone: "0300-1122334",
    vehicleNumber: "LEA-4521",
    currentStatus: "available",
    activeOrdersCount: 1,
  },
  {
    id: "r2",
    riderName: "Usman Tariq (Rider 2)",
    phone: "0321-9988776",
    vehicleNumber: "LEN-8812",
    currentStatus: "available",
    activeOrdersCount: 0,
  },
];

const INITIAL_DEMO_ORDERS: Order[] = [
  {
    id: "ord-1001",
    orderNumber: 101,
    idempotencyKey: "seed-idem-1001",
    customerName: "Hamza Tariq",
    customerPhone: "0321-4455889",
    fulfillmentType: "delivery",
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
    idempotencyKey: "seed-idem-1002",
    customerName: "Ayesha Malik",
    customerPhone: "0300-8812345",
    fulfillmentType: "delivery",
    deliveryAddress: "Flat 4, Gulberg III, Main Boulevard",
    landmark: "Behind Xinhua Mall",
    subtotal: 1948,
    deliveryFee: 0,
    totalAmount: 1948,
    paymentMethod: "cod",
    paymentStatus: "unpaid",
    orderStatus: "confirmed",
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
    idempotencyKey: "seed-idem-1003",
    customerName: "Zainab Raza",
    customerPhone: "0345-1234567",
    fulfillmentType: "pickup",
    pickupCode: "P-4821",
    scheduledFor: "In 25 mins",
    subtotal: 1850,
    deliveryFee: 0,
    totalAmount: 1850,
    paymentMethod: "cod",
    paymentStatus: "unpaid",
    orderStatus: "ready_for_dispatch",
    notes: "Counter pickup. Customer paying cash at counter.",
    items: [
      {
        id: "item-5",
        menuItemId: "hs-d-special",
        itemName: "D Special Signature Pizza",
        sizeName: "Large (13\")",
        unitPrice: 1850,
        quantity: 1,
      }
    ],
    createdAt: new Date(Date.now() - 1000 * 60 * 22).toISOString(),
  },
  {
    id: "ord-1004",
    orderNumber: 104,
    idempotencyKey: "seed-idem-1004",
    customerName: "Bilal Sheikh",
    customerPhone: "0333-5128990",
    fulfillmentType: "delivery",
    deliveryAddress: "Street 7, Phase 5 DHA",
    landmark: "Corner House next to Jalal Sons",
    subtotal: 1799,
    deliveryFee: 0,
    totalAmount: 1799,
    paymentMethod: "cod",
    paymentStatus: "unpaid",
    orderStatus: "out_for_delivery",
    riderId: "r1",
    assignedRiderName: "Ali Hassan (Rider 1)",
    notes: "Gate bell is broken, please call on arrival.",
    items: [
      {
        id: "item-6",
        menuItemId: "ss-chicago-dynamite",
        itemName: "Chicago Dynamite Stuffed",
        sizeName: "Medium (10\")",
        unitPrice: 1799,
        quantity: 1
      }
    ],
    createdAt: new Date(Date.now() - 1000 * 60 * 35).toISOString(),
  }
];

class OrderStore {
  private listeners: Set<(orders: Order[]) => void> = new Set();
  private stockListeners: Set<(stockMap: Record<string, boolean>) => void> = new Set();
  private channel: BroadcastChannel | null = null;

  constructor() {
    if (typeof window !== "undefined") {
      try {
        this.channel = new BroadcastChannel("pizzeria_order_events");
        this.channel.onmessage = (event) => {
          if (event.data?.type === "ORDER_UPDATE") {
            const current = this.getLocalOrders();
            this.notifyOrderListeners(current);
          } else if (event.data?.type === "STOCK_UPDATE") {
            const currentStock = this.getStockMap();
            this.notifyStockListeners(currentStock);
          }
        };

        window.addEventListener("pizzeria_order_update", (e: any) => {
          if (e.detail?.type === "ORDER_UPDATE") {
            const current = this.getLocalOrders();
            this.notifyOrderListeners(current);
          }
        });

        window.addEventListener("storage", (e) => {
          if (e.key === ORDERS_STORAGE_KEY) {
            const current = this.getLocalOrders();
            this.notifyOrderListeners(current);
          }
        });
      } catch {}
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
    if (!getKitchenStatus().isOpen) {
      throw new Error("Orders are not accepted after 12:00. Kitchen is currently closed.");
    }

    const orders = this.getLocalOrders();

    // Idempotency deduplication check: if order with this idempotencyKey already exists, return it!
    if (newOrder.idempotencyKey) {
      const existing = orders.find(o => o.idempotencyKey === newOrder.idempotencyKey);
      if (existing) {
        return existing;
      }
    }

    const validNumbers = orders.map(o => Number(o.orderNumber)).filter(n => !isNaN(n) && n > 0);
    const nextNumber = validNumbers.length > 0 ? Math.max(...validNumbers) + 1 : 101;
    
    // Auto-generate pickup code if pickup fulfillment
    let pickupCode = newOrder.pickupCode;
    if (newOrder.fulfillmentType === "pickup" && !pickupCode) {
      pickupCode = `P-${Math.floor(1000 + Math.random() * 9000)}`;
    }

    const created: Order = {
      ...newOrder,
      pickupCode,
      id: `ord-${Date.now().toString().slice(-6)}`,
      orderNumber: nextNumber,
      createdAt: new Date().toISOString(),
    };

    const updated = [created, ...orders];
    this.saveOrders(updated);

    if (isSupabaseConfigured && supabase) {
      supabase.from("orders").insert({
        idempotency_key: created.idempotencyKey,
        customer_name: created.customerName,
        customer_phone: created.customerPhone,
        fulfillment_type: created.fulfillmentType,
        delivery_address: created.deliveryAddress,
        pickup_code: created.pickupCode,
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

  public assignRider(orderId: string, riderId: string, riderName: string): void {
    const orders = this.getLocalOrders();
    const index = orders.findIndex(o => o.id === orderId);
    if (index === -1) return;

    orders[index] = {
      ...orders[index],
      riderId,
      assignedRiderName: riderName,
      orderStatus: "out_for_delivery",
      updatedAt: new Date().toISOString()
    };

    this.saveOrders(orders);
    this.broadcast({ type: "ORDER_UPDATE" });
  }

  public markRiderDelivered(orderId: string): void {
    const orders = this.getLocalOrders();
    const index = orders.findIndex(o => o.id === orderId);
    if (index === -1) return;

    orders[index] = {
      ...orders[index],
      orderStatus: "delivered",
      paymentStatus: orders[index].paymentMethod === "cod" ? "paid" : orders[index].paymentStatus,
      updatedAt: new Date().toISOString()
    };

    this.saveOrders(orders);
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

  public deleteOrder(orderId: string): void {
    const orders = this.getLocalOrders().filter(o => o.id !== orderId);
    this.saveOrders(orders);
    if (isSupabaseConfigured && supabase) {
      supabase.from("orders").delete().eq("id", orderId).then(() => {});
    }
    this.broadcast({ type: "ORDER_UPDATE" });
  }

  public clearDeliveredOrders(): void {
    const orders = this.getLocalOrders().filter(o => o.orderStatus !== "delivered" && o.orderStatus !== "cancelled");
    this.saveOrders(orders);
    this.broadcast({ type: "ORDER_UPDATE" });
  }

  public resetDemoOrders(): void {
    this.saveOrders(INITIAL_DEMO_ORDERS);
    this.broadcast({ type: "ORDER_UPDATE" });
  }

  public subscribeOrders(cb: (orders: Order[]) => void): () => void {
    this.listeners.add(cb);
    cb(this.getLocalOrders());
    return () => this.listeners.delete(cb);
  }

  // --- End-of-Shift COD Settlements ---
  public getSettlements(): CodSettlement[] {
    if (typeof window === "undefined") return [];
    try {
      const stored = localStorage.getItem(SETTLEMENTS_STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }

  public recordSettlement(settlement: Omit<CodSettlement, "id" | "createdAt" | "discrepancy">): CodSettlement {
    const all = this.getSettlements();
    const discrepancy = settlement.handedOverCash - settlement.expectedCash;
    const entry: CodSettlement = {
      ...settlement,
      discrepancy,
      id: `stl-${Date.now()}`,
      createdAt: new Date().toISOString(),
    };
    const updated = [entry, ...all];
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(SETTLEMENTS_STORAGE_KEY, JSON.stringify(updated));
      } catch {}
    }
    this.broadcast({ type: "SETTLEMENT_UPDATE" });
    return entry;
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
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("pizzeria_order_update", { detail: payload }));
    }
  }
}

export const orderStore = new OrderStore();
