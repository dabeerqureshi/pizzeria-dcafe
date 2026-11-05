import React from "react";
import FoodSafetyBanner from "@/components/FoodSafetyBanner";
import Hero from "@/components/Hero";
import MenuSection from "@/components/menu/MenuSection";
import Footer from "@/components/Footer";

export default function HomePage() {
  return (
    <div className="flex flex-col min-h-screen">
      <FoodSafetyBanner />
      <Hero />
      <MenuSection />
      <Footer />
    </div>
  );
}

