import "dotenv/config";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "../app/generated/prisma/client";
import { createActivity } from "../lib/db/activities";
import { analyzeDailyActivity } from "../lib/activities/analyze-service";
import { approveExpansionSuggestion } from "../lib/expansion/expansion-service";
import {
  bulkUpdateProjectCompanyReviewStatus,
  updateProjectCompanyReviewStatus,
} from "../lib/db/target-review";
import { ActivityType, ActivityResult } from "../lib/constants/activity";
import { ReviewStatus } from "../lib/constants/status";

const adapter = new PrismaBetterSqlite3({
  url: process.env.DATABASE_URL ?? "file:./dev.db",
});
const prisma = new PrismaClient({ adapter });

const SAMPLE_TEXT = `폐차장 업체 3곳에 연락했다.
가격과 철거비 부담이 크다는 의견이 많았다.
한 업체는 중고 상용차 수출업체가 더 적합하다고 조언했다.
대형차 정비업체도 검토할 가치가 있다는 의견이 있었다.
토양오염과 철거비 자료 요청이 반복됐다.`;

async function scenarioA() {
  console.log("\n=== Scenario A: Target Review ===");

  const pending = await prisma.projectCompany.findMany({
    where: { reviewStatus: ReviewStatus.PENDING },
    take: 3,
    include: { company: true },
  });

  if (pending.length < 3) {
    console.log("SKIP: PENDING targets < 3");
    return;
  }

  const ids = pending.map((item) => item.id);

  for (const id of ids) {
    await updateProjectCompanyReviewStatus(id, ReviewStatus.REVIEWED);
  }
  console.log("Reviewed:", ids.length);

  const withContact = await prisma.projectCompany.findMany({
    where: {
      id: { in: ids },
      OR: [
        { company: { mainPhone: { not: null } } },
        { company: { generalEmail: { not: null } } },
        { company: { contacts: { some: { OR: [{ email: { not: null } }, { mobile: { not: null } }] } } } },
      ],
    },
    take: 2,
  });

  if (withContact.length >= 1) {
    const readyResult = await bulkUpdateProjectCompanyReviewStatus(
      withContact.map((item) => item.id),
      ReviewStatus.CONTACT_READY,
    );
    console.log("CONTACT_READY bulk:", readyResult);
  }

  const withoutContact = ids.filter(
    (id) => !withContact.some((item) => item.id === id),
  );
  if (withoutContact.length > 0) {
    const blocked = await bulkUpdateProjectCompanyReviewStatus(
      withoutContact,
      ReviewStatus.CONTACT_READY,
    );
    console.log("Blocked without contact:", blocked);
  }
}

async function scenarioB() {
  console.log("\n=== Scenario B: Daily Activity Analysis ===");

  const project = await prisma.project.findFirst({
    where: { name: { contains: "진웅산업" } },
  });
  if (!project) throw new Error("project not found");

  const activity = await createActivity({
    projectId: project.id,
    activityDate: new Date().toISOString().slice(0, 10),
    rawText: SAMPLE_TEXT,
    activityType: ActivityType.PHONE,
    result: ActivityResult.INFORMATION,
  });

  const analysis = await analyzeDailyActivity(activity.id);

  console.log("Summary:", analysis.dailySummary);
  console.log("Objections:", analysis.objections);
  console.log(
    "Suggestions:",
    analysis.newTargetSuggestions.map((item) => ({
      segment: item.segment,
      score: item.recommendationScore,
      priority: item.priority,
    })),
  );
  console.log("Warnings:", analysis.warnings ?? []);
  console.log("Suggestions created:", analysis.suggestionsCreated ?? 0);

  const dbSuggestions = await prisma.targetExpansionSuggestion.findMany({
    where: { dailyActivityId: activity.id },
  });
  console.log("DB suggestions:", dbSuggestions.length);

  return dbSuggestions;
}

async function scenarioC(suggestions: { id: string; segmentName: string }[]) {
  console.log("\n=== Scenario C: EXPANSION Collection ===");

  const exportSuggestion = suggestions.find((item) =>
    item.segmentName.includes("중고 상용차"),
  );

  if (!exportSuggestion) {
    console.log("SKIP: no 중고 상용차 suggestion");
    return;
  }

  const beforeCompanies = await prisma.company.count();

  const result = await approveExpansionSuggestion({
    suggestionId: exportSuggestion.id,
    targetCount: 20,
    regions: ["양주시", "포천시", "김포시", "인천광역시"],
    keywords: ["중고 상용차 수출", "트럭 수출", "차량 야적장"],
  });

  const afterCompanies = await prisma.company.count();
  const suggestion = await prisma.targetExpansionSuggestion.findUnique({
    where: { id: exportSuggestion.id },
  });

  console.log("Job:", result.jobId);
  console.log("Collection:", result.result);
  console.log("Companies:", beforeCompanies, "->", afterCompanies);
  console.log("Suggestion status:", suggestion?.status);
}

async function main() {
  await scenarioA();
  const suggestions = await scenarioB();
  await scenarioC(suggestions);
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });
