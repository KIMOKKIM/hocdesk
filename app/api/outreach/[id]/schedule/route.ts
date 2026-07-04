import { requireAdminAccess } from "@/lib/api/auth";
import { jsonError, jsonOk } from "@/lib/api/response";
import { scheduleOutreachSchema, parseJsonBody } from "@/lib/api/validation";
import { scheduleOutreach } from "@/lib/email/outreach-service";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: RouteContext) {
  try {
    requireAdminAccess(request);
    const { id } = await context.params;
    const body = await parseJsonBody(request, scheduleOutreachSchema);
    const outreach = await scheduleOutreach(id, new Date(body.scheduledAt));
    return jsonOk({ outreach });
  } catch (error) {
    return jsonError(error);
  }
}
