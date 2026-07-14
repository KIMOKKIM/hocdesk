import { jsonError, jsonOk } from "@/lib/api/response";
import { ApiError, UnauthorizedError } from "@/lib/api/errors";
import {
  ADMIN_COOKIE_NAME,
  createAdminSessionToken,
  getAdminCredentials,
  getAdminSessionCookieOptions,
  timingSafeStringEqual,
} from "@/lib/auth/admin-session";
import { resolveSessionSecret } from "@/lib/auth/session-token";
import { z } from "zod";

export const runtime = "nodejs";

const schema = z.object({
  username: z.string().min(1).max(100),
  password: z.string().min(1).max(200),
});

export async function POST(request: Request) {
  try {
    let body: z.infer<typeof schema>;
    try {
      body = schema.parse(await request.json());
    } catch {
      throw new ApiError("아이디와 비밀번호를 입력하세요.", 400, "VALIDATION");
    }

    const credentials = getAdminCredentials();
    if (!credentials) {
      throw new ApiError(
        "관리자 계정이 설정되지 않았습니다. Vercel에 ADMIN_USERNAME / ADMIN_PASSWORD를 설정하세요.",
        503,
        "ADMIN_NOT_CONFIGURED",
      );
    }

    try {
      resolveSessionSecret();
    } catch {
      throw new ApiError(
        "SESSION_SECRET이 설정되지 않아 로그인할 수 없습니다. Vercel 환경변수를 확인하세요.",
        503,
        "SESSION_SECRET_MISSING",
      );
    }

    const usernameOk = timingSafeStringEqual(body.username, credentials.username);
    const passwordOk = timingSafeStringEqual(body.password, credentials.password);
    if (!usernameOk || !passwordOk) {
      throw new UnauthorizedError("아이디 또는 비밀번호가 올바르지 않습니다.");
    }

    const token = await createAdminSessionToken(credentials.username);
    const response = jsonOk({ authenticated: true });
    response.cookies.set(ADMIN_COOKIE_NAME, token, getAdminSessionCookieOptions());
    return response;
  } catch (error) {
    return jsonError(error);
  }
}
