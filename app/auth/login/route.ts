import { NextResponse } from "next/server";
import { authenticate, createSession } from "@/lib/auth";

export async function POST(request: Request): Promise<Response> {
  const formData = await request.formData();
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  const user = await authenticate(email, password);

  if (!user) {
    return NextResponse.redirect(new URL("/login?error=invalid", request.url), 303);
  }

  await createSession(Number(user.id));
  return NextResponse.redirect(new URL("/", request.url), 303);
}
