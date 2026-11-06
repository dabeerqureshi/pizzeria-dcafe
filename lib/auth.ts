/**
 * Cryptographically Secure Admin Authentication Utility
 * Uses Web Crypto API (HMAC-SHA256) compatible with Next.js Edge Middleware and Node.js
 */

function getSecretKey(): string {
  const secret = process.env.ADMIN_PASSWORD || "pizzeria123_secure_salt_key_2026";
  const user = process.env.ADMIN_USERNAME || "admin";
  return `${user}:::${secret}:::pizzeria_dcafe_secure_auth`;
}

export async function createAdminSessionToken(username: string): Promise<string> {
  const timestamp = Date.now().toString();
  const data = `${username}:${timestamp}`;
  const enc = new TextEncoder();
  
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(getSecretKey()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  
  const signature = await crypto.subtle.sign("HMAC", key, enc.encode(data));
  const hexSig = Array.from(new Uint8Array(signature))
    .map(b => b.toString(16).padStart(2, "0"))
    .join("");
    
  return `${data}:${hexSig}`;
}

export async function verifyAdminSessionToken(token: string | undefined | null): Promise<boolean> {
  if (!token || typeof token !== "string") return false;
  
  const parts = token.split(":");
  if (parts.length !== 3) return false;
  
  const [username, timestamp, providedSig] = parts;
  const timeNum = parseInt(timestamp, 10);
  if (isNaN(timeNum)) return false;
  
  // 7 days expiration check
  const maxAge = 7 * 24 * 60 * 60 * 1000;
  const elapsed = Date.now() - timeNum;
  if (elapsed < 0 || elapsed > maxAge) return false;
  
  const data = `${username}:${timestamp}`;
  const enc = new TextEncoder();
  
  try {
    const key = await crypto.subtle.importKey(
      "raw",
      enc.encode(getSecretKey()),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );
    
    const signature = await crypto.subtle.sign("HMAC", key, enc.encode(data));
    const expectedSig = Array.from(new Uint8Array(signature))
      .map(b => b.toString(16).padStart(2, "0"))
      .join("");
      
    return providedSig === expectedSig;
  } catch {
    return false;
  }
}

