import "dotenv/config";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "../app/generated/prisma/client";
import { createActivity } from "../lib/db/activities";
import { analyzeDailyActivity } from "../lib/activities/analyze-service";
import {
  approveExpansionSuggestion,
} from "../lib/expansion/expansion-service";
import { ActivityType, ActivityResult } from "../lib/constants/activity";

const adapter = new PrismaBetterSqlite3({
  url: process.env.DATABASE_URL ?? "file:./dev.db",
});
const prisma = new PrismaClient({ adapter });

const SAMPLE_TEXT = `폐차장 업체 3곳에 연락했다. 가격과 철거비 부담이 컸다.
한 업체는 넓은 차량 보관공간을 필요로 하는 중고 상용차 수출업체가 더 적합하다고 조언했다.
대형차 정비업체도 검토할 가치가 있다는 의견이 있었다.`;

async function main() {
  const project = await prisma.project.findFirst({
    where: { name: { contains: "진웅산업" } },
  });
  if (!project) throw new Error("project not found");

  const beforeCompanies = await prisma.company.count();

  const activity = await createActivity({
    projectId: project.id,
    activityDate: new Date().toISOString().slice(0, 10),
    rawText: SAMPLE_TEXT,
    activityType: ActivityType.PHONE,
    result: ActivityResult.INFORMATION,
  });

  const analysis = await analyzeDailyActivity(activity.id);

  console.log("=== Analysis ===");
  console.log("Summary:", analysis.dailySummary);
  console.log("Objections:", analysis.objections);
  console.log(
    "Suggestions:",
    analysis.newTargetSuggestions.map((item) => ({
      segment: item.segment,
      score: item.recommendationScore,
    })),
  );

  const suggestions = await prisma.targetExpansionSuggestion.findMany({
    where: { dailyActivityId: activity.id },
  });

  console.log("\n=== DB Suggestions ===", suggestions.length);

  const exportSuggestion = suggestions.find((item) =>
    item.segmentName.includes("중고 상용차"),
  );

  if (!exportSuggestion) {
    throw new Error("중고 상용차 수출업체 제안이 생성되지 않았습니다.");
  }

  const { result } = await approveExpansionSuggestion({
    suggestionId: exportSuggestion.id,
    targetCount: 20,
  });

  const afterCompanies = await prisma.company.count();

  console.log("\n=== Collection ===");
  console.log(JSON.stringify(result, null, 2));
  console.log("Companies:", beforeCompanies, "->", afterCompanies, `(+${afterCompanies - beforeCompanies})`);
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });
