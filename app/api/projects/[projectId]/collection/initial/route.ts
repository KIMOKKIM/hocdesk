import { requireAdminAccess } from "@/lib/api/auth";
import { jsonError, jsonOk } from "@/lib/api/response";
import { checkRateLimit } from "@/lib/api/rate-limit";
import { initialCollectionSchema } from "@/lib/api/validation";
import { runInitialCollection } from "@/lib/collection/collection-service";
import { getCollectionJobDetail } from "@/lib/db/collection-jobs";

type RouteParams = { params: Promise<{ projectId: string }> };

export async function POST(request: Request, { params }: RouteParams) {
  try {
    requireAdminAccess(request);
    checkRateLimit(request, "collection:POST");
    const { projectId } = await params;
    const raw = await request.json().catch(() => ({}));
    const body = initialCollectionSchema.parse(raw);

    const result = await runInitialCollection({
      projectId,
      force: body.force === true || body.confirmed === true || body.forceDuplicateSearch === true,
      confirmed: body.confirmed === true || body.forceDuplicateSearch === true,
      requestedCount: body.requestedCount ?? 30,
      provider: body.provider,
      dryRun: body.dryRun === true,
      importMode: body.importMode,
    });

    const detail = await getCollectionJobDetail(result.jobId);

    return jsonOk({
      jobId: result.jobId,
      status: result.status,
      requestedCount: result.requestedCount,
      collectedCount: result.collectedCount,
      acceptedCount: result.acceptedCount,
      duplicateCount: result.duplicateCount,
      rejectedCount: result.rejectedCount,
      gradeCounts: result.gradeCounts,
      result,
      job: detail,
    });
  } catch (error) {
    return jsonError(error);
  }
}
