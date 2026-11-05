# Pizzeria D Café - Modern Web Ordering & Kitchen Dispatch POS

A purpose-built, high-conversion web ordering application and live kitchen dispatch system tailored specifically for **Pizzeria D Café** (Lahore, Pakistan • Hotline: `0308-4382003` • `@pizzeriadcafe`).

---

## 🍕 Core Operational Solutions

| Problem at Pizzeria D Café | How This System Solves It |
|---|---|
| **Manual WhatsApp / Call Chaos** | Interactive customer catalog with pizza sizing (Small/Medium/Large), extra toppings (+Rs. 150/250/300), minimum order enforcement (Rs. 1,000), and free delivery over Rs. 1,500. |
| **Fake Transfer Receipts & No Card Machine** | Direct support for Pakistani wallets (Easypaisa, JazzCash, SadaPay, NayaPay, Bank Alfalah) with **Google Gemini Vision OCR** verifying transaction IDs (TIDs), amounts, and timestamps automatically. |
| **Kitchen Rush Hour Confusion** | Real-time Kanban board (`/admin/orders`) with instant audio chime alerts for incoming orders, status transitions, and 1-click **80mm ESC/POS thermal printer** slips. |
| **Customer Indecision During Calls** | **D-Chef AI Concierge**: Roman Urdu + English conversational assistant powered by Gemini Flash that recommends combos and adds items straight to cart. |

---

## 🛠️ Tech Stack

- **Framework**: Next.js 15 (App Router, TypeScript, React 19)
- **Styling**: Tailwind CSS with custom warm charcoal & amber brand palette
- **AI Engine**: Google Gemini 2.5 Flash (`@google/genai`) for Receipt OCR & Roman Urdu food concierge
- **Database & Realtime**: PostgreSQL / Supabase Realtime (with seamless multi-tab reactive local storage fallback)
- **Audio Alerts**: Zero-latency Web Audio API synthesizers for kitchen chimes
- **Printing**: Native CSS `@media print` formatted for continuous 80mm ESC/POS thermal paper rolls

---

## 🚀 Getting Started

### 1. Install Dependencies
```bash
npm install
```

### 2. Environment Variables
Copy `.env.example` to `.env.local`:
```bash
cp .env.example .env.local
```
Add your `GEMINI_API_KEY` (and optionally your Supabase credentials).

### 3. Start Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 📱 Portals & Key Routes

- **Customer Storefront**: `/` (Browse House Specials, Meltzilla Monster, Zingers, Wraps, Fries)
- **Checkout**: `/checkout` (Delivery address, COD or Online Transfer, screenshot upload & AI verification)
- **Live Order Tracker**: `/order/[id]` (Real-time progress, receipt breakdown, 1-click WhatsApp backup)
- **Kitchen Live Kanban**: `/admin/orders` (Sound chimes, order cards, receipt verification, status pipeline)
- **80mm Thermal Receipt**: `/admin/orders/print/[id]` (1-click counter slip print)
- **Stock Manager**: `/admin/menu` (1-click Sold Out toggles)

---

## 🖨️ Thermal Receipt Printing
The kitchen ticket is optimized specifically for 80mm continuous thermal printer rolls (72mm printable area). When the kitchen staff clicks **Print Slip**, the browser prints directly to any connected USB, Ethernet, or Bluetooth ESC/POS receipt printer without needing third-party drivers or software.
