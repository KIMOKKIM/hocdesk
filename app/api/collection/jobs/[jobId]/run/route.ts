import { requireAdmin } from "@/lib/api/auth";
import { jsonError, jsonOk } from "@/lib/api/response";
import { checkRateLimit } from "@/lib/api/rate-limit";
import { runApprovedCollectionJob } from "@/lib/expansion/expansion-service";

type RouteParams = { params: Promise<{ jobId: string }> };

export async function POST(request: Request, { params }: RouteParams) {
  try {
    await requireAdmin(request);
    checkRateLimit(request, "collection:POST");
    const { jobId } = await params;
    const result = await runApprovedCollectionJob(jobId);
    return jsonOk({ result });
  } catch (error) {
    return jsonError(error);
  }
}
