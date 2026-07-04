import { UnauthorizedError } from "@/lib/api/errors";
import {
  isWriteApiEnabled,
  parseAdminSessionFromRequest,
} from "@/lib/auth/admin-session";
import { APP_URL } from "@/lib/config";

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
 * - ADMIN_ACCESS_KEY 세션 쿠키 (UI 로그인)
 * - CRON_SECRET / ADMIN_ACCESS_KEY Bearer (자동화)
 * - 운영: ADMIN_ACCESS_KEY 미설정 시 쓰기 API 비활성화
 */
export function requireAdminAccess(request: Request): void {
  if (!isWriteApiEnabled()) {
    throw new UnauthorizedError(
      "운영 환경: ADMIN_ACCESS_KEY 미설정으로 쓰기 API가 비활성화되어 있습니다.",
    );
  }

  if (hasValidAdminToken(request)) return;
  if (parseAdminSessionFromRequest(request)) return;

  if (process.env.NODE_ENV !== "production" && !process.env.ADMIN_ACCESS_KEY) {
    if (isSameOriginRequest(request)) return;
  }

  throw new UnauthorizedError("관리자 인증이 필요합니다. /login에서 로그인하세요.");
}

export function requireCronSecret(request: Request): void {
  if (hasValidAdminToken(request)) return;
  throw new UnauthorizedError("CRON_SECRET 인증이 필요합니다.");
}
