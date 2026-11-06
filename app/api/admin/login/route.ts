import { NextRequest, NextResponse } from "next/server";
import { createAdminSessionToken } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const { username, password } = await req.json();

    const expectedUser = (process.env.ADMIN_USERNAME || "admin").trim();
    const expectedPass = (process.env.ADMIN_PASSWORD || "pizzeria123").trim();

    if (
      username &&
      password &&
      username.trim().toLowerCase() === expectedUser.toLowerCase() &&
      password.trim() === expectedPass
    ) {
      const token = await createAdminSessionToken(expectedUser);

      const response = NextResponse.json({
        success: true,
        message: "Authenticated successfully",
      });

      // Set cryptographically signed HTTP-only cookie
      response.cookies.set({
        name: "pizzeria_admin_session",
        value: token,
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        path: "/",
        maxAge: 60 * 60 * 24 * 7, // 7 days
      });

      return response;
    }

    return NextResponse.json(
      { error: "Invalid username or password. Please try again." },
      { status: 401 }
    );
  } catch (err: any) {
    return NextResponse.json(
      { error: "Authentication failed. " + (err?.message || "") },
      { status: 500 }
    );
  }
}
