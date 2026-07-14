import { requireAdmin } from "@/lib/api/auth";
import { jsonError, jsonOk } from "@/lib/api/response";
import { updateOutreachSchema, parseJsonBody } from "@/lib/api/validation";
import {
  deleteOutreachDraft,
  updateOutreachDraft,
} from "@/lib/email/outreach-service";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: RouteContext) {
  try {
    await requireAdmin(request);
    const { id } = await context.params;
    const body = await parseJsonBody(request, updateOutreachSchema);
    const outreach = await updateOutreachDraft(id, body);
    return jsonOk({ outreach });
  } catch (error) {
    return jsonError(error);
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  try {
    await requireAdmin(request);
    const { id } = await context.params;
    await deleteOutreachDraft(id);
    return jsonOk({});
  } catch (error) {
    return jsonError(error);
  }
}
