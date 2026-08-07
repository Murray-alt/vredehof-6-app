import { NextResponse } from "next/server";
import { destroySession } from "@/lib/auth";

export async function POST(request: Request): Promise<Response> {
  await destroySession();
  return NextResponse.redirect(new URL("/login", request.url), 303);
}
