export type CategorySlug = 
  | 'house-specials'
  | 'showstopper'
  | 'premium'
  | 'old-school'
  | 'elites-choice'
  | 'burgers'
  | 'wraps'
  | 'fries'
  | 'wings-nuggets'
  | 'dips-drinks';

export interface Category {
  id: string;
  name: string;
  slug: CategorySlug;
  description?: string;
  icon?: string;
}

export interface ItemVariant {
  id: string;
  sizeName: string;
  price: number;
}

export interface ItemAddon {
  id: string;
  name: string;
  price: number;
}

export interface MenuItem {
  id: string;
  categoryId: CategorySlug;
  name: string;
  description: string;
  image: string;
  basePrice: number;
  isAvailable: boolean;
  hasSizes: boolean;
  variants?: ItemVariant[];
  badge?: string;
  spiceLevel?: 'Mild' | 'Medium' | 'Spicy' | 'Fire';
}

export interface CartItemAddon {
  id: string;
  name: string;
  price: number;
}

export interface CartItem {
  id: string;
  menuItemId: string;
  name: string;
  variant?: ItemVariant;
  addons: CartItemAddon[];
  unitPrice: number;
  quantity: number;
  specialInstructions?: string;
}

export type FulfillmentType = 'delivery' | 'pickup';

export type OrderStatus = 
  | 'pending'
  | 'pending_payment'
  | 'pending_confirmation'
  | 'accepted'
  | 'confirmed'
  | 'preparing'
  | 'ready_for_dispatch'
  | 'delivering'
  | 'out_for_delivery'
  | 'delivered'
  | 'picked_up'
  | 'cancelled'
  | 'failed_delivery';

export type PaymentMethod = 'cod' | 'online' | 'online_transfer';
export type PaymentStatus = 'unpaid' | 'pending_payment' | 'proof_submitted' | 'verified' | 'paid' | 'failed' | 'refunded';

export interface VerificationResult {
  matched: boolean;
  amount: number | null;
  tid: string | null;
  sender?: string | null;
  timestamp?: string | null;
  confidence?: 'HIGH' | 'MEDIUM' | 'LOW';
  notes?: string;
  bankName?: string;
}

export interface Rider {
  id: string;
  riderName: string;
  phone: string;
  vehicleNumber?: string;
  currentStatus: 'offline' | 'available' | 'delivering' | 'settling_shift';
  activeOrdersCount: number;
}

export interface CodSettlement {
  id: string;
  riderId: string;
  riderName: string;
  shiftDate: string;
  totalDeliveredOrders: number;
  expectedCash: number;
  handedOverCash: number;
  discrepancy: number;
  settledByManager: string;
  notes?: string;
  createdAt: string;
}

export interface DeliveryZone {
  id: string;
  zoneName: string;
  minOrderAmount: number;
  freeDeliveryThreshold: number;
  deliveryFee: number;
  estimatedDeliveryMins: number;
  maxRadiusKm?: number;
}

export interface PickupSlot {
  timeString: string;
  formattedTime: string;
  availableCapacity: number;
}

export interface SavedAddress {
  id: string;
  label: string; // 'Home' | 'Office' | 'Other'
  addressLine: string;
  landmark?: string;
  isDefault?: boolean;
}

export interface CustomerProfile {
  id: string;
  phone: string;
  fullName: string;
  email?: string;
  addresses: SavedAddress[];
  defaultAddress?: string;
  defaultLandmark?: string;
  createdAt: string;
}

export interface Order {
  id: string;
  orderNumber: number;
  idempotencyKey?: string;
  customerName: string;
  customerPhone: string;
  fulfillmentType: FulfillmentType;
  deliveryAddress?: string;
  landmark?: string;
  zoneId?: string;
  pickupCode?: string;
  scheduledFor?: string;
  subtotal: number;
  deliveryFee: number;
  discountAmount?: number;
  totalAmount: number;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  paymentReceiptUrl?: string;
  verifiedTransactionId?: string;
  verificationDetails?: VerificationResult;
  orderStatus: OrderStatus;
  notes?: string;
  riderId?: string;
  assignedRiderName?: string;
  items: {
    id: string;
    menuItemId: string;
    itemName: string;
    sizeName?: string;
    unitPrice: number;
    quantity: number;
    addons?: CartItemAddon[];
    specialInstructions?: string;
  }[];
  createdAt: string;
  updatedAt?: string;
}
