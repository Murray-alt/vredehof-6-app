import { NextResponse } from "next/server";
import { COOKIE_NAME, getSessionCookieOptions } from "@/lib/auth";

function appUrl(path: string): URL {
  const base = process.env.APP_URL;

  if (!base) {
    throw new Error("APP_URL is not configured.");
  }

  return new URL(path, base);
}

export async function POST(request: Request): Promise<Response> {
  const response = NextResponse.redirect(appUrl("/login"), 303);
  response.cookies.set(COOKIE_NAME, "", {
    ...getSessionCookieOptions(),
    maxAge: 0
  });
  return response;
}
