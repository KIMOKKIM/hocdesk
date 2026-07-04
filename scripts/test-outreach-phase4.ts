/**
 * Phase 4 이메일 아웃리치 검증
 * 실행: npx tsx scripts/test-outreach-phase4.ts
 */
import "dotenv/config";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "../app/generated/prisma/client";
import {
  OutreachApprovalStatus,
  OutreachStatus,
  ReviewStatus,
} from "../lib/constants/status";
import { saveSenderProfile, DEFAULT_SENDER_PROFILE } from "../lib/db/settings";
import {
  approveOutreach,
  generateOutreachDraft,
  sendOutreach,
  submitOutreachApproval,
  updateOutreachDraft,
} from "../lib/email/outreach-service";
import { validateOutreachSend } from "../lib/email/safety";

const adapter = new PrismaBetterSqlite3({
  url: process.env.DATABASE_URL ?? "file:./dev.db",
});
const prisma = new PrismaClient({ adapter });

const FORBIDDEN = [/급매/i, /금융.*압박/i, /경마장.*확정/i, /토양.*문제.*없/i];

async function ensureSenderProfile() {
  await saveSenderProfile({
    ...DEFAULT_SENDER_PROFILE,
    email: "outreach@targetbridge.local",
    phone: "010-0000-0000",
  });
}

async function findContactReadyByKeyword(keyword: string) {
  const candidates = await prisma.projectCompany.findMany({
    where: {
      reviewStatus: {
        in: [ReviewStatus.CONTACT_READY, ReviewStatus.APPROVED],
      },
      targetingReason: { not: null },
      fitScore: { gt: 0 },
      company: {
        OR: [
          { detailedIndustry: { contains: keyword } },
          { industryGroup: { contains: keyword } },
        ],
      },
    },
    include: { company: { include: { contacts: true } } },
    take: 10,
  });

  for (const candidate of candidates) {
    const email =
      candidate.company.contacts.find((c) => c.email)?.email ??
      candidate.company.generalEmail;
    if (!email) continue;
    const suppressed = await prisma.suppressionList.findUnique({
      where: { email: email.toLowerCase() },
    });
    if (!suppressed) return candidate;
  }

  return null;
}

function validateDraft(subject: string, body: string, companyName: string) {
  if (!body.includes("53억")) throw new Error("53억원 표현 누락");
  if (!body.includes(companyName)) throw new Error("업체명 미반영");
  if (!body.includes("수신") && !body.includes("거부")) {
    throw new Error("수신거부 안내 누락");
  }
  for (const pattern of FORBIDDEN) {
    if (pattern.test(body)) throw new Error(`금지 표현: ${pattern}`);
  }
}

async function testIndustryDrafts() {
  console.log("\n=== A. 업종별 초안 생성 ===");
  const keywords = ["상용차", "정비", "재활용", "부동산"];
  const subjects = new Set<string>();

  for (const keyword of keywords) {
    const target = await findContactReadyByKeyword(keyword);
    if (!target) {
      console.log(`SKIP ${keyword}: CONTACT_READY 업체 없음`);
      continue;
    }

    await prisma.outreach.deleteMany({
      where: {
        companyId: target.companyId,
        projectId: target.projectId,
        status: { not: OutreachStatus.SENT },
      },
    });

    const result = await generateOutreachDraft({
      projectCompanyId: target.id,
    });

    validateDraft(result.subject, result.body, target.company.companyName);
    subjects.add(result.subject);
    console.log(`✓ ${keyword}: ${target.company.companyName} (${result.generated.templateType})`);
  }

  if (subjects.size >= 2) {
    console.log(`✓ 제목 ${subjects.size}종 서로 다름`);
  }
}

async function findNonSuppressedTarget() {
  const candidates = await prisma.projectCompany.findMany({
    where: {
      reviewStatus: {
        in: [ReviewStatus.CONTACT_READY, ReviewStatus.APPROVED],
      },
      fitScore: { gt: 0 },
      targetingReason: { not: null },
    },
    include: { company: { include: { contacts: true } } },
    take: 20,
  });

  for (const candidate of candidates) {
    const email =
      candidate.company.contacts.find((c) => c.email)?.email ??
      candidate.company.generalEmail;
    if (!email) continue;
    const suppressed = await prisma.suppressionList.findUnique({
      where: { email: email.toLowerCase() },
    });
    if (!suppressed) return candidate;
  }

  return null;
}

async function testApprovalFlow() {
  console.log("\n=== B. 승인·발송 ===");

  const target = await findNonSuppressedTarget();

  if (!target) throw new Error("CONTACT_READY 타깃 없음");

  await prisma.outreach.deleteMany({
    where: { projectId: target.projectId, companyId: target.companyId },
  });

  const { outreachId, outreach } = await generateOutreachDraft({
    projectCompanyId: target.id,
  });

  if (outreach.approvalStatus !== OutreachApprovalStatus.DRAFT) {
    throw new Error("DRAFT approvalStatus 아님");
  }
  console.log("1) DRAFT 생성");

  await updateOutreachDraft(outreachId, {
    emailBody: `${outreach.emailBody}\n\n(검토 메모)`,
  });
  console.log("2) 본문 수정");

  await submitOutreachApproval(outreachId);
  const pending = await prisma.outreach.findUnique({ where: { id: outreachId } });
  if (pending?.approvalStatus !== OutreachApprovalStatus.PENDING) {
    throw new Error("PENDING 아님");
  }
  console.log("3) 승인 요청 PENDING");

  await approveOutreach(outreachId);
  const approved = await prisma.outreach.findUnique({ where: { id: outreachId } });
  if (approved?.approvalStatus !== OutreachApprovalStatus.APPROVED) {
    throw new Error("APPROVED 아님");
  }
  console.log("4) APPROVED");

  const sent = await sendOutreach(outreachId);
  if (sent.status !== OutreachStatus.SENT) {
    throw new Error(`SENT 아님: ${sent.status}`);
  }
  console.log("5) SENT", sent.providerMessageId);

  const company = await prisma.company.findUnique({
    where: { id: target.companyId },
  });
  if (company?.status !== "OUTREACH_STARTED") {
    throw new Error("Company OUTREACH_STARTED 아님");
  }
  console.log("6) OUTREACH_STARTED");

  const blocked = await validateOutreachSend(outreachId);
  if (blocked.ok) throw new Error("재발송 차단 실패");
  console.log("7) 재발송 차단:", blocked.errors[0]);

  const otherTarget = await findNonSuppressedTarget();
  if (otherTarget && otherTarget.id !== target.id) {
    await prisma.outreach.deleteMany({
      where: {
        projectId: otherTarget.projectId,
        companyId: otherTarget.companyId,
      },
    });
    const { outreachId: draftId } = await generateOutreachDraft({
      projectCompanyId: otherTarget.id,
    });
    const draftBlocked = await validateOutreachSend(draftId);
    if (draftBlocked.ok) throw new Error("미승인 발송 허용됨");
    console.log("8) 미승인 차단:", draftBlocked.errors[0]);
  } else {
    console.log("8) 미승인 차단: 다른 타깃 없음 — 스킵");
  }
}

async function testNegativeCases() {
  console.log("\n=== C. 부정 테스트 ===");

  const excluded = await prisma.projectCompany.findFirst({
    where: { company: { status: "EXCLUDED" } },
  });
  if (excluded) {
    try {
      await generateOutreachDraft({ projectCompanyId: excluded.id });
      throw new Error("EXCLUDED 생성 허용됨");
    } catch {
      console.log("✓ EXCLUDED 차단");
    }
  }

  const noEmail = await prisma.projectCompany.findFirst({
    where: {
      reviewStatus: ReviewStatus.CONTACT_READY,
      company: {
        generalEmail: null,
        contacts: { none: { email: { not: null } } },
      },
    },
  });
  if (noEmail) {
    try {
      await generateOutreachDraft({ projectCompanyId: noEmail.id });
      throw new Error("이메일 없음 생성 허용됨");
    } catch {
      console.log("✓ 이메일 없음 차단");
    }
  }

  const sent = await prisma.outreach.findFirst({
    where: { status: OutreachStatus.SENT },
  });
  if (sent) {
    try {
      await updateOutreachDraft(sent.id, { subject: "변경 시도" });
      throw new Error("SENT 수정 허용됨");
    } catch {
      console.log("✓ SENT 수정 차단");
    }
  }
}

async function main() {
  await ensureSenderProfile();
  await testIndustryDrafts();
  await testApprovalFlow();
  await testNegativeCases();
  console.log("\n=== Phase 4 검증 통과 ===");
}

main()
  .catch((error) => {
    console.error("\n검증 실패:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
