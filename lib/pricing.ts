export const MINIMUM_ORDER_AMOUNT = 1000;
export const FREE_DELIVERY_THRESHOLD = 1500;
export const STANDARD_DELIVERY_FEE = 100;

export interface OrderTotals {
  subtotal: number;
  deliveryFee: number;
  total: number;
  isEligibleForDelivery: boolean;
  amountNeededForMinOrder: number;
  amountNeededForFreeDelivery: number;
}

export function calculateOrderTotals(subtotal: number): OrderTotals {
  const isEligibleForDelivery = subtotal >= MINIMUM_ORDER_AMOUNT;
  const amountNeededForMinOrder = Math.max(0, MINIMUM_ORDER_AMOUNT - subtotal);
  const deliveryFee = subtotal >= FREE_DELIVERY_THRESHOLD ? 0 : STANDARD_DELIVERY_FEE;
  const amountNeededForFreeDelivery = Math.max(0, FREE_DELIVERY_THRESHOLD - subtotal);
  const total = subtotal + deliveryFee;

  return {
    subtotal,
    deliveryFee,
    total,
    isEligibleForDelivery,
    amountNeededForMinOrder,
    amountNeededForFreeDelivery
  };
}

export function getPizzaAddonPrice(addonType: 'cheese' | 'chicken', sizeName?: string): number {
  const normalized = (sizeName || 'Medium').toLowerCase();
  if (normalized.includes('small')) return 150;
  if (normalized.includes('large') || normalized.includes('13"')) return 300;
  return 250; // Medium or default
}

