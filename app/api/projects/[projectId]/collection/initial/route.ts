import { after } from "next/server";
import { requireAdmin } from "@/lib/api/auth";
import { jsonError, jsonOk } from "@/lib/api/response";
import { checkRateLimit } from "@/lib/api/rate-limit";
import { initialCollectionSchema } from "@/lib/api/validation";
import {
  createInitialCollectionJob,
  runCollectionJob,
} from "@/lib/collection/collection-service";
import { collectionError } from "@/lib/collection/logger";
import { updateJobProgress } from "@/lib/collection/progress";
import { CollectionProgressStep } from "@/lib/collection/progress-shared";
import { getCollectionJobDetail } from "@/lib/db/collection-jobs";
import { CollectionJobStatus } from "@/lib/constants/status";
import { prisma } from "@/lib/prisma";

type RouteParams = { params: Promise<{ projectId: string }> };

/**
 * 초기 수집: job을 생성하고 즉시 jobId를 반환한 뒤,
 * after()로 백그라운드 실행한다. 클라이언트는 polling으로 진행상태를 확인한다.
 *
 * Vercel serverless timeout을 줄이기 위한 구조.
 * 장기적으로는 전용 큐/워커가 필요하다.
 */
export async function POST(request: Request, { params }: RouteParams) {
  try {
    await requireAdmin(request);
    checkRateLimit(request, "collection:POST");
    const { projectId } = await params;
    const raw = await request.json().catch(() => ({}));
    const body = initialCollectionSchema.parse(raw);

    const created = await createInitialCollectionJob({
      projectId,
      force:
        body.force === true ||
        body.confirmed === true ||
        body.forceDuplicateSearch === true,
      confirmed: body.confirmed === true || body.forceDuplicateSearch === true,
      requestedCount: body.requestedCount ?? 30,
      provider: body.provider,
      dryRun: body.dryRun === true,
      importMode: body.importMode,
    });

    const jobId = created.jobId;

    after(async () => {
      try {
        await runCollectionJob(jobId, {
          projectLocation: created.projectLocation,
          askingPrice: created.askingPrice,
          providerOverride: created.providerName,
          dryRun: created.dryRun,
        });
      } catch (error) {
        collectionError(jobId, "after() 수집 실행 실패", error);
        try {
          const current = await prisma.targetCollectionJob.findUnique({
            where: { id: jobId },
            select: { status: true },
          });
          if (
            current &&
            (current.status === CollectionJobStatus.QUEUED ||
              current.status === CollectionJobStatus.RUNNING ||
              current.status === CollectionJobStatus.CANCEL_REQUESTED)
          ) {
            await updateJobProgress(jobId, {
              status: CollectionJobStatus.FAILED,
              currentStep: CollectionProgressStep.FAILED,
              completedAt: new Date(),
              errorMessage:
                error instanceof Error
                  ? error.message
                  : "수집 작업이 비정상 종료되었습니다.",
              lastMessage: "수집 작업이 실패했습니다.",
            });
          }
        } catch (markError) {
          collectionError(jobId, "after() 실패 상태 기록 실패", markError);
        }
      }
    });

    const detail = await getCollectionJobDetail(jobId);

    return jsonOk({
      jobId,
      status: "QUEUED",
      async: true,
      requestedCount: created.requestedCount,
      message: "수집 작업이 시작되었습니다. 진행상태를 확인하세요.",
      job: detail,
    });
  } catch (error) {
    return jsonError(error);
  }
}
