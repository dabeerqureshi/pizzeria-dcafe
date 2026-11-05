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
  sizeName: string; // 'Small' | 'Medium' | 'Large' | 'Regular' | 'Max' | '5 pcs' | '10 pcs'
  price: number;
}

export interface ItemAddon {
  id: string;
  name: string;
  price: number; // e.g. Extra Cheese Rs. 250
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
  id: string; // unique cart line item id
  menuItemId: string;
  name: string;
  variant?: ItemVariant;
  addons: CartItemAddon[];
  unitPrice: number;
  quantity: number;
  specialInstructions?: string;
}

export type OrderStatus = 
  | 'pending'
  | 'confirmed'
  | 'preparing'
  | 'out_for_delivery'
  | 'delivered'
  | 'cancelled';

export type PaymentMethod = 'cod' | 'online_transfer';
export type PaymentStatus = 'unpaid' | 'proof_submitted' | 'verified' | 'failed';

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

export interface Order {
  id: string;
  orderNumber: number;
  customerName: string;
  customerPhone: string;
  deliveryAddress: string;
  landmark?: string;
  subtotal: number;
  deliveryFee: number;
  totalAmount: number;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  paymentReceiptUrl?: string;
  verifiedTransactionId?: string;
  verificationDetails?: VerificationResult;
  orderStatus: OrderStatus;
  notes?: string;
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

