import {
  auditEventForStatus,
  companyStatusForReview,
  hasContactInfo,
  normalizeReviewStatus,
  reviewAudit,
  validateReviewTransition,
  type ProjectCompanyReviewRecord,
} from "@/lib/review/target-review-service";
import { ReviewStatus } from "@/lib/constants/status";
import { prisma } from "@/lib/prisma";

const BULK_MAX = 30;

async function loadReviewRecord(id: string): Promise<ProjectCompanyReviewRecord | null> {
  return prisma.projectCompany.findUnique({
    where: { id },
    include: {
      company: {
        include: {
          contacts: { select: { email: true, mobile: true } },
        },
      },
    },
  });
}

export async function updateProjectCompanyReviewStatus(
  id: string,
  status: string,
) {
  const nextStatus = normalizeReviewStatus(status);
  const record = await loadReviewRecord(id);

  if (!record) {
    throw new Error("타깃 업체를 찾을 수 없습니다.");
  }

  const validation = validateReviewTransition(record, nextStatus);
  if (!validation.ok) {
    throw new Error(validation.message);
  }

  const companyStatus = companyStatusForReview(nextStatus);

  const updated = await prisma.projectCompany.update({
    where: { id },
    data: {
      reviewStatus: nextStatus,
      ...(companyStatus ? {} : {}),
    },
    include: { company: true, project: { select: { name: true } } },
  });

  if (companyStatus) {
    await prisma.company.update({
      where: { id: record.companyId },
      data: { status: companyStatus },
    });
  }

  reviewAudit(auditEventForStatus(nextStatus), {
    projectCompanyId: id,
    companyId: record.companyId,
    previousStatus: record.reviewStatus,
    nextStatus,
  });

  return updated;
}

export type BulkReviewResult = {
  successCount: number;
  failureCount: number;
  failures: { id: string; message: string }[];
};

export async function bulkUpdateProjectCompanyReviewStatus(
  ids: string[],
  status: string,
): Promise<BulkReviewResult> {
  if (ids.length === 0) {
    throw new Error("선택된 업체가 없습니다.");
  }
  if (ids.length > BULK_MAX) {
    throw new Error(`한 번에 최대 ${BULK_MAX}개까지 처리할 수 있습니다.`);
  }

  const nextStatus = normalizeReviewStatus(status);
  const failures: BulkReviewResult["failures"] = [];
  let successCount = 0;

  for (const id of ids) {
    try {
      const record = await loadReviewRecord(id);
      if (!record) {
        failures.push({ id, message: "타깃을 찾을 수 없습니다." });
        continue;
      }

      if (
        nextStatus === ReviewStatus.CONTACT_READY &&
        !hasContactInfo(record)
      ) {
        failures.push({ id, message: "연락처 없음 — 제외됨" });
        continue;
      }

      await updateProjectCompanyReviewStatus(id, nextStatus);
      successCount += 1;
    } catch (error) {
      failures.push({
        id,
        message: error instanceof Error ? error.message : "처리 실패",
      });
    }
  }

  return {
    successCount,
    failureCount: failures.length,
    failures,
  };
}

export { hasContactInfo, normalizeReviewStatus };
