import { requireAdminAccess } from "@/lib/api/auth";
import { jsonError, jsonOk } from "@/lib/api/response";
import { rejectSuggestionSchema } from "@/lib/api/validation";
import { rejectExpansionSuggestion } from "@/lib/expansion/expansion-service";

type RouteParams = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: RouteParams) {
  try {
    requireAdminAccess(request);
    const { id } = await params;
    const raw = await request.json().catch(() => ({}));
    const body = rejectSuggestionSchema.parse(raw);
    await rejectExpansionSuggestion(id, body.reason);
    return jsonOk({});
  } catch (error) {
    return jsonError(error);
  }
}
