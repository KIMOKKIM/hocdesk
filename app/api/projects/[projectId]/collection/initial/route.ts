import { requireAdmin } from "@/lib/api/auth";
import { jsonError, jsonOk } from "@/lib/api/response";
import { checkRateLimit } from "@/lib/api/rate-limit";
import { initialCollectionSchema } from "@/lib/api/validation";
import { prepareCollectionJob } from "@/lib/collection/step-collection-service";
import { getCollectionJobDetail } from "@/lib/db/collection-jobs";

type RouteParams = { params: Promise<{ projectId: string }> };

/**
 * @deprecated 긴 백그라운드 수집은 제거됨.
 * prepare와 동일하게 job만 생성하고 즉시 반환한다.
 * 클라이언트는 POST /api/collection/jobs/[jobId]/run-next 를 사용한다.
 */
export async function POST(request: Request, { params }: RouteParams) {
  try {
    await requireAdmin(request);
    checkRateLimit(request, "collection:POST");
    const { projectId } = await params;
    const raw = await request.json().catch(() => ({}));
    const body = initialCollectionSchema.parse(raw);

    const prepared = await prepareCollectionJob({
      projectId,
      provider: body.provider === "demo" ? "kakao" : body.provider ?? "kakao",
      requestedCount: body.requestedCount ?? 30,
      confirmed:
        body.confirmed === true ||
        body.force === true ||
        body.forceDuplicateSearch === true,
      force: body.force === true || body.forceDuplicateSearch === true,
    });

    const detail = await getCollectionJobDetail(prepared.jobId);

    return jsonOk({
      jobId: prepared.jobId,
      status: "QUEUED",
      async: false,
      stepMode: true,
      totalQueries: prepared.totalQueries,
      mode: "preview",
      requestedCount: prepared.requestedCount,
      message:
        "검색 계획이 준비되었습니다. 클라이언트가 검색어 단위로 run-next를 호출합니다.",
      deprecated: true,
      useInstead: {
        prepare: `/api/projects/${projectId}/collection/prepare`,
        runNext: `/api/collection/jobs/${prepared.jobId}/run-next`,
      },
      job: detail,
    });
  } catch (error) {
    return jsonError(error);
  }
}
