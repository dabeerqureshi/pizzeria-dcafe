import { Order, OrderStatus, PaymentStatus, VerificationResult, Rider, CodSettlement, FulfillmentType } from "../types";
import { isSupabaseConfigured, supabase } from "../supabase";
import { getKitchenStatus } from "../businessHours";

const ORDERS_STORAGE_KEY = "pizzeria_dcafe_orders_v2";
const MENU_STOCK_STORAGE_KEY = "pizzeria_dcafe_stock_v2";
const SETTLEMENTS_STORAGE_KEY = "pizzeria_dcafe_settlements_v2";

export const FLEET_RIDERS: Rider[] = [
  {
    id: "r1",
    riderName: "Ali Hassan",
    phone: "0300-1122334",
    vehicleNumber: "LEA-4521",
    currentStatus: "available",
    activeOrdersCount: 0,
  },
  {
    id: "r2",
    riderName: "Usman Tariq",
    phone: "0321-9988776",
    vehicleNumber: "LEN-8812",
    currentStatus: "available",
    activeOrdersCount: 0,
  },
];

// Initial live queue starts empty for production delivery
const INITIAL_ORDERS: Order[] = [];

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

  public clearAllOrders(): void {
    this.saveOrders([]);
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
    if (typeof window === "undefined") return [];
    try {
      const stored = localStorage.getItem(ORDERS_STORAGE_KEY);
      if (!stored) {
        localStorage.setItem(ORDERS_STORAGE_KEY, JSON.stringify([]));
        return [];
      }
      return JSON.parse(stored);
    } catch {
      return [];
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
