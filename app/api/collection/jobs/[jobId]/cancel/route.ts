import { requireAdmin } from "@/lib/api/auth";
import { jsonError, jsonOk } from "@/lib/api/response";
import { checkRateLimit } from "@/lib/api/rate-limit";
import { requestCancelCollectionJob } from "@/lib/collection/collection-service";

type RouteParams = { params: Promise<{ jobId: string }> };

export async function POST(request: Request, { params }: RouteParams) {
  try {
    await requireAdmin(request);
    checkRateLimit(request, "collection:POST");
    const { jobId } = await params;
    const result = await requestCancelCollectionJob(jobId);
    return jsonOk(result);
  } catch (error) {
    return jsonError(error);
  }
}
