import { CustomerProfile, SavedAddress } from "../types";

const CUSTOMER_SESSION_KEY = "pizzeria_dcafe_customer_session_v1";
const CUSTOMER_USERS_DB_KEY = "pizzeria_dcafe_registered_customers_v1";

interface RegisteredUserRecord extends CustomerProfile {
  pin: string; // 4-digit PIN or password
}

// Initial demo customer so repeat login works immediately out of the box
const INITIAL_DEMO_CUSTOMERS: RegisteredUserRecord[] = [
  {
    id: "cust-demo-1",
    phone: "0300-1234567",
    fullName: "Hamza Tariq",
    email: "hamza@example.com",
    pin: "1234",
    addresses: [
      {
        id: "addr-1",
        label: "Home",
        addressLine: "House 42-B, Sector C, Bahria Town, Lahore",
        landmark: "Near Talha Mosque",
        isDefault: true,
      },
      {
        id: "addr-2",
        label: "Office",
        addressLine: "Level 4, Arfa Software Technology Park, Ferozepur Road, Lahore",
        landmark: "Near Metro Bus Station",
        isDefault: false,
      },
    ],
    defaultAddress: "House 42-B, Sector C, Bahria Town, Lahore",
    defaultLandmark: "Near Talha Mosque",
    createdAt: new Date().toISOString(),
  },
  {
    id: "cust-demo-2",
    phone: "0308-4382003",
    fullName: "Ayesha Malik",
    email: "ayesha@example.com",
    pin: "4321",
    addresses: [
      {
        id: "addr-3",
        label: "Home",
        addressLine: "Flat 4, Gulberg III, Main Boulevard, Lahore",
        landmark: "Behind Xinhua Mall",
        isDefault: true,
      },
    ],
    defaultAddress: "Flat 4, Gulberg III, Main Boulevard, Lahore",
    defaultLandmark: "Behind Xinhua Mall",
    createdAt: new Date().toISOString(),
  },
];

class CustomerAuthStore {
  private currentCustomer: CustomerProfile | null = null;
  private listeners: Set<(customer: CustomerProfile | null) => void> = new Set();
  private authModalOpen: boolean = false;
  private modalListeners: Set<(isOpen: boolean) => void> = new Set();

  constructor() {
    if (typeof window !== "undefined") {
      this.currentCustomer = this.loadSavedSession();
      this.ensureDemoUsersExist();

      window.addEventListener("storage", (e) => {
        if (e.key === CUSTOMER_SESSION_KEY) {
          this.currentCustomer = this.loadSavedSession();
          this.notifyListeners();
        }
      });
    }
  }

  public getCustomer(): CustomerProfile | null {
    return this.currentCustomer;
  }

  public isAuthenticated(): boolean {
    return this.currentCustomer !== null;
  }

  public isAuthModalOpen(): boolean {
    return this.authModalOpen;
  }

  public setAuthModalOpen(isOpen: boolean): void {
    this.authModalOpen = isOpen;
    this.modalListeners.forEach((cb) => cb(isOpen));
  }

  public subscribe(cb: (customer: CustomerProfile | null) => void): () => void {
    this.listeners.add(cb);
    cb(this.currentCustomer);
    return () => this.listeners.delete(cb);
  }

  public subscribeModal(cb: (isOpen: boolean) => void): () => void {
    this.modalListeners.add(cb);
    cb(this.authModalOpen);
    return () => this.modalListeners.delete(cb);
  }

  // Check if phone number is already registered (KFC App Step 1)
  public checkPhoneRegistered(phone: string): { isRegistered: boolean; customerName?: string } {
    const cleanPhone = this.normalizePhone(phone);
    const users = this.getAllRegisteredUsers();
    const found = users.find((u) => this.normalizePhone(u.phone) === cleanPhone);

    if (found) {
      return { isRegistered: true, customerName: found.fullName };
    }
    return { isRegistered: false };
  }

  // 1st Time: Create an Account (Register)
  public register(params: {
    phone: string;
    fullName: string;
    pin: string;
    email?: string;
    addressLine?: string;
    landmark?: string;
    addressLabel?: string;
  }): { success: boolean; customer?: CustomerProfile; error?: string } {
    const cleanPhone = this.normalizePhone(params.phone);
    if (!cleanPhone || cleanPhone.length < 10) {
      return { success: false, error: "Please enter a valid Pakistani mobile number." };
    }
    if (!params.fullName || params.fullName.trim().length < 2) {
      return { success: false, error: "Please enter your full name." };
    }
    if (!params.pin || params.pin.trim().length < 4) {
      return { success: false, error: "Please create a 4-digit PIN." };
    }

    const users = this.getAllRegisteredUsers();
    const existing = users.find((u) => this.normalizePhone(u.phone) === cleanPhone);
    if (existing) {
      return {
        success: false,
        error: "This phone number is already registered! Please login with your PIN.",
      };
    }

    const initialAddresses: SavedAddress[] = [];
    if (params.addressLine && params.addressLine.trim().length > 3) {
      initialAddresses.push({
        id: `addr-${Date.now()}`,
        label: params.addressLabel || "Home",
        addressLine: params.addressLine.trim(),
        landmark: params.landmark?.trim() || undefined,
        isDefault: true,
      });
    }

    const newRecord: RegisteredUserRecord = {
      id: `cust-${Date.now()}`,
      phone: params.phone.trim(),
      fullName: params.fullName.trim(),
      email: params.email?.trim() || undefined,
      pin: params.pin.trim(),
      addresses: initialAddresses,
      defaultAddress: params.addressLine?.trim() || undefined,
      defaultLandmark: params.landmark?.trim() || undefined,
      createdAt: new Date().toISOString(),
    };

    users.push(newRecord);
    this.saveAllRegisteredUsers(users);

    // Auto-login newly registered customer
    const { pin, ...profile } = newRecord;
    this.setSession(profile);
    this.setAuthModalOpen(false);

    return { success: true, customer: profile };
  }

  // 2nd Time Onwards: Login
  public login(
    phone: string,
    pin: string
  ): { success: boolean; customer?: CustomerProfile; error?: string } {
    const cleanPhone = this.normalizePhone(phone);
    const users = this.getAllRegisteredUsers();
    const found = users.find((u) => this.normalizePhone(u.phone) === cleanPhone);

    if (!found) {
      return {
        success: false,
        error: "Phone number not registered. Please create your account first.",
      };
    }

    if (found.pin !== pin.trim()) {
      return { success: false, error: "Incorrect 4-digit PIN. Please try again." };
    }

    const { pin: _p, ...profile } = found;
    this.setSession(profile);
    this.setAuthModalOpen(false);

    return { success: true, customer: profile };
  }

  // Quick 1-Tap OTP Login for verified numbers
  public loginWithOtpVerified(phone: string): { success: boolean; customer?: CustomerProfile } {
    const cleanPhone = this.normalizePhone(phone);
    const users = this.getAllRegisteredUsers();
    const found = users.find((u) => this.normalizePhone(u.phone) === cleanPhone);

    if (found) {
      const { pin, ...profile } = found;
      this.setSession(profile);
      this.setAuthModalOpen(false);
      return { success: true, customer: profile };
    }
    return { success: false };
  }

  // Add / Save Address to Customer Profile
  public addAddress(address: Omit<SavedAddress, "id">): void {
    if (!this.currentCustomer) return;

    const newAddr: SavedAddress = {
      ...address,
      id: `addr-${Date.now()}`,
    };

    const updatedAddresses = [...this.currentCustomer.addresses, newAddr];
    const updatedCustomer: CustomerProfile = {
      ...this.currentCustomer,
      addresses: updatedAddresses,
      defaultAddress: address.isDefault ? address.addressLine : this.currentCustomer.defaultAddress,
      defaultLandmark: address.isDefault ? address.landmark : this.currentCustomer.defaultLandmark,
    };

    this.setSession(updatedCustomer);

    // Sync to user DB record
    const users = this.getAllRegisteredUsers();
    const index = users.findIndex((u) => u.id === updatedCustomer.id);
    if (index !== -1) {
      users[index] = { ...users[index], ...updatedCustomer };
      this.saveAllRegisteredUsers(users);
    }
  }

  // Sign Out
  public logout(): void {
    if (typeof window !== "undefined") {
      try {
        localStorage.removeItem(CUSTOMER_SESSION_KEY);
      } catch {}
    }
    this.currentCustomer = null;
    this.notifyListeners();
  }

  // --- Helpers ---
  private setSession(profile: CustomerProfile): void {
    this.currentCustomer = profile;
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(CUSTOMER_SESSION_KEY, JSON.stringify(profile));
      } catch {}
    }
    this.notifyListeners();
  }

  private loadSavedSession(): CustomerProfile | null {
    if (typeof window === "undefined") return null;
    try {
      const raw = localStorage.getItem(CUSTOMER_SESSION_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  private getAllRegisteredUsers(): RegisteredUserRecord[] {
    if (typeof window === "undefined") return INITIAL_DEMO_CUSTOMERS;
    try {
      const raw = localStorage.getItem(CUSTOMER_USERS_DB_KEY);
      return raw ? JSON.parse(raw) : INITIAL_DEMO_CUSTOMERS;
    } catch {
      return INITIAL_DEMO_CUSTOMERS;
    }
  }

  private saveAllRegisteredUsers(users: RegisteredUserRecord[]): void {
    if (typeof window === "undefined") return;
    try {
      localStorage.setItem(CUSTOMER_USERS_DB_KEY, JSON.stringify(users));
    } catch {}
  }

  private ensureDemoUsersExist(): void {
    if (typeof window === "undefined") return;
    try {
      const existing = localStorage.getItem(CUSTOMER_USERS_DB_KEY);
      if (!existing) {
        localStorage.setItem(CUSTOMER_USERS_DB_KEY, JSON.stringify(INITIAL_DEMO_CUSTOMERS));
      }
    } catch {}
  }

  private normalizePhone(phone: string): string {
    return phone.replace(/[^0-9]/g, "");
  }

  private notifyListeners(): void {
    this.listeners.forEach((cb) => cb(this.currentCustomer));
  }
}

export const customerAuthStore = new CustomerAuthStore();

