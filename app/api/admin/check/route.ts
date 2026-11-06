import { NextRequest, NextResponse } from "next/server";
import { verifyAdminSessionToken } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const session = req.cookies.get("pizzeria_admin_session");
  const isAuthenticated = await verifyAdminSessionToken(session?.value);
  return NextResponse.json({ authenticated: isAuthenticated });
}
