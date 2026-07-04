import { jsonOk } from "@/lib/api/response";
import { ADMIN_COOKIE_NAME, getAdminSessionCookieOptions } from "@/lib/auth/admin-session";

export const runtime = "nodejs";

export async function POST() {
  const response = jsonOk({ loggedOut: true });
  response.cookies.set(ADMIN_COOKIE_NAME, "", {
    ...getAdminSessionCookieOptions(),
    maxAge: 0,
  });
  return response;
}
