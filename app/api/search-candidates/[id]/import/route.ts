import { requireAdmin } from "@/lib/api/auth";
import { jsonError, jsonOk } from "@/lib/api/response";
import { importDiscoveredCandidates } from "@/lib/collection/candidate-import";

type RouteParams = { params: Promise<{ id: string }> };

/** POST /api/search-candidates/[id]/import — 단일 후보 승인 */
export async function POST(request: Request, { params }: RouteParams) {
  try {
    await requireAdmin(request);
    const { id } = await params;
    const result = await importDiscoveredCandidates([id]);
    return jsonOk(result);
  } catch (error) {
    return jsonError(error);
  }
}
