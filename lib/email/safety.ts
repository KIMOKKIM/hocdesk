import { OUTREACH_LIMITS } from "@/lib/config/outreach-limits";
import {
  CompanyStatus,
  OutreachApprovalStatus,
  OutreachStatus,
  ReviewStatus,
} from "@/lib/constants/status";
import { resolveRecipientEmail } from "@/lib/email/outreach-service";
import { isEmailSuppressed } from "@/lib/email/suppression";
import { getSenderProfile } from "@/lib/db/settings";
import { prisma } from "@/lib/prisma";

export type SendValidationResult = {
  ok: boolean;
  errors: string[];
  warnings: string[];
  preview?: {
    to: string;
    subject: string;
    body: string;
    companyName: string;
  };
};

export async function validateOutreachApprovalRequest(
  outreachId: string,
): Promise<SendValidationResult> {
  const errors: string[] = [];
  const warnings: string[] = [];

  const outreach = await loadOutreach(outreachId);
  if (!outreach) {
    return { ok: false, errors: ["이메일을 찾을 수 없습니다."], warnings: [] };
  }

  if (
    outreach.approvalStatus !== OutreachApprovalStatus.DRAFT &&
    outreach.approvalStatus !== OutreachApprovalStatus.REJECTED
  ) {
    errors.push("초안 또는 거절 상태에서만 승인 요청할 수 있습니다.");
  }

  if (!outreach.subject.trim()) errors.push("제목이 필요합니다.");
  if (!outreach.emailBody.trim() || outreach.emailBody.length < 50) {
    errors.push("본문이 필요합니다.");
  }

  const to = resolveRecipientEmail(outreach.contact, outreach.company);
  if (!to) errors.push("수신자 이메일이 필요합니다.");

  const senderProfile = await getSenderProfile();
  if (!senderProfile.email) {
    errors.push("발신자 이메일이 설정되지 않았습니다.");
  }

  if (to && (await isEmailSuppressed(to))) {
    errors.push("수신거부 등록된 이메일 주소입니다.");
  }

  if (
    !outreach.emailBody.includes("수신") &&
    !outreach.emailBody.includes("거부")
  ) {
    errors.push("수신거부 안내 문구가 본문에 포함되어야 합니다.");
  }

  await appendExclusionErrors(outreach, errors);

  return {
    ok: errors.length === 0,
    errors,
    warnings,
    preview: buildPreview(outreach, to),
  };
}

export async function validateOutreachSend(
  outreachId: string,
): Promise<SendValidationResult> {
  const errors: string[] = [];
  const warnings: string[] = [];

  const outreach = await loadOutreach(outreachId);
  if (!outreach) {
    return { ok: false, errors: ["이메일을 찾을 수 없습니다."], warnings: [] };
  }

  if (outreach.approvalStatus !== OutreachApprovalStatus.APPROVED) {
    errors.push("승인(approvalStatus=APPROVED)된 이메일만 발송할 수 있습니다.");
  }

  if (
    outreach.status !== OutreachStatus.DRAFT &&
    outreach.status !== OutreachStatus.SCHEDULED &&
    outreach.status !== OutreachStatus.FAILED
  ) {
    errors.push("발송 가능한 상태(DRAFT/SCHEDULED/FAILED)가 아닙니다.");
  }

  if (outreach.status === OutreachStatus.SENT) {
    errors.push("이미 발송된 이메일입니다.");
  }

  const to = resolveRecipientEmail(outreach.contact, outreach.company);
  if (!to) errors.push("수신 이메일 주소가 없습니다.");

  const senderProfile = await getSenderProfile();
  if (!senderProfile.email) {
    errors.push("발신자 이메일이 설정되지 않았습니다.");
  }

  if (to && (await isEmailSuppressed(to))) {
    errors.push("수신거부 등록된 이메일 주소입니다.");
  }

  await appendExclusionErrors(outreach, errors);

  if (to) {
    const recentSent = await prisma.outreach.findFirst({
      where: {
        companyId: outreach.companyId,
        projectId: outreach.projectId,
        status: OutreachStatus.SENT,
        sentAt: {
          gte: new Date(
            Date.now() - OUTREACH_LIMITS.hardBlockDays * 24 * 60 * 60 * 1000,
          ),
        },
        NOT: { id: outreachId },
      },
    });

    if (recentSent) {
      errors.push(
        `최근 ${OUTREACH_LIMITS.hardBlockDays}일 이내 동일 업체에 발송 이력이 있어 재발송할 수 없습니다.`,
      );
    } else {
      const warningSent = await prisma.outreach.findFirst({
        where: {
          companyId: outreach.companyId,
          projectId: outreach.projectId,
          status: OutreachStatus.SENT,
          sentAt: {
            gte: new Date(
              Date.now() - OUTREACH_LIMITS.warningDays * 24 * 60 * 60 * 1000,
            ),
          },
          NOT: { id: outreachId },
        },
      });
      if (warningSent) {
        warnings.push(
          `최근 ${OUTREACH_LIMITS.warningDays}일 이내 동일 업체 발송 이력이 있습니다.`,
        );
      }
    }
  }

  return {
    ok: errors.length === 0,
    errors,
    warnings,
    preview: buildPreview(outreach, to),
  };
}

async function loadOutreach(outreachId: string) {
  return prisma.outreach.findUnique({
    where: { id: outreachId },
    include: {
      company: {
        include: {
          contacts: true,
          sources: { orderBy: { collectedAt: "desc" }, take: 1 },
        },
      },
      contact: true,
      project: true,
    },
  });
}

async function appendExclusionErrors(
  outreach: NonNullable<Awaited<ReturnType<typeof loadOutreach>>>,
  errors: string[],
) {
  const projectCompany = await prisma.projectCompany.findFirst({
    where: {
      projectId: outreach.projectId,
      companyId: outreach.companyId,
    },
  });

  if (
    outreach.company.status === CompanyStatus.EXCLUDED ||
    projectCompany?.reviewStatus === ReviewStatus.EXCLUDED
  ) {
    errors.push("제외된 업체에는 발송할 수 없습니다.");
  }

  const primarySource = outreach.company.sources?.[0];
  const isDemo =
    outreach.company.companyName.includes("데모") ||
    primarySource?.sourceType === "DEMO_SEARCH" ||
    (primarySource?.rawMetadata &&
      typeof primarySource.rawMetadata === "object" &&
      (primarySource.rawMetadata as { isDemo?: boolean }).isDemo === true);

  if (isDemo && process.env.EMAIL_PROVIDER === "gmail") {
    errors.push("데모 업체에는 실제 Gmail 발송을 할 수 없습니다.");
  }
}

function buildPreview(
  outreach: NonNullable<Awaited<ReturnType<typeof loadOutreach>>>,
  to: string,
) {
  return {
    to,
    subject: outreach.subject,
    body: outreach.emailBody,
    companyName: outreach.company.companyName,
  };
}
