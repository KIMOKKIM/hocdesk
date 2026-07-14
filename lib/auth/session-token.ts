/**
 * Session token helpers — Edge + Node compatible (Web Crypto).
 * Token format: v1.<base64url(payload)>.<base64url(hmac)>
 * payload: { u: username, exp: expiresAtMs }
 */

export const ADMIN_COOKIE_NAME = "tb_admin_session";
export const SESSION_TTL_MS = 8 * 60 * 60 * 1000; // 8 hours
export const SESSION_TOKEN_VERSION = "v1";

const DEV_SESSION_SECRET_FALLBACK = "local-development-session-secret";

export type AdminSessionPayload = {
  u: string;
  exp: number;
};

function toBase64Url(bytes: ArrayBuffer | Uint8Array): string {
  const arr = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let binary = "";
  for (let i = 0; i < arr.length; i++) {
    binary += String.fromCharCode(arr[i]!);
  }
  const base64 =
    typeof btoa === "function"
      ? btoa(binary)
      : Buffer.from(binary, "binary").toString("base64");
  return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(value: string): Uint8Array {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/");
  const pad = padded.length % 4 === 0 ? "" : "=".repeat(4 - (padded.length % 4));
  const base64 = padded + pad;
  const binary =
    typeof atob === "function"
      ? atob(base64)
      : Buffer.from(base64, "base64").toString("binary");
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    out[i] = binary.charCodeAt(i);
  }
  return out;
}

function timingSafeEqualBytes(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a[i]! ^ b[i]!;
  }
  return diff === 0;
}

export function resolveSessionSecret(): { secret: string; isFallback: boolean } {
  const configured = process.env.SESSION_SECRET?.trim();
  if (configured) {
    return { secret: configured, isFallback: false };
  }
  if (process.env.NODE_ENV === "production") {
    throw new Error("SESSION_SECRET이 설정되지 않았습니다.");
  }
  console.warn(
    "[auth] SESSION_SECRET이 없어 개발용 임시 비밀값을 사용합니다. 운영에서는 반드시 설정하세요.",
  );
  return { secret: DEV_SESSION_SECRET_FALLBACK, isFallback: true };
}

async function importHmacKey(secret: string): Promise<CryptoKey> {
  const enc = new TextEncoder();
  return crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}

async function signPayload(payloadB64: string, secret: string): Promise<string> {
  const key = await importHmacKey(secret);
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(payloadB64),
  );
  return toBase64Url(signature);
}

export async function createAdminSessionToken(username: string): Promise<string> {
  const { secret } = resolveSessionSecret();
  const payload: AdminSessionPayload = {
    u: username,
    exp: Date.now() + SESSION_TTL_MS,
  };
  const payloadB64 = toBase64Url(new TextEncoder().encode(JSON.stringify(payload)));
  const signature = await signPayload(payloadB64, secret);
  return `${SESSION_TOKEN_VERSION}.${payloadB64}.${signature}`;
}

export async function verifyAdminSessionToken(
  token: string | undefined | null,
): Promise<AdminSessionPayload | null> {
  if (!token) return null;

  let secret: string;
  try {
    secret = resolveSessionSecret().secret;
  } catch {
    return null;
  }

  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [version, payloadB64, signatureB64] = parts;
  if (version !== SESSION_TOKEN_VERSION || !payloadB64 || !signatureB64) {
    return null;
  }

  const expected = await signPayload(payloadB64, secret);
  const provided = fromBase64Url(signatureB64);
  const expectedBytes = fromBase64Url(expected);
  if (!timingSafeEqualBytes(provided, expectedBytes)) {
    return null;
  }

  try {
    const json = new TextDecoder().decode(fromBase64Url(payloadB64));
    const payload = JSON.parse(json) as AdminSessionPayload;
    if (!payload?.u || typeof payload.exp !== "number") return null;
    if (Date.now() > payload.exp) return null;
    return payload;
  } catch {
    return null;
  }
}

export function parseCookieValue(
  cookieHeader: string | null,
  name: string,
): string | null {
  if (!cookieHeader) return null;
  const match = cookieHeader
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${name}=`));
  if (!match) return null;
  return decodeURIComponent(match.slice(name.length + 1));
}
