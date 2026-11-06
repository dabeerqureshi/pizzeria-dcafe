import { NextRequest, NextResponse } from "next/server";
import { calculateServerOrderPricing } from "@/lib/pricing/engine";
import { isWithinOperationalHours } from "@/lib/businessHours";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { items, fulfillmentType, paymentMethod } = body;

    const isOpen = isWithinOperationalHours();

    const pricing = calculateServerOrderPricing(
      items || [],
      fulfillmentType || "delivery",
      paymentMethod || "cod"
    );

    return NextResponse.json({
      success: pricing.isValid,
      isOpen,
      ...pricing,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to calculate quote." },
      { status: 400 }
    );
  }
}

