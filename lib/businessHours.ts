export const KITCHEN_OVERRIDE_KEY = "pizzeria_dcafe_kitchen_status_v1";
export const KITCHEN_CUTOFF_MODE_KEY = "pizzeria_dcafe_cutoff_mode_v1";

export interface KitchenStatus {
  isOpen: boolean;
  reason: string;
  closingTimeStr: string;
  isOverride: boolean;
  overrideValue: "auto" | "forced_open" | "forced_closed";
  cutoffMode: "12_midnight" | "12_noon";
}

export function getKitchenStatus(): KitchenStatus {
  if (typeof window === "undefined") {
    return {
      isOpen: true,
      reason: "Open for orders",
      closingTimeStr: "12:00",
      isOverride: false,
      overrideValue: "auto",
      cutoffMode: "12_midnight",
    };
  }

  const storedOverride = (localStorage.getItem(KITCHEN_OVERRIDE_KEY) || "auto") as "auto" | "forced_open" | "forced_closed";
  const storedCutoffMode = (localStorage.getItem(KITCHEN_CUTOFF_MODE_KEY) || "12_midnight") as "12_midnight" | "12_noon";

  if (storedOverride === "forced_open") {
    return {
      isOpen: true,
      reason: "Kitchen manually set to OPEN by Admin (Override active)",
      closingTimeStr: "12:00",
      isOverride: true,
      overrideValue: "forced_open",
      cutoffMode: storedCutoffMode,
    };
  }

  if (storedOverride === "forced_closed") {
    return {
      isOpen: false,
      reason: "Kitchen is temporarily closed by Admin",
      closingTimeStr: "12:00",
      isOverride: true,
      overrideValue: "forced_closed",
      cutoffMode: storedCutoffMode,
    };
  }

  // Automatic schedule check
  const now = new Date();
  const currentHour = now.getHours(); // 0 to 23
  const currentMinutes = now.getMinutes();

  if (storedCutoffMode === "12_noon") {
    // If cutoff is 12:00 PM (noon), after 12:00 PM orders are closed
    const isPast12Noon = currentHour >= 12;
    if (isPast12Noon) {
      return {
        isOpen: false,
        reason: "Orders are closed after 12:00 PM as per Pizzeria D Café schedule.",
        closingTimeStr: "12:00 PM",
        isOverride: false,
        overrideValue: "auto",
        cutoffMode: "12_noon",
      };
    }
  } else {
    // Standard Late-Night closing: After 12:00 AM Midnight (00:00) until opening time 1:00 PM (13:00)
    // Between 00:00 and 12:59, kitchen is closed.
    const isClosedPastMidnight = currentHour >= 0 && currentHour < 12;
    if (isClosedPastMidnight) {
      return {
        isOpen: false,
        reason: "Orders are closed after 12:00 AM (Midnight). Kitchen reopens daily at 12:00 PM.",
        closingTimeStr: "12:00 AM (Midnight)",
        isOverride: false,
        overrideValue: "auto",
        cutoffMode: "12_midnight",
      };
    }
  }

  return {
    isOpen: true,
    reason: "Kitchen is currently taking orders! Freshly baked and delivered hot.",
    closingTimeStr: storedCutoffMode === "12_noon" ? "12:00 PM" : "12:00 AM (Midnight)",
    isOverride: false,
    overrideValue: "auto",
    cutoffMode: storedCutoffMode,
  };
}

export function isWithinOperationalHours(): boolean {
  return getKitchenStatus().isOpen;
}

export function setKitchenOverride(status: "auto" | "forced_open" | "forced_closed"): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(KITCHEN_OVERRIDE_KEY, status);
  window.dispatchEvent(new Event("kitchen_status_changed"));
  try {
    const bc = new BroadcastChannel("pizzeria_dcafe_realtime");
    bc.postMessage({ type: "KITCHEN_STATUS_UPDATE" });
  } catch {}
}

export function setKitchenCutoffMode(mode: "12_midnight" | "12_noon"): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(KITCHEN_CUTOFF_MODE_KEY, mode);
  window.dispatchEvent(new Event("kitchen_status_changed"));
  try {
    const bc = new BroadcastChannel("pizzeria_dcafe_realtime");
    bc.postMessage({ type: "KITCHEN_STATUS_UPDATE" });
  } catch {}
}

// Global browser listener to keep all tabs in sync
if (typeof window !== "undefined") {
  try {
    const bc = new BroadcastChannel("pizzeria_dcafe_realtime");
    bc.onmessage = (e) => {
      if (e.data?.type === "KITCHEN_STATUS_UPDATE") {
        window.dispatchEvent(new Event("kitchen_status_changed"));
      }
    };
  } catch {}

  window.addEventListener("storage", (e) => {
    if (e.key === KITCHEN_OVERRIDE_KEY || e.key === KITCHEN_CUTOFF_MODE_KEY) {
      window.dispatchEvent(new Event("kitchen_status_changed"));
    }
  });
}

