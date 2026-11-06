import { MENU_ITEMS } from "@/lib/data/menu";
import { MINIMUM_ORDER_AMOUNT, FREE_DELIVERY_THRESHOLD, STANDARD_DELIVERY_FEE, getPizzaAddonPrice } from "@/lib/pricing";
import { FulfillmentType, PaymentMethod } from "@/lib/types";

export const MAX_COD_ORDER_LIMIT = 8000; // Rs. 8,000 COD safety limit

export interface CartLineInput {
  menuItemId: string;
  sizeName?: string;
  addons?: { name: string; price?: number }[];
  quantity: number;
}

export interface ServerPricingResult {
  isValid: boolean;
  error?: string;
  subtotal: number;
  deliveryFee: number;
  discountAmount: number;
  totalAmount: number;
  validatedItems: {
    menuItemId: string;
    itemName: string;
    sizeName?: string;
    unitPrice: number;
    quantity: number;
    totalPrice: number;
    addons: { id: string; name: string; price: number }[];
  }[];
}

/**
 * Server-Side Pricing Engine
 * NEVER trusts prices sent from the client browser.
 * Recalculates every item, variant, size, and addon strictly from canonical definitions.
 */
export function calculateServerOrderPricing(
  items: CartLineInput[],
  fulfillmentType: FulfillmentType = "delivery",
  paymentMethod: PaymentMethod = "cod"
): ServerPricingResult {
  if (!items || items.length === 0) {
    return {
      isValid: false,
      error: "Cart is empty.",
      subtotal: 0,
      deliveryFee: 0,
      discountAmount: 0,
      totalAmount: 0,
      validatedItems: [],
    };
  }

  let subtotal = 0;
  const validatedItems: ServerPricingResult["validatedItems"] = [];

  for (const clientItem of items) {
    const canonical = MENU_ITEMS.find((m) => m.id === clientItem.menuItemId);
    if (!canonical) {
      return {
        isValid: false,
        error: `Item "${clientItem.menuItemId}" not found on menu.`,
        subtotal: 0,
        deliveryFee: 0,
        discountAmount: 0,
        totalAmount: 0,
        validatedItems: [],
      };
    }

    if (!canonical.isAvailable) {
      return {
        isValid: false,
        error: `"${canonical.name}" is currently 86'd / sold out.`,
        subtotal: 0,
        deliveryFee: 0,
        discountAmount: 0,
        totalAmount: 0,
        validatedItems: [],
      };
    }

    let unitBasePrice = canonical.basePrice;
    let selectedSizeName = clientItem.sizeName;

    if (canonical.variants && canonical.variants.length > 0) {
      if (selectedSizeName) {
        const foundVariant = canonical.variants.find(
          (v) => v.sizeName.toLowerCase() === selectedSizeName?.toLowerCase()
        );
        if (foundVariant) {
          unitBasePrice = foundVariant.price;
          selectedSizeName = foundVariant.sizeName;
        } else {
          // Default to first variant
          unitBasePrice = canonical.variants[0].price;
          selectedSizeName = canonical.variants[0].sizeName;
        }
      } else {
        unitBasePrice = canonical.variants[0].price;
        selectedSizeName = canonical.variants[0].sizeName;
      }
    }

    // Addons calculation (Strict verification)
    let addonsTotal = 0;
    const validatedAddons: { id: string; name: string; price: number }[] = [];

    if (clientItem.addons && Array.isArray(clientItem.addons)) {
      for (const addon of clientItem.addons) {
        const normalized = addon.name.toLowerCase();
        let addonPrice = 250; // default medium

        if (normalized.includes("cheese") || normalized.includes("crust")) {
          addonPrice = getPizzaAddonPrice("cheese", selectedSizeName);
        } else if (normalized.includes("chicken") || normalized.includes("meat")) {
          addonPrice = getPizzaAddonPrice("chicken", selectedSizeName);
        } else if (addon.price && addon.price > 0 && addon.price <= 500) {
          addonPrice = addon.price;
        }

        addonsTotal += addonPrice;
        validatedAddons.push({
          id: `addon-${normalized.replace(/\s+/g, "-")}`,
          name: addon.name,
          price: addonPrice,
        });
      }
    }

    const itemUnitPrice = unitBasePrice + addonsTotal;
    const qty = Math.max(1, Math.min(50, Math.floor(clientItem.quantity || 1)));
    const lineTotal = itemUnitPrice * qty;

    subtotal += lineTotal;

    validatedItems.push({
      menuItemId: canonical.id,
      itemName: canonical.name,
      sizeName: selectedSizeName,
      unitPrice: itemUnitPrice,
      quantity: qty,
      totalPrice: lineTotal,
      addons: validatedAddons,
    });
  }

  // Delivery vs Pickup pricing rules
  let deliveryFee = 0;
  if (fulfillmentType === "delivery") {
    if (subtotal < MINIMUM_ORDER_AMOUNT) {
      return {
        isValid: false,
        error: `Minimum delivery order is Rs. ${MINIMUM_ORDER_AMOUNT}. Please add Rs. ${MINIMUM_ORDER_AMOUNT - subtotal} more.`,
        subtotal,
        deliveryFee: 0,
        discountAmount: 0,
        totalAmount: subtotal,
        validatedItems,
      };
    }
    deliveryFee = subtotal >= FREE_DELIVERY_THRESHOLD ? 0 : STANDARD_DELIVERY_FEE;
  }

  // COD Safety Threshold Check
  if (paymentMethod === "cod" && subtotal + deliveryFee > MAX_COD_ORDER_LIMIT) {
    return {
      isValid: false,
      error: `Orders exceeding Rs. ${MAX_COD_ORDER_LIMIT.toLocaleString()} require online payment or direct bank transfer.`,
      subtotal,
      deliveryFee,
      discountAmount: 0,
      totalAmount: subtotal + deliveryFee,
      validatedItems,
    };
  }

  const totalAmount = subtotal + deliveryFee;

  return {
    isValid: true,
    subtotal,
    deliveryFee,
    discountAmount: 0,
    totalAmount,
    validatedItems,
  };
}

