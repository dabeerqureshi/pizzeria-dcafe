import { NextRequest, NextResponse } from "next/server";
import { generateAndStoreOtp, isPhoneBlocked } from "@/lib/auth/otpStore";

export async function POST(req: NextRequest) {
  try {
    const { phone } = await req.json();

    if (!phone || typeof phone !== "string" || phone.trim().length < 10) {
      return NextResponse.json(
        { success: false, error: "Please enter a valid Pakistani phone number (e.g., 0308-4382003)." },
        { status: 400 }
      );
    }

    if (isPhoneBlocked(phone)) {
      return NextResponse.json(
        { success: false, error: "This phone number cannot place Cash on Delivery orders due to past cancellations. Please contact support." },
        { status: 403 }
      );
    }

    const { code, expiresAt } = generateAndStoreOtp(phone);

    // In a live SMS environment, dispatch via Twilio / Jazz SMS / WhatsApp Cloud API
    // For seamless testing and development, we log and return debug hint:
    console.log(`[Pizzeria D Café OTP] Sent 4-digit code ${code} to ${phone}`);

    return NextResponse.json({
      success: true,
      message: `Verification code sent to ${phone} via SMS/WhatsApp.`,
      expiresAt,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || "Failed to dispatch OTP." },
      { status: 500 }
    );
  }
}

