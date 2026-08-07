import { NextResponse } from "next/server";
import { authenticate, buildSessionCookieValue, COOKIE_NAME, getSessionCookieOptions } from "@/lib/auth";

export async function POST(request: Request): Promise<Response> {
  const formData = await request.formData();
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  const user = await authenticate(email, password);

  if (!user) {
    return NextResponse.redirect(new URL("/login?error=invalid", request.url), 303);
  }

  const response = NextResponse.redirect(new URL("/", request.url), 303);
  response.cookies.set(COOKIE_NAME, buildSessionCookieValue(user.id), getSessionCookieOptions());
  return response;
}
