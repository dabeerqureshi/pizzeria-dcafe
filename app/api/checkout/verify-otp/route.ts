import { NextRequest, NextResponse } from "next/server";
import { verifyOtpCode } from "@/lib/auth/otpStore";

export async function POST(req: NextRequest) {
  try {
    const { phone, code } = await req.json();

    if (!phone || !code) {
      return NextResponse.json(
        { success: false, error: "Phone and 4-digit code are required." },
        { status: 400 }
      );
    }

    const result = verifyOtpCode(phone, code);

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Phone number verified successfully.",
      verificationToken: result.token,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || "Failed to verify OTP." },
      { status: 500 }
    );
  }
}

