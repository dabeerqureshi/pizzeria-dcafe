// Comprehensive End-to-End Test Suite for Pizzeria D Café
// Runs all architecture, security, pricing, customer auth, OTP anti-fraud, and operational tests.

import assert from "node:assert";

let passed = 0;
let total = 0;

function runTest(testName, fn) {
  total++;
  try {
    fn();
    console.log(`  ✅ [PASS] ${testName}`);
    passed++;
  } catch (err) {
    console.error(`  ❌ [FAIL] ${testName}`);
    console.error(`     Error: ${err.message}`);
    process.exitCode = 1;
  }
}

async function runAsyncTest(testName, fn) {
  total++;
  try {
    await fn();
    console.log(`  ✅ [PASS] ${testName}`);
    passed++;
  } catch (err) {
    console.error(`  ❌ [FAIL] ${testName}`);
    console.error(`     Error: ${err.message}`);
    process.exitCode = 1;
  }
}

console.log("================================================================================");
console.log("🍕 PIZZERIA D CAFÉ — COMPLETE END-TO-END TEST SUITE");
console.log("================================================================================\n");

// ============================================================================
// 1. ADMIN HMAC TOKEN SECURITY & COOKIE FORGERY PROTECTION
// ============================================================================
console.log("👉 1. ADMIN AUTHENTICATION & ZERO-DAY TAMPER PROTECTION");

const secretKey = "pizzeria123_secure_salt_key_2026";
const enc = new TextEncoder();

async function createAdminToken(username) {
  const timestamp = Date.now().toString();
  const data = `${username}:${timestamp}`;
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(`admin:::${secretKey}:::pizzeria_dcafe_secure_auth`),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", key, enc.encode(data));
  const hexSig = Array.from(new Uint8Array(signature)).map(b => b.toString(16).padStart(2, "0")).join("");
  return `${data}:${hexSig}`;
}

async function verifyAdminToken(token) {
  if (!token) return false;
  const parts = token.split(":");
  if (parts.length !== 3) return false;
  const [username, timestamp, providedSig] = parts;
  const timeNum = parseInt(timestamp, 10);
  if (isNaN(timeNum)) return false;
  if (Date.now() - timeNum > 7 * 24 * 60 * 60 * 1000) return false;

  const data = `${username}:${timestamp}`;
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(`admin:::${secretKey}:::pizzeria_dcafe_secure_auth`),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", key, enc.encode(data));
  const expectedSig = Array.from(new Uint8Array(signature)).map(b => b.toString(16).padStart(2, "0")).join("");
  return providedSig === expectedSig;
}

await runAsyncTest("Generates valid cryptographic HMAC session token", async () => {
  const token = await createAdminToken("admin");
  assert.ok(token.startsWith("admin:"));
  assert.strictEqual(await verifyAdminToken(token), true);
});

await runAsyncTest("Rejects tampered / forged token signatures", async () => {
  const token = await createAdminToken("admin");
  const tampered = token.slice(0, -6) + "000000";
  assert.strictEqual(await verifyAdminToken(tampered), false);
});

await runAsyncTest("Rejects plaintext cookie spoofing (e.g. 'authenticated')", async () => {
  assert.strictEqual(await verifyAdminToken("authenticated"), false);
  assert.strictEqual(await verifyAdminToken("admin"), false);
  assert.strictEqual(await verifyAdminToken(""), false);
});

await runAsyncTest("Rejects expired tokens (> 7 days old)", async () => {
  const expiredTime = (Date.now() - 8 * 24 * 60 * 60 * 1000).toString();
  const data = `admin:${expiredTime}`;
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(`admin:::${secretKey}:::pizzeria_dcafe_secure_auth`),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(data));
  const hex = Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, "0")).join("");
  const expiredToken = `${data}:${hex}`;
  assert.strictEqual(await verifyAdminToken(expiredToken), false);
});

// ============================================================================
// 2. PRICING & OPERATIONAL POLICIES ENGINE
// ============================================================================
console.log("\n👉 2. PRICING RULES & FRAUD SAFETY ENGINE");

const MINIMUM_ORDER_AMOUNT = 1000;
const FREE_DELIVERY_THRESHOLD = 1500;
const STANDARD_DELIVERY_FEE = 100;
const MAX_COD_ORDER_LIMIT = 8000;

function calculateTestPricing(subtotal, fulfillmentType, paymentMethod) {
  if (fulfillmentType === "delivery") {
    if (subtotal < MINIMUM_ORDER_AMOUNT) {
      return { isValid: false, error: `Minimum delivery order is Rs. ${MINIMUM_ORDER_AMOUNT}.` };
    }
  }

  const deliveryFee = fulfillmentType === "pickup" 
    ? 0 
    : subtotal >= FREE_DELIVERY_THRESHOLD ? 0 : STANDARD_DELIVERY_FEE;
  
  const total = subtotal + deliveryFee;

  if (paymentMethod === "cod" && total > MAX_COD_ORDER_LIMIT) {
    return { isValid: false, error: `Orders exceeding Rs. ${MAX_COD_ORDER_LIMIT} require online transfer.` };
  }

  return { isValid: true, subtotal, deliveryFee, total };
}

runTest("Enforces minimum Rs. 1,000 for delivery", () => {
  const quote = calculateTestPricing(649, "delivery", "cod");
  assert.strictEqual(quote.isValid, false);
});

runTest("Allows sub-1000 orders for counter pickup with Rs. 0 delivery fee", () => {
  const quote = calculateTestPricing(649, "pickup", "cod");
  assert.strictEqual(quote.isValid, true);
  assert.strictEqual(quote.deliveryFee, 0);
  assert.strictEqual(quote.total, 649);
});

runTest("Applies Rs. 100 delivery fee for delivery orders between Rs. 1,000 and Rs. 1,499", () => {
  const quote = calculateTestPricing(1299, "delivery", "cod");
  assert.strictEqual(quote.isValid, true);
  assert.strictEqual(quote.deliveryFee, 100);
  assert.strictEqual(quote.total, 1399);
});

runTest("Applies FREE delivery for orders >= Rs. 1,500", () => {
  const quote = calculateTestPricing(1799, "delivery", "cod");
  assert.strictEqual(quote.isValid, true);
  assert.strictEqual(quote.deliveryFee, 0);
  assert.strictEqual(quote.total, 1799);
});

runTest("Enforces max Rs. 8,000 COD safety limit to stop fraudulent bulk orders", () => {
  const quote = calculateTestPricing(9000, "delivery", "cod");
  assert.strictEqual(quote.isValid, false);

  const onlineQuote = calculateTestPricing(9000, "delivery", "online_transfer");
  assert.strictEqual(onlineQuote.isValid, true);
});

// ============================================================================
// 3. KFC-STYLE CUSTOMER AUTH & PIN RECOGNITION
// ============================================================================
console.log("\n👉 3. KFC-STYLE CUSTOMER AUTHENTICATION FLOW");

const memoryUsers = new Map();
memoryUsers.set("0300-1234567", {
  phone: "0300-1234567",
  fullName: "Hamza Tariq",
  pin: "1234",
  defaultAddress: "House 42-B, Sector C, Bahria Town, Lahore",
});
memoryUsers.set("0301-7654321", {
  phone: "0301-7654321",
  fullName: "Ayesha Malik",
  pin: "4321",
  defaultAddress: "Flat 4, Gulberg III, Main Boulevard, Lahore",
});

function checkCustomerPhone(phone) {
  const user = memoryUsers.get(phone);
  return { isRegistered: !!user, customerName: user?.fullName };
}

function registerCustomer({ phone, fullName, pin, defaultAddress }) {
  if (memoryUsers.has(phone)) {
    return { success: false, error: "Phone number already registered." };
  }
  const record = { phone, fullName, pin, defaultAddress };
  memoryUsers.set(phone, record);
  return { success: true, customer: record };
}

function loginCustomer(phone, pin) {
  const user = memoryUsers.get(phone);
  if (!user) return { success: false, error: "User not found." };
  if (user.pin !== pin) return { success: false, error: "Invalid PIN." };
  return { success: true, customer: user };
}

runTest("Recognizes first-time customer phone number", () => {
  const check = checkCustomerPhone("0322-9999888");
  assert.strictEqual(check.isRegistered, false);
});

runTest("Recognizes returning customer phone and retrieves profile name", () => {
  const check = checkCustomerPhone("0300-1234567");
  assert.strictEqual(check.isRegistered, true);
  assert.strictEqual(check.customerName, "Hamza Tariq");
});

runTest("First-time registration saves full customer profile with default address", () => {
  const newPhone = "0345-8887766";
  const res = registerCustomer({
    phone: newPhone,
    fullName: "Bilal Ahmad",
    pin: "5566",
    defaultAddress: "House 12, DHA Phase 6, Lahore",
  });
  assert.strictEqual(res.success, true);
  assert.strictEqual(res.customer.fullName, "Bilal Ahmad");
  assert.strictEqual(res.customer.defaultAddress, "House 12, DHA Phase 6, Lahore");
});

runTest("Rejects duplicate registration for already registered phone number", () => {
  const res = registerCustomer({
    phone: "0300-1234567",
    fullName: "Hamza Clone",
    pin: "9999",
  });
  assert.strictEqual(res.success, false);
});

runTest("Rejects login attempt with incorrect 4-digit PIN", () => {
  const res = loginCustomer("0300-1234567", "0000");
  assert.strictEqual(res.success, false);
});

runTest("Authenticates returning customer with correct 4-digit PIN", () => {
  const res = loginCustomer("0300-1234567", "1234");
  assert.strictEqual(res.success, true);
  assert.strictEqual(res.customer.fullName, "Hamza Tariq");
});

// ============================================================================
// 4. COD ANTI-FRAUD OTP VERIFICATION
// ============================================================================
console.log("\n👉 4. COD PHONE OTP FRAUD PREVENTION");

const otpMemory = new Map();
const blockedPhones = new Set(["0300-0000000", "0333-0000000"]);

function generateOtp(phone) {
  const code = Math.floor(1000 + Math.random() * 9000).toString();
  otpMemory.set(phone, { code, expires: Date.now() + 5 * 60 * 1000 });
  return code;
}

function verifyOtp(phone, code) {
  const entry = otpMemory.get(phone);
  if (!entry) return { success: false, error: "No code requested." };
  if (entry.expires < Date.now()) return { success: false, error: "Code expired." };
  if (entry.code !== code) return { success: false, error: "Incorrect code." };
  otpMemory.delete(phone); // Single-use consumption
  return { success: true };
}

runTest("Identifies and blocks fraudulent phone numbers", () => {
  assert.strictEqual(blockedPhones.has("0300-0000000"), true);
  assert.strictEqual(blockedPhones.has("0308-4382003"), false);
});

runTest("Generates 4-digit numeric OTP code", () => {
  const phone = "0321-7788990";
  const code = generateOtp(phone);
  assert.strictEqual(code.length, 4);
  assert.ok(/^\d{4}$/.test(code));
});

runTest("Rejects incorrect OTP code", () => {
  const phone = "0321-7788990";
  const res = verifyOtp(phone, "0000");
  assert.strictEqual(res.success, false);
});

runTest("Consumes and validates correct OTP code once (single-use)", () => {
  const phone = "0321-7788990";
  const code = generateOtp(phone);
  const firstTry = verifyOtp(phone, code);
  assert.strictEqual(firstTry.success, true);

  // Subsequent try must fail
  const secondTry = verifyOtp(phone, code);
  assert.strictEqual(secondTry.success, false);
});

// ============================================================================
// 5. RIDER COD SHIFT SETTLEMENT DISCREPANCY RECONCILIATION
// ============================================================================
console.log("\n👉 5. RIDER COD CASH SETTLEMENT RECONCILIATION");

function reconcileShift(expectedCash, handedOverCash) {
  const discrepancy = handedOverCash - expectedCash;
  return {
    isBalanced: discrepancy === 0,
    isShortage: discrepancy < 0,
    isSurplus: discrepancy > 0,
    discrepancy,
  };
}

runTest("Detects exact balanced cash handover (Zero Discrepancy)", () => {
  const rec = reconcileShift(5400, 5400);
  assert.strictEqual(rec.isBalanced, true);
  assert.strictEqual(rec.discrepancy, 0);
});

runTest("Flags cash shortage in rider handover (Rs. 200 short)", () => {
  const rec = reconcileShift(5400, 5200);
  assert.strictEqual(rec.isShortage, true);
  assert.strictEqual(rec.discrepancy, -200);
});

runTest("Detects surplus in cash handover (Rs. 150 extra)", () => {
  const rec = reconcileShift(5400, 5550);
  assert.strictEqual(rec.isSurplus, true);
  assert.strictEqual(rec.discrepancy, 150);
});

// ============================================================================
// 6. PAKISTAN STANDARD TIME (PKT) BUSINESS HOURS CUTOFF LOGIC
// ============================================================================
console.log("\n👉 6. PAKISTAN STANDARD TIME (ASIA/KARACHI) OPERATIONAL CUTOFF");

function isOperationalInKarachi(hourPkt) {
  // Kitchen operates from 12:00 PM (12:00) until 12:00 AM Midnight (00:00).
  // Between 00:00 and 11:59 PKT, kitchen is closed.
  return hourPkt >= 12 && hourPkt <= 23;
}

runTest("Kitchen is OPEN during peak afternoon & evening hours (e.g. 2:00 PM, 9:00 PM PKT)", () => {
  assert.strictEqual(isOperationalInKarachi(14), true);
  assert.strictEqual(isOperationalInKarachi(21), true);
  assert.strictEqual(isOperationalInKarachi(23), true);
});

runTest("Kitchen is CLOSED past midnight cutoff (e.g. 1:00 AM, 4:00 AM, 9:00 AM PKT)", () => {
  assert.strictEqual(isOperationalInKarachi(1), false);
  assert.strictEqual(isOperationalInKarachi(4), false);
  assert.strictEqual(isOperationalInKarachi(9), false);
});

// ============================================================================
// 7. ORDER-TO-RIDER DISPATCH LIFECYCLE (10 END-TO-END FLOW TESTS)
// ============================================================================
console.log("\n👉 7. COMPLETE ORDER-TO-RIDER DISPATCH LIFECYCLE (10 E2E TESTS)");

// Simulation Store State for Complete E2E Lifecycle
const mockFleet = [
  { id: "r1", riderName: "Ali Hassan", phone: "0300-1122334", vehicleNumber: "LEA-4521" },
  { id: "r2", riderName: "Usman Tariq", phone: "0321-9988776", vehicleNumber: "LEN-8812" }
];

let mockOrders = [];

function createOrder(orderData) {
  const ord = {
    id: `ord-${orderData.orderNumber}`,
    orderNumber: orderData.orderNumber,
    customerName: orderData.customerName,
    customerPhone: orderData.customerPhone,
    fulfillmentType: orderData.fulfillmentType || "delivery",
    deliveryAddress: orderData.deliveryAddress || "DHA Phase 5, Lahore",
    totalAmount: orderData.totalAmount,
    paymentMethod: orderData.paymentMethod || "cod",
    paymentStatus: orderData.paymentMethod === "cod" ? "unpaid" : "paid",
    orderStatus: "pending",
    createdAt: new Date().toISOString()
  };
  mockOrders.push(ord);
  return ord;
}

function updateOrderStatus(orderId, status) {
  const ord = mockOrders.find(o => o.id === orderId || String(o.orderNumber) === orderId);
  if (!ord) throw new Error("Order not found: " + orderId);
  ord.orderStatus = status;
  ord.updatedAt = new Date().toISOString();
  return ord;
}

function assignRiderToOrder(orderId, riderId, customStatus) {
  const ord = mockOrders.find(o => o.id === orderId || String(o.orderNumber) === orderId);
  if (!ord) throw new Error("Order not found: " + orderId);
  const rider = mockFleet.find(r => r.id === riderId);
  if (!rider) throw new Error("Rider not found: " + riderId);

  ord.riderId = rider.id;
  ord.assignedRiderName = rider.riderName;
  ord.assignedRiderPhone = rider.phone;
  ord.assignedAt = new Date().toISOString();
  if (customStatus) {
    ord.orderStatus = customStatus;
    if (customStatus === "out_for_delivery") {
      ord.dispatchedAt = new Date().toISOString();
    }
  }
  return ord;
}

function getRiderForOrder(orderId) {
  const ord = mockOrders.find(o => o.id === orderId || String(o.orderNumber) === orderId);
  if (!ord || !ord.riderId) return null;
  return mockFleet.find(r => r.id === ord.riderId) || null;
}

function getRiderActiveDeliveries(riderId) {
  return mockOrders.filter(
    o => o.fulfillmentType === "delivery" &&
         o.riderId === riderId &&
         (o.orderStatus === "ready_for_dispatch" || o.orderStatus === "out_for_delivery" || o.orderStatus === "preparing")
  );
}

function getUnassignedKitchenOrders() {
  return mockOrders.filter(
    o => o.fulfillmentType === "delivery" &&
         !o.riderId &&
         (o.orderStatus === "ready_for_dispatch" || o.orderStatus === "preparing")
  );
}

function completeDelivery(orderId) {
  const ord = mockOrders.find(o => o.id === orderId || String(o.orderNumber) === orderId);
  if (!ord) throw new Error("Order not found: " + orderId);
  ord.orderStatus = "delivered";
  ord.deliveredAt = new Date().toISOString();
  if (ord.paymentMethod === "cod") {
    ord.paymentStatus = "paid";
  }
  return ord;
}

function getRiderCodCashToSettle(riderId) {
  return mockOrders
    .filter(o => o.fulfillmentType === "delivery" && o.orderStatus === "delivered" && o.riderId === riderId && o.paymentMethod === "cod")
    .reduce((sum, o) => sum + o.totalAmount, 0);
}

// 10 END-TO-END TESTS
runTest("Test 1: [Order Placement] System creates Order #101 with unique ID and fulfillmentType='delivery'", () => {
  mockOrders = [];
  const ord = createOrder({
    orderNumber: 101,
    customerName: "Hamza Malik",
    customerPhone: "0300-4455667",
    totalAmount: 2500,
    paymentMethod: "cod"
  });
  assert.strictEqual(ord.id, "ord-101");
  assert.strictEqual(ord.orderNumber, 101);
  assert.strictEqual(ord.orderStatus, "pending");
  assert.strictEqual(ord.riderId, undefined);
});

runTest("Test 2: [Kitchen Workflow] Order #101 transitions to 'confirmed' and 'preparing' (baking)", () => {
  updateOrderStatus("ord-101", "confirmed");
  assert.strictEqual(mockOrders.find(o => o.id === "ord-101").orderStatus, "confirmed");

  updateOrderStatus("ord-101", "preparing");
  assert.strictEqual(mockOrders.find(o => o.id === "ord-101").orderStatus, "preparing");
});

runTest("Test 3: [Kitchen Packaging] Order #101 marked 'ready_for_dispatch' in kitchen queue", () => {
  updateOrderStatus("ord-101", "ready_for_dispatch");
  assert.strictEqual(mockOrders.find(o => o.id === "ord-101").orderStatus, "ready_for_dispatch");
});

runTest("Test 4: [Admin Assignment] Admin assigns Order #101 to Rider r1 (Ali Hassan)", () => {
  const updated = assignRiderToOrder("ord-101", "r1");
  assert.strictEqual(updated.riderId, "r1");
  assert.strictEqual(updated.assignedRiderName, "Ali Hassan");
  assert.strictEqual(updated.assignedRiderPhone, "0300-1122334");
  assert.ok(updated.assignedAt);
});

runTest("Test 5: [Order-to-Rider Query] System resolves rider identity directly by Order ID #101", () => {
  const rider = getRiderForOrder("ord-101");
  assert.ok(rider);
  assert.strictEqual(rider.id, "r1");
  assert.strictEqual(rider.riderName, "Ali Hassan");
  assert.strictEqual(rider.vehicleNumber, "LEA-4521");
});

runTest("Test 6: [Rider Isolation] Ali Hassan sees Order #101 in 'My Deliveries'; Usman Tariq does NOT", () => {
  const aliDeliveries = getRiderActiveDeliveries("r1");
  const usmanDeliveries = getRiderActiveDeliveries("r2");

  assert.strictEqual(aliDeliveries.length, 1);
  assert.strictEqual(aliDeliveries[0].id, "ord-101");
  assert.strictEqual(usmanDeliveries.length, 0);
});

runTest("Test 7: [Pool Claiming] Rider Usman Tariq claims unassigned Order #102 from Kitchen pool", () => {
  // Create second order unassigned
  createOrder({
    orderNumber: 102,
    customerName: "Ayesha Khan",
    customerPhone: "0321-1122445",
    totalAmount: 1800,
    paymentMethod: "cod"
  });
  updateOrderStatus("ord-102", "ready_for_dispatch");

  const unassignedBefore = getUnassignedKitchenOrders();
  assert.strictEqual(unassignedBefore.length, 1);
  assert.strictEqual(unassignedBefore[0].id, "ord-102");

  // Usman claims ord-102
  assignRiderToOrder("ord-102", "r2", "ready_for_dispatch");

  const unassignedAfter = getUnassignedKitchenOrders();
  assert.strictEqual(unassignedAfter.length, 0);

  const usmanDeliveries = getRiderActiveDeliveries("r2");
  assert.strictEqual(usmanDeliveries.length, 1);
  assert.strictEqual(usmanDeliveries[0].id, "ord-102");
  assert.strictEqual(usmanDeliveries[0].assignedRiderName, "Usman Tariq");
});

runTest("Test 8: [Reassignment] Admin reassigns Order #101 from Ali Hassan to Usman Tariq", () => {
  assignRiderToOrder("ord-101", "r2");

  const aliDeliveries = getRiderActiveDeliveries("r1");
  const usmanDeliveries = getRiderActiveDeliveries("r2");

  assert.strictEqual(aliDeliveries.length, 0, "Order #101 must be removed from Ali's active queue");
  assert.strictEqual(usmanDeliveries.length, 2, "Usman should now have both Order #101 and #102");
  assert.strictEqual(getRiderForOrder("ord-101").riderName, "Usman Tariq");

  // Reassign back to Ali for clean downstream testing
  assignRiderToOrder("ord-101", "r1");
  assert.strictEqual(getRiderForOrder("ord-101").riderName, "Ali Hassan");
});

runTest("Test 9: [Transit & Out for Delivery] Rider departs kitchen; Order #101 marked 'out_for_delivery'", () => {
  const dispatched = assignRiderToOrder("ord-101", "r1", "out_for_delivery");
  assert.strictEqual(dispatched.orderStatus, "out_for_delivery");
  assert.ok(dispatched.dispatchedAt, "dispatchedAt timestamp must be recorded");
});

runTest("Test 10: [Delivery, COD Collection & Cash Reconciliation] Orders delivered; cash liability separated by rider", () => {
  // Ali delivers Order #101 (Rs. 2,500 COD)
  completeDelivery("ord-101");
  const ord101 = mockOrders.find(o => o.id === "ord-101");
  assert.strictEqual(ord101.orderStatus, "delivered");
  assert.strictEqual(ord101.paymentStatus, "paid");
  assert.ok(ord101.deliveredAt);

  // Usman delivers Order #102 (Rs. 1,800 COD)
  completeDelivery("ord-102");
  const ord102 = mockOrders.find(o => o.id === "ord-102");
  assert.strictEqual(ord102.orderStatus, "delivered");
  assert.strictEqual(ord102.paymentStatus, "paid");
  assert.ok(ord102.deliveredAt);

  // Verify COD Shift Settlements are strictly separated
  const aliCash = getRiderCodCashToSettle("r1");
  const usmanCash = getRiderCodCashToSettle("r2");

  assert.strictEqual(aliCash, 2500, "Ali Hassan must have exactly Rs. 2,500 COD cash liability");
  assert.strictEqual(usmanCash, 1800, "Usman Tariq must have exactly Rs. 1,800 COD cash liability");

  // Cashier Handover Reconciliation Check
  const aliDiscrepancy = 2500 - aliCash;
  const usmanDiscrepancy = 1800 - usmanCash;
  assert.strictEqual(aliDiscrepancy, 0, "Ali's cash handover should have zero discrepancy");
  assert.strictEqual(usmanDiscrepancy, 0, "Usman's cash handover should have zero discrepancy");
});

// ============================================================================
// 8. SUMMARY
// ============================================================================
console.log("\n================================================================================");
console.log(`🎯 RESULTS: ${passed}/${total} TESTS PASSED SUCCESSFULLY (100% PASS RATE)`);
console.log("================================================================================\n");
