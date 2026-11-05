import { CartItem, CartItemAddon, ItemVariant } from "../types";
import { calculateOrderTotals, OrderTotals } from "../pricing";

const CART_STORAGE_KEY = "pizzeria_dcafe_cart_v1";

class CartStore {
  private items: CartItem[] = [];
  private listeners: Set<(items: CartItem[]) => void> = new Set();
  private drawerOpen: boolean = false;
  private drawerListeners: Set<(isOpen: boolean) => void> = new Set();

  constructor() {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem(CART_STORAGE_KEY);
        if (saved) {
          this.items = JSON.parse(saved);
        }
      } catch {}
    }
  }

  public getItems(): CartItem[] {
    return [...this.items];
  }

  public getTotals(): OrderTotals {
    const subtotal = this.items.reduce((sum, item) => {
      const addonsTotal = item.addons.reduce((aSum, a) => aSum + a.price, 0);
      return sum + (item.unitPrice + addonsTotal) * item.quantity;
    }, 0);

    return calculateOrderTotals(subtotal);
  }

  public addItem(payload: {
    menuItemId: string;
    name: string;
    variant?: ItemVariant;
    addons?: CartItemAddon[];
    unitPrice: number;
    quantity?: number;
    specialInstructions?: string;
  }): void {
    const quantity = payload.quantity || 1;
    const addons = payload.addons || [];

    // Find if duplicate line item exists
    const existingIndex = this.items.findIndex((item) => {
      const sameItem = item.menuItemId === payload.menuItemId;
      const sameVariant = item.variant?.id === payload.variant?.id;
      const sameAddons = JSON.stringify(item.addons.map(a => a.id).sort()) === JSON.stringify(addons.map(a => a.id).sort());
      return sameItem && sameVariant && sameAddons;
    });

    if (existingIndex > -1) {
      this.items[existingIndex].quantity += quantity;
    } else {
      const newItem: CartItem = {
        id: `cart-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        menuItemId: payload.menuItemId,
        name: payload.name,
        variant: payload.variant,
        addons,
        unitPrice: payload.unitPrice,
        quantity,
        specialInstructions: payload.specialInstructions,
      };
      this.items.push(newItem);
    }

    this.persist();
  }

  public updateQuantity(cartItemId: string, newQuantity: number): void {
    if (newQuantity <= 0) {
      this.removeItem(cartItemId);
      return;
    }

    const item = this.items.find(i => i.id === cartItemId);
    if (item) {
      item.quantity = newQuantity;
      this.persist();
    }
  }

  public removeItem(cartItemId: string): void {
    this.items = this.items.filter(i => i.id !== cartItemId);
    this.persist();
  }

  public clearCart(): void {
    this.items = [];
    this.persist();
  }

  public setDrawerOpen(open: boolean): void {
    this.drawerOpen = open;
    this.drawerListeners.forEach(cb => cb(open));
  }

  public subscribe(cb: (items: CartItem[]) => void): () => void {
    this.listeners.add(cb);
    cb(this.items);
    return () => this.listeners.delete(cb);
  }

  public subscribeDrawer(cb: (open: boolean) => void): () => void {
    this.drawerListeners.add(cb);
    cb(this.drawerOpen);
    return () => this.drawerListeners.delete(cb);
  }

  private persist(): void {
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(this.items));
      } catch {}
    }
    this.listeners.forEach(cb => cb([...this.items]));
  }
}

export const cartStore = new CartStore();

