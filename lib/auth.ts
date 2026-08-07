import crypto from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { sql } from "@/lib/db";

type UserRow = {
  id: number;
  email: string;
  display_name: string;
  role_code: "owner_admin" | "stakeholder_viewer";
  is_active: boolean;
  password_hash: string;
};

export type SessionUser = Omit<UserRow, "password_hash">;

const COOKIE_NAME = "vredehof_session";

function getSessionSecret(): string {
  const secret = process.env.SESSION_SECRET;

  if (!secret) {
    throw new Error("SESSION_SECRET is not configured.");
  }

  return secret;
}

function sign(value: string): string {
  return crypto.createHmac("sha256", getSessionSecret()).update(value).digest("hex");
}

function verifyPassword(plainText: string, storedHash: string): boolean {
  const [salt, savedHash] = storedHash.split(":");

  if (!salt || !savedHash) {
    return false;
  }

  const derived = crypto.scryptSync(plainText, salt, 64).toString("hex");
  return crypto.timingSafeEqual(Buffer.from(savedHash, "hex"), Buffer.from(derived, "hex"));
}

export async function authenticate(email: string, password: string): Promise<SessionUser | null> {
  const users = await sql<UserRow>(
    `SELECT id, email, display_name, role_code, is_active, password_hash
     FROM users
     WHERE LOWER(email) = LOWER($1)
     LIMIT 1`,
    [email]
  );

  const user = users[0];

  if (!user || !user.is_active || !verifyPassword(password, user.password_hash)) {
    return null;
  }

  return {
    id: user.id,
    email: user.email,
    display_name: user.display_name,
    role_code: user.role_code,
    is_active: user.is_active
  };
}

export async function createSession(userId: number): Promise<void> {
  const value = `${userId}:${sign(String(userId))}`;
  const store = await cookies();

  store.set(COOKIE_NAME, value, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 12
  });
}

export async function destroySession(): Promise<void> {
  const store = await cookies();
  store.delete(COOKIE_NAME);
}

export async function getCurrentUser(): Promise<SessionUser | null> {
  const store = await cookies();
  const cookie = store.get(COOKIE_NAME)?.value;

  if (!cookie) {
    return null;
  }

  const [rawUserId, signature] = cookie.split(":");
  const userId = Number(rawUserId);

  if (!userId || signature !== sign(rawUserId)) {
    return null;
  }

  const users = await sql<SessionUser>(
    `SELECT id, email, display_name, role_code, is_active
     FROM users
     WHERE id = $1
     LIMIT 1`,
    [userId]
  );

  const user = users[0];

  if (!user || !user.is_active) {
    return null;
  }

  return user;
}

export async function requireUser(): Promise<SessionUser> {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  return user;
}

export async function requireOwner(): Promise<SessionUser> {
  const user = await requireUser();

  if (user.role_code !== "owner_admin") {
    redirect("/");
  }

  return user;
}
