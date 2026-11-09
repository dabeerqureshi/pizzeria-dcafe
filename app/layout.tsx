import type { Metadata, Viewport } from "next";
import "./globals.css";
import Navbar from "@/components/Navbar";
import CartDrawer from "@/components/cart/CartDrawer";
import DChefBot from "@/components/ai/DChefBot";
import MobileCartBar from "@/components/cart/MobileCartBar";
import CustomerAuthModal from "@/components/auth/CustomerAuthModal";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: "#0b0f17",
};

export const metadata: Metadata = {
  title: "Pizzeria D Café | Freshly Baked Artisanal Pizzas & Fast Food",
  description: "Official online ordering for Pizzeria D Café Lahore. House Specials, Meltzilla Monster, Zingers, Wraps, and Loaded Fries with fast delivery.",
  applicationName: "Pizzeria D Café",
  authors: [{ name: "Pizzeria D Café" }],
  keywords: ["Pizzeria D Cafe", "Lahore pizza delivery", "Meltzilla Monster", "Stuffed crust", "Zinger burgers", "Pizza fries"],
  icons: {
    icon: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>🍕</text></svg>",
  },
  openGraph: {
    title: "Pizzeria D Café | Freshly Baked Artisanal Pizzas & Fast Food",
    description: "Order fresh stuffed crust pizzas, Meltzilla Monsters, Zingers & Loaded Fries online. Hotline: 0308-4382003.",
    siteName: "Pizzeria D Café",
    locale: "en_PK",
    type: "website",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Pizzeria D Café",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="scroll-smooth">
      <body className="min-h-screen bg-[#0b0f17] text-slate-100 antialiased selection:bg-amber-500 selection:text-black">
        <Navbar />
        <main className="min-h-[calc(100vh-140px)] pb-16 md:pb-0">{children}</main>
        <CartDrawer />
        <DChefBot />
        <MobileCartBar />
        <CustomerAuthModal />
      </body>
    </html>
  );
}

