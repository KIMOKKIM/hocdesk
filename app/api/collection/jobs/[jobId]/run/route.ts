import { requireAdmin } from "@/lib/api/auth";
import { jsonError, jsonOk } from "@/lib/api/response";
import { checkRateLimit } from "@/lib/api/rate-limit";
import { runCollectionJob } from "@/lib/collection/collection-service";
import { runApprovedCollectionJob } from "@/lib/expansion/expansion-service";
import { CollectionJobType } from "@/lib/constants/collection";
import { CollectionJobStatus } from "@/lib/constants/status";
import { prisma } from "@/lib/prisma";
import { getCollectionJobDetail } from "@/lib/db/collection-jobs";

type RouteParams = { params: Promise<{ jobId: string }> };

export async function POST(request: Request, { params }: RouteParams) {
  try {
    await requireAdmin(request);
    checkRateLimit(request, "collection:POST");
    const { jobId } = await params;

    const job = await prisma.targetCollectionJob.findUnique({
      where: { id: jobId },
      include: { project: { select: { location: true, askingPrice: true } } },
    });
    if (!job) {
      return jsonError(new Error("수집 작업을 찾을 수 없습니다."), 404);
    }

    if (job.jobType === CollectionJobType.EXPANSION) {
      const result = await runApprovedCollectionJob(jobId);
      return jsonOk({ result });
    }

    if (
      job.status !== CollectionJobStatus.QUEUED &&
      job.status !== CollectionJobStatus.FAILED &&
      job.status !== CollectionJobStatus.CANCEL_REQUESTED
    ) {
      return jsonError(
        new Error("대기·실패 상태의 초기 수집 작업만 재실행할 수 있습니다."),
        400,
      );
    }

    // Reset to QUEUED if retrying failed
    if (job.status === CollectionJobStatus.FAILED) {
      await prisma.targetCollectionJob.update({
        where: { id: jobId },
        data: {
          status: CollectionJobStatus.QUEUED,
          errorMessage: null,
          completedAt: null,
          currentStep: "준비 중",
          progressPercent: 0,
          lastMessage: "재시도를 위해 대기열에 등록되었습니다.",
        },
      });
    }

    const searchPlan = job.searchPlan as { dryRun?: boolean; provider?: string };
    const result = await runCollectionJob(jobId, {
      projectLocation: job.project.location,
      askingPrice: job.project.askingPrice,
      dryRun: searchPlan.dryRun === true,
    });
    const detail = await getCollectionJobDetail(jobId);
    return jsonOk({ result, job: detail });
  } catch (error) {
    return jsonError(error);
  }
}
