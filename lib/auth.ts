import { createHash, randomBytes, scryptSync, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";
import { emptyPreferences } from "@/lib/orders";
import { readDb, withDb } from "@/lib/store";
import type { Preferences, PublicUser, UserRecord } from "@/lib/types";

const CUSTOMER_COOKIE = "gebeta_customer";
const STAFF_COOKIE = "gebeta_staff";
const THIRTY_DAYS = 60 * 60 * 24 * 30;

export function hashPassword(password: string): { salt: string; hash: string } {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 32).toString("hex");
  return { salt, hash };
}

export function verifyPassword(password: string, salt: string, hash: string): boolean {
  const next = scryptSync(password, salt, 32);
  const prev = Buffer.from(hash, "hex");
  if (next.length !== prev.length) return false;
  return timingSafeEqual(next, prev);
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function publicUser(user: UserRecord): PublicUser {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    createdAt: user.createdAt,
    preferences: user.preferences ?? emptyPreferences(),
  };
}

function configuredAdminPassword(): string | null {
  const value = process.env.ADMIN_PASSWORD;
  if (typeof value !== "string" || value.length === 0) return null;
  return value;
}

export function checkStaffPassword(password: string): boolean {
  const expected = configuredAdminPassword();
  if (!expected) {
    console.error("ADMIN_PASSWORD is not configured.");
    return false;
  }
  const left = createHash("sha256").update(password, "utf8").digest();
  const right = createHash("sha256").update(expected, "utf8").digest();
  return timingSafeEqual(left, right);
}

async function setCookie(name: string, token: string) {
  const jar = await cookies();
  jar.set(name, token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: THIRTY_DAYS,
  });
}

export async function clearCookie(name: "customer" | "staff") {
  const jar = await cookies();
  jar.set(name === "customer" ? CUSTOMER_COOKIE : STAFF_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}

export async function openSession(kind: "customer" | "staff", userId: string | null) {
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + THIRTY_DAYS * 1000).toISOString();
  await withDb((db) => {
    db.sessions.push({
      id: `ses_${randomBytes(8).toString("hex")}`,
      tokenHash: hashToken(token),
      kind,
      userId,
      expiresAt,
    });
  });
  await setCookie(kind === "customer" ? CUSTOMER_COOKIE : STAFF_COOKIE, token);
}

export async function readAuth(): Promise<{ user: PublicUser | null; staff: boolean; userRecord: UserRecord | null }> {
  const jar = await cookies();
  const customerToken = jar.get(CUSTOMER_COOKIE)?.value;
  const staffToken = jar.get(STAFF_COOKIE)?.value;
  const db = readDb();
  const now = new Date().toISOString();
  const match = (token?: string, kind?: "customer" | "staff") =>
    token
      ? db.sessions.find(
          (session) =>
            session.tokenHash === hashToken(token) &&
            session.expiresAt > now &&
            (kind ? session.kind === kind : true),
        )
      : undefined;
  const staffSession = match(staffToken, "staff");
  const customerSession = match(customerToken, "customer");
  const userRecord = customerSession?.userId
    ? db.users.find((user) => user.id === customerSession.userId) ?? null
    : null;
  return {
    user: userRecord ? publicUser(userRecord) : null,
    staff: Boolean(staffSession),
    userRecord,
  };
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function validateAccountInput(input: {
  name?: string;
  email?: string;
  phone?: string;
  password?: string;
}) {
  const name = input.name?.trim() ?? "";
  const email = normalizeEmail(input.email ?? "");
  const phone = input.phone?.trim() ?? "";
  const password = input.password ?? "";
  if (name.length < 2) return "Enter your name.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return "Enter a valid email.";
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 10) return "Enter a phone number with at least 10 digits, so the kitchen can text you.";
  if (password.length < 8) return "Use a password of at least 8 characters.";
  return null;
}

export function sanitizePreferences(input: Partial<Preferences> | undefined): Preferences {
  const base = emptyPreferences();
  if (!input) return base;
  const fasting = input.fastingPreference;
  base.fastingPreference =
    fasting === "fasting" || fasting === "non_fasting" || fasting === "mixed" ? fasting : "mixed";
  const spice = input.spiceLevel;
  base.spiceLevel =
    spice === "none" || spice === "mild" || spice === "medium" || spice === "hot" || spice === "extra"
      ? spice
      : null;
  base.allergens = [...new Set(input.allergens ?? [])].slice(0, 12);
  base.dislikedIngredients = [...new Set(input.dislikedIngredients ?? [])].slice(0, 20);
  base.dietary = [...new Set(input.dietary ?? [])].slice(0, 12);
  base.notes = (input.notes ?? "").trim().slice(0, 400);
  return base;
}
