import { requireAdmin } from "@/lib/api/auth";
import { jsonError, jsonOk } from "@/lib/api/response";
import { approveOutreach } from "@/lib/email/outreach-service";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: RouteContext) {
  try {
    await requireAdmin(request);
    const { id } = await context.params;
    const outreach = await approveOutreach(id);
    return jsonOk({ outreach });
  } catch (error) {
    return jsonError(error);
  }
}
