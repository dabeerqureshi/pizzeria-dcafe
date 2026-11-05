import type { Metadata } from "next";
import "./globals.css";
import Navbar from "@/components/Navbar";
import CartDrawer from "@/components/cart/CartDrawer";
import DChefBot from "@/components/ai/DChefBot";

export const metadata: Metadata = {
  title: "Pizzeria D Café | Freshly Baked Artisanal Pizzas & Fast Food",
  description: "Official online ordering for Pizzeria D Café. House Specials, Meltzilla Monster, Zingers, Wraps, and Loaded Fries with fast delivery.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-[#0b0f17] text-slate-100 antialiased selection:bg-amber-500 selection:text-black">
        <Navbar />
        <main className="min-h-[calc(100vh-140px)]">{children}</main>
        <CartDrawer />
        <DChefBot />
      </body>
    </html>
  );
}

