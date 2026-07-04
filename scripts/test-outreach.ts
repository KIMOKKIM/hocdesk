/**
 * 이메일 생성·승인·console 발송 검증 스크립트
 * 실행: npx tsx scripts/test-outreach.ts
 */
import "dotenv/config";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "../app/generated/prisma/client";
import { OutreachStatus } from "../lib/constants/status";
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

async function main() {
  console.log("=== 이메일 아웃리치 검증 ===\n");

  await saveSenderProfile({
    ...DEFAULT_SENDER_PROFILE,
    email: "outreach@targetbridge.local",
  });

  const target = await prisma.projectCompany.findFirst({
    where: {
      targetGrade: "A",
      reviewStatus: { in: ["CONTACT_READY", "APPROVED"] },
      fitScore: { gt: 0 },
      targetingReason: { not: null },
    },
    include: { company: { include: { contacts: true } } },
  });

  if (!target) {
    throw new Error("CONTACT_READY A등급 타깃 업체를 찾을 수 없습니다.");
  }

  console.log(`1) A등급 업체: ${target.company.companyName} (${target.id})`);

  await prisma.outreach.deleteMany({
    where: { projectId: target.projectId, companyId: target.companyId },
  });

  const { outreach, generated } = await generateOutreachDraft({
    projectCompanyId: target.id,
  });
  console.log(
    `   생성 완료 — method: ${generated.generationMethod}, template: ${generated.templateType}`,
  );
  console.log(`   본문 길이: ${generated.body.length}자`);

  const editedBody = `${generated.body}\n\n(검토 후 발송 예정)`;
  await updateOutreachDraft(outreach.id, { emailBody: editedBody });
  console.log("2) 직접 수정 저장 완료");

  await submitOutreachApproval(outreach.id);
  const approved = await approveOutreach(outreach.id);
  console.log(`3) 승인 완료 — approvalStatus: ${approved.approvalStatus}`);

  const preview = await validateOutreachSend(outreach.id);
  console.log(
    `4) 발송 미리보기 — to: ${preview.preview?.to}, warnings: ${preview.warnings.length}`,
  );

  const sent = await sendOutreach(outreach.id);
  console.log(
    `5) console 발송 — status: ${sent.status}, sentAt: ${sent.sentAt?.toISOString()}`,
  );

  if (sent.status !== OutreachStatus.SENT) {
    throw new Error("발송 후 SENT 상태가 아닙니다.");
  }
  console.log("   ✓ SENT 상태 확인");

  const unapprovedSend = await validateOutreachSend(outreach.id);
  if (unapprovedSend.ok) {
    throw new Error("재발송이 허용되었습니다.");
  }
  console.log(`6) 재발송 차단 — ${unapprovedSend.errors[0]}`);

  console.log("\n=== 모든 검증 통과 ===");
}

main()
  .catch((e) => {
    console.error("\n검증 실패:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
