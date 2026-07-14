import "server-only";
import { cookies } from "next/headers";
import { BASE_PATH } from "@/lib/config";
import {
  ADMIN_COOKIE_NAME,
  SESSION_TTL_MS,
  createAdminSessionToken,
  parseCookieValue,
  resolveSessionSecret,
  verifyAdminSessionToken,
  type AdminSessionPayload,
} from "@/lib/auth/session-token";

export {
  ADMIN_COOKIE_NAME,
  SESSION_TTL_MS,
  createAdminSessionToken,
  verifyAdminSessionToken,
  resolveSessionSecret,
};
export type { AdminSessionPayload };

export function getAdminCredentials(): {
  username: string;
  password: string;
} | null {
  const username = process.env.ADMIN_USERNAME?.trim();
  const password = resolveAdminPassword();
  if (!username || !password) {
    return null;
  }
  return { username, password };
}

/**
 * Prefer ADMIN_PASSWORD_B64 when the password contains `$`
 * (Next.js/Vercel env interpolation can corrupt `$...` values).
 * Falls back to ADMIN_PASSWORD with whitespace trimmed.
 */
function resolveAdminPassword(): string | null {
  const b64 = process.env.ADMIN_PASSWORD_B64?.trim();
  if (b64) {
    try {
      const decoded = Buffer.from(b64, "base64").toString("utf8");
      return decoded || null;
    } catch {
      return null;
    }
  }
  const raw = process.env.ADMIN_PASSWORD;
  if (raw === undefined || raw === "") return null;
  return raw.replace(/^\s+|\s+$/g, "") || null;
}

export function isAdminProtectionEnabled(): boolean {
  if (process.env.NODE_ENV !== "production") {
    return Boolean(getAdminCredentials());
  }
  return true;
}

export function isWriteApiEnabled(): boolean {
  if (process.env.NODE_ENV !== "production") return true;
  return Boolean(getAdminCredentials() && process.env.SESSION_SECRET?.trim());
}

export function timingSafeStringEqual(a: string, b: string): boolean {
  const max = Math.max(a.length, b.length);
  let diff = a.length ^ b.length;
  for (let i = 0; i < max; i++) {
    diff |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  }
  return a.length === b.length && diff === 0;
}

export async function isAdminAuthenticated(): Promise<boolean> {
  if (!isAdminProtectionEnabled()) {
    return true;
  }

  const cookieStore = await cookies();
  const token = cookieStore.get(ADMIN_COOKIE_NAME)?.value;
  const payload = await verifyAdminSessionToken(token);
  return payload !== null;
}

export async function getAdminSession(): Promise<AdminSessionPayload | null> {
  if (!isAdminProtectionEnabled()) {
    return { u: "dev", exp: Date.now() + SESSION_TTL_MS };
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

export async function parseAdminSessionFromRequest(
  request: Request,
): Promise<AdminSessionPayload | null> {
  const token = parseCookieValue(
    request.headers.get("cookie"),
    ADMIN_COOKIE_NAME,
  );
  return verifyAdminSessionToken(token);
}
