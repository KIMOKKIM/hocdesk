import { jsonError, jsonOk } from "@/lib/api/response";
import {
  ADMIN_COOKIE_NAME,
  createAdminSessionToken,
  getAdminSessionCookieOptions,
  isAdminProtectionEnabled,
} from "@/lib/auth/admin-session";
import { z } from "zod";

export const runtime = "nodejs";

const schema = z.object({
  accessKey: z.string().min(1).max(200),
});

export async function POST(request: Request) {
  try {
    if (!isAdminProtectionEnabled()) {
      const response = jsonOk({ authenticated: true, mode: "development-open" });
      response.cookies.set(ADMIN_COOKIE_NAME, "dev-open", getAdminSessionCookieOptions());
      return response;
    }

    const body = schema.parse(await request.json());
    const configuredKey = process.env.ADMIN_ACCESS_KEY?.trim();
    if (!configuredKey) {
      return jsonError(new Error("ADMIN_ACCESS_KEY가 설정되지 않았습니다."), 503);
    }

    if (body.accessKey !== configuredKey) {
      return jsonError(new Error("관리자 키가 올바르지 않습니다."), 401);
    }

    const token = createAdminSessionToken();
    const response = jsonOk({ authenticated: true });
    response.cookies.set(ADMIN_COOKIE_NAME, token, getAdminSessionCookieOptions());
    return response;
  } catch (error) {
    return jsonError(error);
  }
}
