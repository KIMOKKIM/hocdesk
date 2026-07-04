import { createHash } from "crypto";
import { OUTREACH_LIMITS } from "@/lib/config/outreach-limits";
import {
  OutreachEmailType,
  resolveIndustryTemplate,
  type IndustryTemplateKey,
} from "@/lib/constants/email";
import {
  CompanyStatus,
  OutreachApprovalStatus,
  OutreachStatus,
  ReviewStatus,
} from "@/lib/constants/status";
import { getEmailDraftProvider } from "@/lib/email/draft";
import { outreachAudit } from "@/lib/email/outreach-audit";
import { getEmailProvider } from "@/lib/email/providers";
import {
  isEmailSuppressed,
  addToSuppressionList,
} from "@/lib/email/suppression";
import {
  validateOutreachApprovalRequest,
  validateOutreachSend,
} from "@/lib/email/safety";
import { getSenderProfile } from "@/lib/db/settings";
import { isContactReadyStatus } from "@/lib/review/target-review-service";
import { prisma } from "@/lib/prisma";

const UNSENT_APPROVAL_STATUSES = [
  OutreachApprovalStatus.DRAFT,
  OutreachApprovalStatus.PENDING,
  OutreachApprovalStatus.APPROVED,
];

function hashContent(subject: string, body: string) {
  return createHash("sha256")
    .update(`${subject}\n${body}`)
    .digest("hex")
    .slice(0, 16);
}

function resolveRecipientEmail(
  contact: { email?: string | null } | null | undefined,
  company: {
    generalEmail?: string | null;
    contacts?: { email?: string | null }[];
  },
) {
  return (
    contact?.email ??
    company.generalEmail ??
    company.contacts?.find((item) => item.email)?.email ??
    ""
  );
}

async function loadTargetContext(projectCompanyId: string, contactId?: string) {
  const target = await prisma.projectCompany.findUnique({
    where: { id: projectCompanyId },
    include: {
      company: { include: { contacts: true } },
      project: true,
    },
  });

  if (!target) throw new Error("타깃을 찾을 수 없습니다.");

  const contact =
    (contactId
      ? target.company.contacts.find((item) => item.id === contactId)
      : target.company.contacts.find((item) => item.email)) ?? null;

  return { target, contact };
}

export async function generateOutreachDraft(input: {
  projectCompanyId: string;
  contactId?: string;
  templateType?: IndustryTemplateKey | "AUTO";
  force?: boolean;
}) {
  const { target, contact } = await loadTargetContext(
    input.projectCompanyId,
    input.contactId,
  );

  if (target.company.status === CompanyStatus.EXCLUDED) {
    throw new Error("제외된 업체에는 이메일 초안을 생성할 수 없습니다.");
  }

  if (!isContactReadyStatus(target.reviewStatus)) {
    throw new Error(
      "연락 준비 완료(CONTACT_READY) 상태에서만 이메일 초안을 생성할 수 있습니다.",
    );
  }

  if (!target.fitScore || target.fitScore <= 0) {
    throw new Error("적합도 점수가 설정되어 있어야 합니다.");
  }

  if (!target.targetingReason?.trim()) {
    throw new Error("타깃 선정사유가 필요합니다.");
  }

  const recipientEmail = resolveRecipientEmail(contact, target.company);
  if (!recipientEmail) {
    throw new Error(
      "이메일 주소가 없어 초안을 생성할 수 없습니다. 연락처를 먼저 등록하세요.",
    );
  }

  if (await isEmailSuppressed(recipientEmail)) {
    throw new Error("수신거부 등록된 이메일 주소입니다.");
  }

  const existingDraft = await prisma.outreach.findFirst({
    where: {
      projectId: target.projectId,
      companyId: target.companyId,
      approvalStatus: { in: UNSENT_APPROVAL_STATUSES },
      status: { notIn: [OutreachStatus.SENT, OutreachStatus.CANCELLED] },
    },
  });

  if (existingDraft && !input.force) {
    throw new Error(
      "동일 업체에 미발송 초안이 이미 있습니다. 기존 초안을 검토하거나 삭제 후 다시 생성하세요.",
    );
  }

  const recentActivities = await prisma.dailyActivity.findMany({
    where: { projectId: target.projectId },
    orderBy: { activityDate: "desc" },
    take: 3,
  });

  const senderProfile = await getSenderProfile();
  const templateType = input.templateType ?? "AUTO";
  const draftProvider = getEmailDraftProvider();

  const generated = await draftProvider.generateDraft({
    project: target.project,
    company: target.company,
    projectCompany: target,
    contact,
    recentActivities,
    senderProfile,
    templateType,
  });

  const outreach = await prisma.outreach.create({
    data: {
      projectId: target.projectId,
      companyId: target.companyId,
      projectCompanyId: target.id,
      contactId: contact?.id ?? null,
      emailType: OutreachEmailType.INITIAL,
      subject: generated.subject,
      emailBody: generated.body,
      status: OutreachStatus.DRAFT,
      approvalStatus: OutreachApprovalStatus.DRAFT,
      templateType: generated.templateType,
      generationMethod: generated.generationMethod,
      contentHash: hashContent(generated.subject, generated.body),
      draftVersion: 1,
    },
    include: { company: true, contact: true, project: true },
  });

  outreachAudit("OUTREACH_DRAFT_CREATED", {
    outreachId: outreach.id,
    projectCompanyId: target.id,
    companyId: target.companyId,
    templateType: generated.templateType,
  });

  return {
    outreachId: outreach.id,
    outreach,
    subject: generated.subject,
    body: generated.body,
    approvalStatus: outreach.approvalStatus,
    status: outreach.status,
    generated,
  };
}

export async function updateOutreachDraft(
  outreachId: string,
  data: {
    subject?: string;
    emailBody?: string;
    contactId?: string | null;
    nextActionDate?: string | null;
    emailType?: string;
  },
) {
  const existing = await prisma.outreach.findUnique({
    where: { id: outreachId },
    include: { company: { include: { contacts: true } } },
  });
  if (!existing) throw new Error("이메일을 찾을 수 없습니다.");

  if (existing.status === OutreachStatus.SENT) {
    throw new Error("발송 완료된 이메일은 제목과 본문을 수정할 수 없습니다.");
  }
  if (existing.status === OutreachStatus.CANCELLED) {
    throw new Error("취소된 이메일은 수정할 수 없습니다.");
  }

  const nextSubject = data.subject ?? existing.subject;
  const nextBody = data.emailBody ?? existing.emailBody;
  const contentChanged =
    nextSubject !== existing.subject || nextBody !== existing.emailBody;

  let nextApprovalStatus = existing.approvalStatus;
  if (
    contentChanged &&
    existing.approvalStatus === OutreachApprovalStatus.APPROVED
  ) {
    nextApprovalStatus = OutreachApprovalStatus.DRAFT;
  }
  if (existing.approvalStatus === OutreachApprovalStatus.REJECTED) {
    nextApprovalStatus = OutreachApprovalStatus.DRAFT;
  }

  const updated = await prisma.outreach.update({
    where: { id: outreachId },
    data: {
      subject: nextSubject,
      emailBody: nextBody,
      contactId:
        data.contactId !== undefined ? data.contactId : existing.contactId,
      emailType: data.emailType ?? existing.emailType,
      nextActionDate: data.nextActionDate
        ? new Date(data.nextActionDate)
        : data.nextActionDate === null
          ? null
          : undefined,
      approvalStatus: nextApprovalStatus,
      status:
        existing.status === OutreachStatus.SCHEDULED && contentChanged
          ? OutreachStatus.DRAFT
          : existing.status,
      scheduledAt:
        existing.status === OutreachStatus.SCHEDULED && contentChanged
          ? null
          : undefined,
      contentHash: contentChanged
        ? hashContent(nextSubject, nextBody)
        : existing.contentHash,
      draftVersion: contentChanged
        ? existing.draftVersion + 1
        : existing.draftVersion,
    },
  });

  outreachAudit("OUTREACH_DRAFT_UPDATED", {
    outreachId,
    contentChanged,
    approvalStatus: updated.approvalStatus,
  });

  return updated;
}

export async function submitOutreachApproval(outreachId: string) {
  const validation = await validateOutreachApprovalRequest(outreachId);
  if (!validation.ok) {
    throw new Error(validation.errors.join(" "));
  }

  const updated = await prisma.outreach.update({
    where: { id: outreachId },
    data: {
      approvalStatus: OutreachApprovalStatus.PENDING,
      status: OutreachStatus.DRAFT,
    },
  });

  outreachAudit("OUTREACH_APPROVAL_REQUESTED", { outreachId });
  return updated;
}

export async function approveOutreach(outreachId: string, approvedBy?: string) {
  const existing = await prisma.outreach.findUnique({ where: { id: outreachId } });
  if (!existing) throw new Error("이메일을 찾을 수 없습니다.");

  if (existing.approvalStatus !== OutreachApprovalStatus.PENDING) {
    throw new Error("승인 대기(PENDING) 상태에서만 승인할 수 있습니다.");
  }

  const updated = await prisma.outreach.update({
    where: { id: outreachId },
    data: {
      approvalStatus: OutreachApprovalStatus.APPROVED,
      status: OutreachStatus.DRAFT,
      approvedAt: new Date(),
      approvedBy: approvedBy ?? "admin",
      contentHash: hashContent(existing.subject, existing.emailBody),
    },
  });

  outreachAudit("OUTREACH_APPROVED", { outreachId, approvedBy });
  return updated;
}

export async function rejectOutreach(outreachId: string, reason?: string) {
  const existing = await prisma.outreach.findUnique({ where: { id: outreachId } });
  if (!existing) throw new Error("이메일을 찾을 수 없습니다.");

  const updated = await prisma.outreach.update({
    where: { id: outreachId },
    data: {
      approvalStatus: OutreachApprovalStatus.REJECTED,
      status: OutreachStatus.DRAFT,
      rejectionReason: reason ?? "승인 거절",
    },
  });

  outreachAudit("OUTREACH_REJECTED", { outreachId, reason });
  return updated;
}

export async function scheduleOutreach(outreachId: string, scheduledAt: Date) {
  const existing = await prisma.outreach.findUnique({ where: { id: outreachId } });
  if (!existing) throw new Error("이메일을 찾을 수 없습니다.");

  if (existing.approvalStatus !== OutreachApprovalStatus.APPROVED) {
    throw new Error("승인된 이메일만 예약할 수 있습니다.");
  }

  if (scheduledAt <= new Date()) {
    throw new Error("예약 시간은 현재보다 미래여야 합니다.");
  }

  const duplicateSchedule = await prisma.outreach.findFirst({
    where: {
      id: { not: outreachId },
      companyId: existing.companyId,
      projectId: existing.projectId,
      status: OutreachStatus.SCHEDULED,
    },
  });
  if (duplicateSchedule) {
    throw new Error("동일 업체에 이미 예약된 이메일이 있습니다.");
  }

  const updated = await prisma.outreach.update({
    where: { id: outreachId },
    data: {
      status: OutreachStatus.SCHEDULED,
      scheduledAt,
    },
  });

  outreachAudit("OUTREACH_SCHEDULED", {
    outreachId,
    scheduledAt: scheduledAt.toISOString(),
  });
  return updated;
}

export async function cancelOutreach(outreachId: string) {
  const existing = await prisma.outreach.findUnique({ where: { id: outreachId } });
  if (!existing) throw new Error("이메일을 찾을 수 없습니다.");

  if (
    existing.status === OutreachStatus.SENT ||
    existing.status === OutreachStatus.REPLIED
  ) {
    throw new Error("발송·회신 완료된 이메일은 취소할 수 없습니다.");
  }

  return prisma.outreach.update({
    where: { id: outreachId },
    data: {
      status: OutreachStatus.CANCELLED,
      scheduledAt: null,
    },
  });
}

export async function sendOutreach(outreachId: string) {
  const validation = await validateOutreachSend(outreachId);
  if (!validation.ok) {
    throw new Error(validation.errors.join(" "));
  }

  const outreach = await prisma.outreach.findUnique({
    where: { id: outreachId },
    include: { company: true },
  });
  if (!outreach || !validation.preview) {
    throw new Error("발송 정보를 확인할 수 없습니다.");
  }

  const senderProfile = await getSenderProfile();
  if (!senderProfile.email) {
    throw new Error("발신자 이메일이 설정되지 않았습니다. 설정 화면에서 등록하세요.");
  }

  outreachAudit("OUTREACH_SEND_STARTED", {
    outreachId,
    to: validation.preview.to,
    from: senderProfile.email,
  });

  const provider = getEmailProvider();

  try {
    const result = await provider.send({
      outreachId,
      to: validation.preview.to,
      subject: validation.preview.subject,
      body: validation.preview.body,
      companyName: validation.preview.companyName,
    });

    if (!result.success) {
      const failed = await prisma.outreach.update({
        where: { id: outreachId },
        data: {
          status: OutreachStatus.FAILED,
          errorMessage: result.error ?? "발송 실패",
          failureReason: result.error ?? "발송 실패",
          provider: result.provider,
        },
      });
      outreachAudit("OUTREACH_SEND_FAILED", {
        outreachId,
        error: result.error,
      });
      return failed;
    }

    const sent = await prisma.outreach.update({
      where: { id: outreachId },
      data: {
        status: OutreachStatus.SENT,
        sentAt: new Date(),
        provider: result.provider,
        providerMessageId: result.messageId,
        errorMessage: null,
      },
    });

    await prisma.projectCompany.updateMany({
      where: {
        projectId: outreach.projectId,
        companyId: outreach.companyId,
      },
      data: { reviewStatus: ReviewStatus.OUTREACH_STARTED },
    });

    await prisma.company.update({
      where: { id: outreach.companyId },
      data: { status: CompanyStatus.OUTREACH_STARTED },
    });

    outreachAudit("OUTREACH_SENT", {
      outreachId,
      provider: result.provider,
      messageId: result.messageId,
    });

    return sent;
  } catch (error) {
    const message = error instanceof Error ? error.message : "발송 실패";
    const failed = await prisma.outreach.update({
      where: { id: outreachId },
      data: {
        status: OutreachStatus.FAILED,
        errorMessage: message,
        failureReason: message,
      },
    });
    outreachAudit("OUTREACH_SEND_FAILED", { outreachId, error: message });
    return failed;
  }
}

export async function recordOutreachReply(
  outreachId: string,
  input: {
    replyType: string;
    replySummary: string;
    repliedAt?: string;
    nextActionDate?: string | null;
  },
) {
  const existing = await prisma.outreach.findUnique({
    where: { id: outreachId },
    include: { company: true, contact: true },
  });
  if (!existing) throw new Error("이메일을 찾을 수 없습니다.");

  const repliedAt = input.repliedAt ? new Date(input.repliedAt) : new Date();

  const updated = await prisma.outreach.update({
    where: { id: outreachId },
    data: {
      status: OutreachStatus.REPLIED,
      repliedAt,
      replyType: input.replyType,
      replySummary: input.replySummary,
      replySentiment: input.replyType,
      nextActionDate: input.nextActionDate
        ? new Date(input.nextActionDate)
        : null,
    },
  });

  if (input.replyType === "UNSUBSCRIBE") {
    const email = resolveRecipientEmail(existing.contact, existing.company);
    if (email) {
      await addToSuppressionList({
        email,
        companyName: existing.company.companyName,
        reason: "수신거부 요청",
        source: "reply",
      });
      outreachAudit("OUTREACH_UNSUBSCRIBED", { outreachId, email });
    }
  }

  outreachAudit("OUTREACH_REPLY_RECORDED", {
    outreachId,
    replyType: input.replyType,
  });

  return updated;
}

export async function processScheduledOutreach(limit = OUTREACH_LIMITS.maxScheduledProcessBatch) {
  const due = await prisma.outreach.findMany({
    where: {
      status: OutreachStatus.SCHEDULED,
      approvalStatus: OutreachApprovalStatus.APPROVED,
      scheduledAt: { lte: new Date() },
    },
    orderBy: { scheduledAt: "asc" },
    take: limit,
  });

  const results: { outreachId: string; ok: boolean; error?: string }[] = [];

  for (const item of due) {
    try {
      await sendOutreach(item.id);
      results.push({ outreachId: item.id, ok: true });
    } catch (error) {
      results.push({
        outreachId: item.id,
        ok: false,
        error: error instanceof Error ? error.message : "발송 실패",
      });
    }
  }

  return results;
}

export async function deleteOutreachDraft(outreachId: string) {
  const existing = await prisma.outreach.findUnique({ where: { id: outreachId } });
  if (!existing) throw new Error("이메일을 찾을 수 없습니다.");

  if (
    existing.status === OutreachStatus.SENT ||
    existing.status === OutreachStatus.REPLIED
  ) {
    throw new Error("발송·회신 완료된 이메일은 삭제할 수 없습니다.");
  }

  await prisma.outreach.delete({ where: { id: outreachId } });
}

export async function getOutreachPreview(outreachId: string) {
  return validateOutreachSend(outreachId);
}

/** @deprecated use submitOutreachApproval */
export async function requestOutreachApproval(outreachId: string) {
  return submitOutreachApproval(outreachId);
}

export { resolveRecipientEmail, hashContent, resolveIndustryTemplate };
