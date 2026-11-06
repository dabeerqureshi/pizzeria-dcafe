import crypto from "crypto";

interface OtpEntry {
  phone: string;
  code: string;
  expiresAt: number;
  attempts: number;
  verified: boolean;
  verificationToken?: string;
}

// In-memory OTP registry (falls back to resilient token verification)
const otpMap = new Map<string, OtpEntry>();

// Built-in blocked numbers for fraud protection
const BLOCKED_PHONES = new Set([
  "0300-0000000",
  "0312-3456789",
  "0333-0000000"
]);

export function isPhoneBlocked(phone: string): boolean {
  const cleanPhone = phone.replace(/\s+/g, "").trim();
  return BLOCKED_PHONES.has(cleanPhone);
}

export function generateAndStoreOtp(phone: string): { code: string; expiresAt: number } {
  const cleanPhone = phone.replace(/\s+/g, "").trim();
  
  // Clean expired
  const now = Date.now();
  for (const [k, v] of otpMap.entries()) {
    if (v.expiresAt < now) {
      otpMap.delete(k);
    }
  }

  // 4-digit random OTP
  const code = Math.floor(1000 + Math.random() * 9000).toString();
  const expiresAt = now + 5 * 60 * 1000; // 5 minutes

  otpMap.set(cleanPhone, {
    phone: cleanPhone,
    code,
    expiresAt,
    attempts: 0,
    verified: false,
  });

  return { code, expiresAt };
}

export function verifyOtpCode(phone: string, inputCode: string): { success: boolean; token?: string; error?: string } {
  const cleanPhone = phone.replace(/\s+/g, "").trim();
  const entry = otpMap.get(cleanPhone);

  if (!entry) {
    return { success: false, error: "No OTP requested for this phone number or it has expired." };
  }

  if (entry.expiresAt < Date.now()) {
    otpMap.delete(cleanPhone);
    return { success: false, error: "OTP has expired. Please request a new code." };
  }

  if (entry.attempts >= 4) {
    otpMap.delete(cleanPhone);
    return { success: false, error: "Too many incorrect attempts. Please request a new code." };
  }

  entry.attempts += 1;

  if (entry.code !== inputCode.trim()) {
    return { success: false, error: `Invalid code. ${4 - entry.attempts} attempts remaining.` };
  }

  // Success: issue single-use verification token
  const token = crypto.randomBytes(16).toString("hex");
  entry.verified = true;
  entry.verificationToken = token;

  return { success: true, token };
}

export function validateVerificationToken(phone: string, token: string): boolean {
  const cleanPhone = phone.replace(/\s+/g, "").trim();
  const entry = otpMap.get(cleanPhone);
  if (!entry) return false;
  
  if (entry.verified && entry.verificationToken === token && entry.expiresAt > Date.now()) {
    // Consume token (single use)
    otpMap.delete(cleanPhone);
    return true;
  }
  return false;
}

