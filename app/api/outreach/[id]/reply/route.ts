import { requireAdmin } from "@/lib/api/auth";
import { jsonError, jsonOk } from "@/lib/api/response";
import { replyOutreachSchema, parseJsonBody } from "@/lib/api/validation";
import { recordOutreachReply } from "@/lib/email/outreach-service";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: RouteContext) {
  try {
    await requireAdmin(request);
    const { id } = await context.params;
    const body = await parseJsonBody(request, replyOutreachSchema);
    const outreach = await recordOutreachReply(id, body);
    return jsonOk({ outreach });
  } catch (error) {
    return jsonError(error);
  }
}
