import type { ReviewStatusValue } from "@/lib/constants/status";
import { CompanyStatus, ReviewStatus } from "@/lib/constants/status";

export type ReviewAuditEvent =
  | "TARGET_REVIEWED"
  | "TARGET_CONTACT_READY"
  | "TARGET_HELD"
  | "TARGET_EXCLUDED"
  | "TARGET_STATUS_ROLLED_BACK";

export function reviewAudit(
  event: ReviewAuditEvent,
  data: Record<string, unknown>,
) {
  console.log(`[target-review] AUDIT ${event} ${JSON.stringify(data)}`);
}

export function normalizeReviewStatus(status: string): ReviewStatusValue {
  if (status === ReviewStatus.APPROVED) {
    return ReviewStatus.CONTACT_READY;
  }
  return status as ReviewStatusValue;
}

export function isContactReadyStatus(status: string) {
  const normalized = normalizeReviewStatus(status);
  return normalized === ReviewStatus.CONTACT_READY;
}

export type ProjectCompanyReviewRecord = {
  id: string;
  projectId: string;
  companyId: string;
  reviewStatus: string;
  fitScore: number;
  targetingReason: string | null;
  company: {
    status: string;
    mainPhone: string | null;
    generalEmail: string | null;
    contacts: { email: string | null; mobile: string | null }[];
  };
};

export function hasContactInfo(record: ProjectCompanyReviewRecord) {
  if (record.company.mainPhone || record.company.generalEmail) return true;
  return record.company.contacts.some(
    (contact) => contact.email || contact.mobile,
  );
}

export function validateReviewTransition(
  record: ProjectCompanyReviewRecord,
  nextStatus: ReviewStatusValue,
): { ok: true } | { ok: false; message: string } {
  const current = normalizeReviewStatus(record.reviewStatus);

  if (record.company.status === CompanyStatus.EXCLUDED) {
    return { ok: false, message: "제외된 업체의 상태는 변경할 수 없습니다." };
  }

  if (current === ReviewStatus.EXCLUDED && nextStatus !== ReviewStatus.PENDING) {
    return { ok: false, message: "제외된 업체는 먼저 상태 되돌리기가 필요합니다." };
  }

  switch (nextStatus) {
    case ReviewStatus.REVIEWED:
      if (![ReviewStatus.PENDING, ReviewStatus.HOLD].includes(current as typeof ReviewStatus.PENDING)) {
        return { ok: false, message: "검토 대기 또는 보류 상태에서만 검토 완료로 변경할 수 있습니다." };
      }
      return { ok: true };

    case ReviewStatus.CONTACT_READY:
      if (current === ReviewStatus.EXCLUDED) {
        return { ok: false, message: "제외된 업체는 연락 준비 완료로 변경할 수 없습니다." };
      }
      if (!hasContactInfo(record)) {
        return { ok: false, message: "이메일 또는 전화번호 중 하나 이상이 필요합니다." };
      }
      if (!record.fitScore || record.fitScore <= 0) {
        return { ok: false, message: "적합도 점수가 설정되어 있어야 합니다." };
      }
      if (!record.targetingReason?.trim()) {
        return { ok: false, message: "타깃 선정사유가 필요합니다." };
      }
      return { ok: true };

    case ReviewStatus.HOLD:
      return { ok: true };

    case ReviewStatus.REJECTED:
      return { ok: true };

    case ReviewStatus.EXCLUDED:
      return { ok: true };

    case ReviewStatus.PENDING:
      return { ok: true };

    default:
      return { ok: false, message: `지원하지 않는 검토 상태: ${nextStatus}` };
  }
}

export function companyStatusForReview(nextStatus: ReviewStatusValue) {
  switch (nextStatus) {
    case ReviewStatus.REVIEWED:
      return CompanyStatus.REVIEWED;
    case ReviewStatus.CONTACT_READY:
      return CompanyStatus.CONTACT_READY;
    case ReviewStatus.REJECTED:
    case ReviewStatus.EXCLUDED:
      return CompanyStatus.EXCLUDED;
    default:
      return undefined;
  }
}

export function auditEventForStatus(nextStatus: ReviewStatusValue): ReviewAuditEvent {
  switch (nextStatus) {
    case ReviewStatus.CONTACT_READY:
      return "TARGET_CONTACT_READY";
    case ReviewStatus.HOLD:
      return "TARGET_HELD";
    case ReviewStatus.REJECTED:
    case ReviewStatus.EXCLUDED:
      return "TARGET_EXCLUDED";
    case ReviewStatus.PENDING:
      return "TARGET_STATUS_ROLLED_BACK";
    default:
      return "TARGET_REVIEWED";
  }
}
