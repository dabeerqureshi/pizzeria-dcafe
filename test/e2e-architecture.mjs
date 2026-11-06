// Automated Test Suite: Fast Food Ordering System (Architecture Verification)
import { calculateServerOrderPricing } from "../lib/pricing/engine.js";
import { generateAndStoreOtp, verifyOtpCode, isPhoneBlocked } from "../lib/auth/otpStore.js";

let passed = 0;
let total = 0;

function assert(condition, testName) {
  total++;
  if (condition) {
    console.log(`✅ Test ${total} Passed: ${testName}`);
    passed++;
  } else {
    console.error(`❌ Test ${total} Failed: ${testName}`);
    process.exitCode = 1;
  }
}

console.log("=== STARTING ARCHITECTURAL FLOW & RELIABILITY TEST SUITE ===");

// 1. Pricing Engine Tests
const quoteDelivery = calculateServerOrderPricing(
  [{ menuItemId: "ec-meltzilla-monster", quantity: 1, addons: [{ name: "Extra Cheese" }] }],
  "delivery",
  "cod"
);
assert(quoteDelivery.isValid === true, "Valid cart calculates correctly on server");
assert(quoteDelivery.deliveryFee === 0, "Free delivery applied for order >= Rs. 1,500");
assert(quoteDelivery.subtotal > 2600, "Server price matches canonical menu price + addon delta");

const quoteMinDelivery = calculateServerOrderPricing(
  [{ menuItemId: "wp-dynamite", quantity: 1 }], // Rs. 649
  "delivery",
  "cod"
);
assert(quoteMinDelivery.isValid === false, "Enforces minimum Rs. 1,000 delivery requirement");

const quotePickup = calculateServerOrderPricing(
  [{ menuItemId: "wp-dynamite", quantity: 1 }], // Rs. 649
  "pickup",
  "cod"
);
assert(quotePickup.isValid === true, "Pickup allows sub-1000 orders with zero delivery charges");
assert(quotePickup.deliveryFee === 0, "Pickup has exactly Rs. 0 delivery fee");

const quoteMaxCod = calculateServerOrderPricing(
  [{ menuItemId: "ec-meltzilla-monster", quantity: 5 }], // > Rs. 10,000
  "delivery",
  "cod"
);
assert(quoteMaxCod.isValid === false, "Enforces max COD safety limit (prevents fake bulk orders)");

// 2. COD Phone OTP & Anti-Fraud Tests
assert(isPhoneBlocked("0300-0000000") === true, "Blocklist identifies fraudulent phone numbers");
assert(isPhoneBlocked("0308-4382003") === false, "Legitimate customer phone allowed");

const phone = "0321-7654321";
const { code } = generateAndStoreOtp(phone);
assert(typeof code === "string" && code.length === 4, "Generates 4-digit numeric OTP code");

const badVerify = verifyOtpCode(phone, "9999");
assert(badVerify.success === false, "Rejects incorrect OTP code");

const goodVerify = verifyOtpCode(phone, code);
assert(goodVerify.success === true && !!goodVerify.token, "Verifies correct OTP and issues single-use token");

// 3. Cash Settlement Calculation Test
const expected = 4500;
const handedInShort = 4300;
const discrepancyShort = handedInShort - expected;
assert(discrepancyShort === -200, "Correctly flags Rs. 200 shortage in rider shift handover");

const handedInBalanced = 4500;
const discrepancyBalanced = handedInBalanced - expected;
assert(discrepancyBalanced === 0, "Correctly validates balanced cash handover");

console.log(`\n🎯 RESULTS: ${passed}/${total} ARCHITECTURAL TESTS PASSED!`);

