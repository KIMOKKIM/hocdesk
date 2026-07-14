import { requireAdmin } from "@/lib/api/auth";
import { jsonError, jsonOk } from "@/lib/api/response";
import { checkRateLimit } from "@/lib/api/rate-limit";
import { prepareCollectionJob } from "@/lib/collection/step-collection-service";
import { getCollectionJobDetail } from "@/lib/db/collection-jobs";
import { z } from "zod";

const prepareSchema = z.object({
  provider: z.enum(["kakao", "composite"]).optional().default("kakao"),
  mode: z.enum(["preview"]).optional().default("preview"),
  requestedCount: z.number().int().min(1).max(60).optional(),
  confirmed: z.boolean().optional(),
  force: z.boolean().optional(),
});

type RouteParams = { params: Promise<{ projectId: string }> };

/**
 * 검색 계획만 생성하고 즉시 반환. Kakao 호출 없음.
 * 클라이언트는 /api/collection/jobs/[jobId]/run-next 를 반복 호출한다.
 */
export async function POST(request: Request, { params }: RouteParams) {
  try {
    await requireAdmin(request);
    checkRateLimit(request, "collection:prepare");
    const { projectId } = await params;
    const body = prepareSchema.parse(await request.json().catch(() => ({})));

    const prepared = await prepareCollectionJob({
      projectId,
      provider: body.provider,
      requestedCount: body.requestedCount ?? 30,
      confirmed: body.confirmed === true || body.force === true,
      force: body.force === true,
    });

    const job = await getCollectionJobDetail(prepared.jobId);

    return jsonOk({
      ...prepared,
      job,
      message:
        "검색 계획이 준비되었습니다. run-next로 검색어를 순차 실행하세요.",
    });
  } catch (error) {
    return jsonError(error);
  }
}
