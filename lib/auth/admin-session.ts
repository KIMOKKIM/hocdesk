import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { BASE_PATH } from "@/lib/config";

export const ADMIN_COOKIE_NAME = "tb_admin";
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

function getAdminAccessKey(): string | null {
  const key = process.env.ADMIN_ACCESS_KEY?.trim();
  return key || null;
}

export function isAdminProtectionEnabled(): boolean {
  if (process.env.NODE_ENV !== "production") {
    return Boolean(getAdminAccessKey());
  }
  return true;
}

export function isWriteApiEnabled(): boolean {
  if (process.env.NODE_ENV !== "production") return true;
  return Boolean(getAdminAccessKey());
}

function signPayload(payload: string, secret: string): string {
  return createHmac("sha256", secret).update(payload).digest("hex");
}

export function createAdminSessionToken(): string {
  const secret = getAdminAccessKey();
  if (!secret) {
    throw new Error("ADMIN_ACCESS_KEY가 설정되지 않았습니다.");
  }
  const expiresAt = Date.now() + SESSION_TTL_MS;
  const payload = String(expiresAt);
  return `${payload}.${signPayload(payload, secret)}`;
}

export function verifyAdminSessionToken(token: string | undefined | null): boolean {
  if (!token) return false;
  const secret = getAdminAccessKey();
  if (!secret) return false;

  const [payload, signature] = token.split(".");
  if (!payload || !signature) return false;

  const expiresAt = Number(payload);
  if (!Number.isFinite(expiresAt) || Date.now() > expiresAt) return false;

  const expected = signPayload(payload, secret);
  try {
    return timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
  } catch {
    return false;
  }
}

export async function isAdminAuthenticated(): Promise<boolean> {
  if (!isAdminProtectionEnabled()) {
    return true;
  }

  const cookieStore = await cookies();
  return verifyAdminSessionToken(cookieStore.get(ADMIN_COOKIE_NAME)?.value);
}

export function getAdminSessionCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: BASE_PATH || "/",
    maxAge: SESSION_TTL_MS / 1000,
  };
}

export function parseAdminSessionFromRequest(request: Request): boolean {
  const header = request.headers.get("cookie");
  if (!header) return false;
  const match = header
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${ADMIN_COOKIE_NAME}=`));
  if (!match) return false;
  const token = decodeURIComponent(match.slice(ADMIN_COOKIE_NAME.length + 1));
  return verifyAdminSessionToken(token);
}
