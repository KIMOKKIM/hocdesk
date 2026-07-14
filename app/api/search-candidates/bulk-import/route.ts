import { requireAdmin } from "@/lib/api/auth";
import { jsonError, jsonOk } from "@/lib/api/response";
import { importDiscoveredCandidates } from "@/lib/collection/candidate-import";
import { z } from "zod";

const schema = z.object({
  candidateIds: z.array(z.string()).min(1).max(30),
  jobId: z.string().optional(),
});

/** POST /api/search-candidates/bulk-import — 복수 후보 승인 */
export async function POST(request: Request) {
  try {
    await requireAdmin(request);
    const body = schema.parse(await request.json());
    const result = await importDiscoveredCandidates(body.candidateIds, body.jobId);
    return jsonOk(result);
  } catch (error) {
    return jsonError(error);
  }
}
