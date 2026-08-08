import { NextResponse } from "next/server";
import { authenticate, buildSessionCookieValue, COOKIE_NAME, getSessionCookieOptions } from "@/lib/auth";

function appUrl(path: string): URL {
  const base = process.env.APP_URL;

  if (!base) {
    throw new Error("APP_URL is not configured.");
  }

  return new URL(path, base);
}

export async function POST(request: Request): Promise<Response> {
  const formData = await request.formData();
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  const user = await authenticate(email, password);

  if (!user) {
    return NextResponse.redirect(appUrl("/login?error=invalid"), 303);
  }

  const response = NextResponse.redirect(appUrl("/"), 303);
  response.cookies.set(COOKIE_NAME, buildSessionCookieValue(user.id), getSessionCookieOptions());
  return response;
}
