import { requireAdmin } from "@/lib/api/auth";
import { jsonError, jsonOk } from "@/lib/api/response";
import { prisma } from "@/lib/prisma";
import { CollectionJobStatus } from "@/lib/constants/status";
import { z } from "zod";

const STALE_MS = 10 * 60 * 1000;

const bodySchema = z.object({
  apply: z.boolean().optional().default(false),
});

/**
 * 오래된 RUNNING/QUEUED 작업 정리 (관리자)
 */
export async function POST(request: Request) {
  try {
    await requireAdmin(request);
    const body = bodySchema.parse(await request.json().catch(() => ({})));
    const now = Date.now();

    const jobs = await prisma.targetCollectionJob.findMany({
      where: {
        status: {
          in: [
            CollectionJobStatus.RUNNING,
            CollectionJobStatus.QUEUED,
            CollectionJobStatus.CANCEL_REQUESTED,
          ],
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const stuck = jobs.filter((job) => {
      const ref = job.lastProgressAt ?? job.startedAt ?? job.createdAt;
      return now - ref.getTime() >= STALE_MS;
    });

    if (!body.apply) {
      return jsonOk({
        apply: false,
        stuckCount: stuck.length,
        items: stuck.slice(0, 20).map((job) => ({
          id: job.id,
          status: job.status,
          projectId: job.projectId,
          ageMinutes: Math.round(
            (now -
              (job.lastProgressAt ?? job.startedAt ?? job.createdAt).getTime()) /
              60000,
          ),
        })),
        message: "dry-run 결과입니다. apply:true 로 정리하세요.",
      });
    }

    if (stuck.length === 0) {
      return jsonOk({ apply: true, updated: 0, message: "정리할 작업이 없습니다." });
    }

    const result = await prisma.targetCollectionJob.updateMany({
      where: { id: { in: stuck.map((j) => j.id) } },
      data: {
        status: CollectionJobStatus.FAILED,
        currentStep: "실패",
        completedAt: new Date(),
        errorMessage: "이전 수집 방식의 장시간 작업이 정리되었습니다.",
        lastMessage: "이전 수집 방식의 장시간 작업이 정리되었습니다.",
        lastProgressAt: new Date(),
      },
    });

    return jsonOk({
      apply: true,
      updated: result.count,
      message: `${result.count}건을 FAILED로 정리했습니다.`,
    });
  } catch (error) {
    return jsonError(error);
  }
}
