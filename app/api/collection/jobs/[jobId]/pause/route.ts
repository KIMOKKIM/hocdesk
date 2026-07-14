import { requireAdmin } from "@/lib/api/auth";
import { jsonError, jsonOk } from "@/lib/api/response";
import { pauseCollectionJob } from "@/lib/collection/step-collection-service";

type RouteParams = { params: Promise<{ jobId: string }> };

export async function POST(request: Request, { params }: RouteParams) {
  try {
    await requireAdmin(request);
    const { jobId } = await params;
    const result = await pauseCollectionJob(jobId);
    return jsonOk(result);
  } catch (error) {
    return jsonError(error);
  }
}
