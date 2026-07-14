import { UnauthorizedError } from "@/lib/api/errors";
import {
  getAdminCredentials,
  isWriteApiEnabled,
  parseAdminSessionFromRequest,
} from "@/lib/auth/admin-session";
import { APP_URL } from "@/lib/config";

export type AdminActor = {
  username: string;
  via: "session" | "bearer" | "development-open";
};

function normalizeOrigin(url: string): string {
  try {
    const parsed = new URL(url);
    return `${parsed.protocol}//${parsed.host}`;
  } catch {
    return url.replace(/\/$/, "");
  }
}

function isSameOriginRequest(request: Request): boolean {
  const appOrigin = normalizeOrigin(APP_URL);
  const origin = request.headers.get("origin");
  const referer = request.headers.get("referer");

  if (origin && normalizeOrigin(origin) === appOrigin) return true;
  if (referer) {
    try {
      return normalizeOrigin(new URL(referer).origin) === appOrigin;
    } catch {
      return referer.startsWith(APP_URL);
    }
  }

  return process.env.NODE_ENV !== "production";
}

export function hasValidAdminToken(request: Request): boolean {
  const cronSecret = process.env.CRON_SECRET?.trim();
  // Deprecated: ADMIN_ACCESS_KEY still accepted as bearer for automation only
  const adminKey = process.env.ADMIN_ACCESS_KEY?.trim();
  const secret = cronSecret || adminKey;
  if (!secret) return false;

  const authHeader = request.headers.get("authorization");
  const bearer = authHeader?.replace(/^Bearer\s+/i, "").trim();
  const headerToken = request.headers.get("x-admin-token")?.trim();

  return bearer === secret || headerToken === secret;
}

/**
 * 관리자 API 보호:
 * - tb_admin_session 쿠키 (ID/PW 로그인)
 * - CRON_SECRET / ADMIN_ACCESS_KEY Bearer (자동화)
 * - 운영: ADMIN_USERNAME/PASSWORD + SESSION_SECRET 필요
 */
export async function requireAdmin(request: Request): Promise<AdminActor> {
  if (!isWriteApiEnabled()) {
    throw new UnauthorizedError(
      "운영 환경: 관리자 계정 또는 SESSION_SECRET 미설정으로 쓰기 API가 비활성화되어 있습니다.",
    );
  }

  if (hasValidAdminToken(request)) {
    return { username: "bearer", via: "bearer" };
  }

  const session = await parseAdminSessionFromRequest(request);
  if (session) {
    return { username: session.u, via: "session" };
  }

  const credentials = getAdminCredentials();
  if (process.env.NODE_ENV !== "production" && !credentials) {
    if (isSameOriginRequest(request)) {
      return { username: "dev", via: "development-open" };
    }
  }

  throw new UnauthorizedError("관리자 인증이 필요합니다. /login에서 로그인하세요.");
}

/** Alias kept for existing routes — prefer requireAdmin */
export async function requireAdminAccess(request: Request): Promise<AdminActor> {
  return requireAdmin(request);
}

export function requireCronSecret(request: Request): void {
  if (hasValidAdminToken(request)) return;
  throw new UnauthorizedError("CRON_SECRET 인증이 필요합니다.");
}
