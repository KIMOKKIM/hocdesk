import { requireAdminAccess } from "@/lib/api/auth";
import { jsonError, jsonOk } from "@/lib/api/response";
import { cancelOutreach } from "@/lib/email/outreach-service";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(_request: Request, context: RouteContext) {
  try {
    requireAdminAccess(_request);
    const { id } = await context.params;
    const outreach = await cancelOutreach(id);
    return jsonOk({ outreach });
  } catch (error) {
    return jsonError(error);
  }
}
