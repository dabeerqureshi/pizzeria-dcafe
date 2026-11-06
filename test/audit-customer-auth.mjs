// Automated Customer Auth Test Suite (KFC-Style Flow)
import { customerAuthStore } from "../lib/store/customerAuthStore.js";

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

console.log("=== STARTING KFC-STYLE CUSTOMER AUTH AUDIT ===");

// 1. Phone Registration Check
const unregisteredCheck = customerAuthStore.checkPhoneRegistered("0311-9988771");
assert(unregisteredCheck.isRegistered === false, "Recognizes first-time customer phone number");

const registeredCheck = customerAuthStore.checkPhoneRegistered("0300-1234567");
assert(registeredCheck.isRegistered === true && registeredCheck.customerName === "Hamza Tariq", "Recognizes returning customer and returns customer name");

// 2. First-time Registration Flow
const newPhone = `0345-${Math.floor(1000000 + Math.random() * 9000000)}`;
const regResult = customerAuthStore.register({
  phone: newPhone,
  fullName: "Bilal Ahmad",
  pin: "5566",
  addressLine: "House 12, Street 4, DHA Phase 6, Lahore",
  landmark: "Near Raya Club",
});

assert(regResult.success === true, "Creates new customer account on 1st time");
assert(regResult.customer.fullName === "Bilal Ahmad", "Saves customer profile full name");
assert(regResult.customer.defaultAddress.includes("DHA Phase 6"), "Stores default delivery address");

// Duplicate registration rejection
const duplicateReg = customerAuthStore.register({
  phone: newPhone,
  fullName: "Bilal Ahmad Clone",
  pin: "5566",
});
assert(duplicateReg.success === false, "Rejects duplicate registration of existing phone number");

// 3. Second-time Login Flow
customerAuthStore.logout();
assert(customerAuthStore.isAuthenticated() === false, "Customer session cleared on logout");

// Wrong PIN
const wrongPinLogin = customerAuthStore.login(newPhone, "0000");
assert(wrongPinLogin.success === false, "Rejects incorrect 4-digit PIN on login");

// Correct PIN (2nd time login)
const correctPinLogin = customerAuthStore.login(newPhone, "5566");
assert(correctPinLogin.success === true, "Logs in returning customer with correct PIN");
assert(customerAuthStore.getCustomer()?.phone === newPhone, "Session restored with saved delivery details");

console.log(`\n🎯 RESULTS: ${passed}/${total} KFC-STYLE AUTH TESTS PASSED!`);

