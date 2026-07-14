import { requireAdmin } from "@/lib/api/auth";
import { jsonError, jsonOk } from "@/lib/api/response";
import { checkRateLimit } from "@/lib/api/rate-limit";
import { runNextCollectionQuery } from "@/lib/collection/step-collection-service";

type RouteParams = { params: Promise<{ jobId: string }> };

/**
 * 검색어 1개만 처리. Vercel timeout을 피하기 위한 짧은 요청.
 */
export async function POST(request: Request, { params }: RouteParams) {
  try {
    await requireAdmin(request);
    checkRateLimit(request, "collection:run-next");
    const { jobId } = await params;
    const result = await runNextCollectionQuery(jobId);
    return jsonOk(result);
  } catch (error) {
    return jsonError(error);
  }
}
