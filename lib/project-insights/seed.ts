import type { PrismaClient } from "@/app/generated/prisma/client";
import {
  DEFAULT_JINWOONG_INSIGHTS,
  type InsightSeedContent,
} from "@/lib/project-insights/constants";

export async function seedProjectInsights(
  prisma: PrismaClient,
  projectId: string,
  defaults: InsightSeedContent[] = DEFAULT_JINWOONG_INSIGHTS,
) {
  for (const item of defaults) {
    await prisma.projectInsight.upsert({
      where: {
        projectId_category: {
          projectId,
          category: item.category,
        },
      },
      update: {},
      create: {
        projectId,
        category: item.category,
        title: item.title,
        summary: item.summary,
        keyIssues: item.keyIssues,
        saleImpact: item.saleImpact,
        opportunities: item.opportunities,
        risks: item.risks,
        sourceNotes: item.sourceNotes,
        sourceUrls: item.sourceUrls,
        lastUpdatedAt: new Date(),
      },
    });
  }
}
