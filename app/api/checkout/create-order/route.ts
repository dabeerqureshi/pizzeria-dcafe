import { NextRequest, NextResponse } from "next/server";
import { calculateServerOrderPricing } from "@/lib/pricing/engine";
import { isWithinOperationalHours } from "@/lib/businessHours";
import { isPhoneBlocked } from "@/lib/auth/otpStore";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  try {
    const idempotencyKey =
      req.headers.get("x-idempotency-key") ||
      req.headers.get("idempotency-key") ||
      `idem-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

    const body = await req.json();
    const {
      customerName,
      customerPhone,
      fulfillmentType = "delivery",
      deliveryAddress,
      landmark,
      scheduledFor,
      items,
      paymentMethod = "cod",
      notes,
    } = body;

    // 1. Operational Hours Cutoff (12:00 cutoff)
    if (!isWithinOperationalHours()) {
      return NextResponse.json(
        {
          success: false,
          error: "Orders are closed after 12:00. Pizzeria D Café kitchen opens daily at 11:00 AM.",
        },
        { status: 403 }
      );
    }

    // 2. Validate Customer Details
    if (!customerName || customerName.trim().length < 2) {
      return NextResponse.json(
        { success: false, error: "Please enter your full name." },
        { status: 400 }
      );
    }

    if (!customerPhone || customerPhone.trim().length < 10) {
      return NextResponse.json(
        { success: false, error: "Please enter a valid phone number (e.g. 0308-4382003)." },
        { status: 400 }
      );
    }

    // Anti-fraud blocked phone check
    if (isPhoneBlocked(customerPhone)) {
      return NextResponse.json(
        {
          success: false,
          error: "This phone number cannot place Cash on Delivery orders. Please contact support at 0308-4382003.",
        },
        { status: 403 }
      );
    }

    // 3. Validate Delivery Address or Pickup Slot
    if (fulfillmentType === "delivery") {
      if (!deliveryAddress || deliveryAddress.trim().length < 5) {
        return NextResponse.json(
          { success: false, error: "Please enter a complete delivery address in Lahore." },
          { status: 400 }
        );
      }
    }

    // 4. Strict Server-Side Pricing Calculation
    const pricing = calculateServerOrderPricing(items || [], fulfillmentType, paymentMethod);
    if (!pricing.isValid) {
      return NextResponse.json(
        { success: false, error: pricing.error || "Invalid order items." },
        { status: 400 }
      );
    }

    // 5. Generate 4-digit Pickup Code if Pickup
    let pickupCode: string | undefined = undefined;
    if (fulfillmentType === "pickup") {
      pickupCode = `P-${Math.floor(1000 + Math.random() * 9000)}`;
    }

    const orderId = `ord-${Date.now().toString().slice(-6)}`;
    const randomOrderNumber = Math.floor(100 + Math.random() * 900);

    const initialOrderStatus = paymentMethod === "online" ? "pending_payment" : "confirmed";
    const initialPaymentStatus = "unpaid";

    // 6. Persist to Supabase if configured
    if (isSupabaseConfigured && supabase) {
      try {
        const { error: dbError } = await supabase.from("orders").insert({
          idempotency_key: idempotencyKey,
          customer_name: customerName.trim(),
          customer_phone: customerPhone.trim(),
          fulfillment_type: fulfillmentType,
          delivery_address: deliveryAddress || null,
          landmark: landmark || null,
          pickup_code: pickupCode || null,
          subtotal: pricing.subtotal,
          delivery_fee: pricing.deliveryFee,
          total_amount: pricing.totalAmount,
          payment_method: paymentMethod,
          payment_status: initialPaymentStatus,
          order_status: initialOrderStatus,
          notes: notes || null,
        });

        if (dbError && dbError.code === "23505") {
          // Unique idempotency key duplicate! Return existing order
          const { data: existing } = await supabase
            .from("orders")
            .select("*")
            .eq("idempotency_key", idempotencyKey)
            .single();

          if (existing) {
            return NextResponse.json({
              success: true,
              isDuplicate: true,
              orderId: existing.id,
              orderNumber: existing.order_number,
              totalAmount: existing.total_amount,
              orderStatus: existing.order_status,
            });
          }
        }
      } catch (e) {
        console.warn("[create-order] Supabase write skipped, using local store:", e);
      }
    }

    return NextResponse.json({
      success: true,
      order: {
        id: orderId,
        orderNumber: randomOrderNumber,
        idempotencyKey,
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim(),
        fulfillmentType,
        deliveryAddress: deliveryAddress || "Pizzeria D Café Lahore (Pickup Counter)",
        landmark,
        pickupCode,
        scheduledFor: scheduledFor || "ASAP (30-45 mins)",
        subtotal: pricing.subtotal,
        deliveryFee: pricing.deliveryFee,
        discountAmount: pricing.discountAmount,
        totalAmount: pricing.totalAmount,
        paymentMethod,
        paymentStatus: initialPaymentStatus,
        orderStatus: initialOrderStatus,
        notes,
        items: pricing.validatedItems.map((v, i) => ({
          id: `item-${Date.now()}-${i}`,
          menuItemId: v.menuItemId,
          itemName: v.itemName,
          sizeName: v.sizeName,
          unitPrice: v.unitPrice,
          quantity: v.quantity,
          addons: v.addons,
        })),
        createdAt: new Date().toISOString(),
      },
    });
  } catch (err: any) {
    console.error("[create-order] Error:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Failed to create order." },
      { status: 500 }
    );
  }
}

