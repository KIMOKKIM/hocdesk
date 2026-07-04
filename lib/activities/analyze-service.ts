import { analyzeActivity } from "@/lib/analysis/analyzer";
import type { ActivityAnalysisResult } from "@/lib/analysis/types";
import { COLLECTION_LIMITS } from "@/lib/config/collection-limits";
import { CollectionJobType } from "@/lib/constants/collection";
import {
  CollectionJobStatus,
  SuggestionStatus,
} from "@/lib/constants/status";
import {
  getActivityById,
  getContactedCompanyNames,
} from "@/lib/db/activities";
import { prisma } from "@/lib/prisma";

const MIN_SUGGESTION_SCORE = 50;

export async function analyzeDailyActivity(activityId: string) {
  const activity = await getActivityById(activityId);
  if (!activity) {
    throw new Error("활동을 찾을 수 없습니다.");
  }

  const contactedIds = Array.isArray(activity.contactedCompanyIds)
    ? (activity.contactedCompanyIds as string[])
    : [];

  const contactedCompanyNames = await getContactedCompanyNames(contactedIds);

  const analysis = await analyzeActivity({
    rawText: activity.rawText,
    activityType: activity.activityType,
    result: activity.result,
    projectId: activity.projectId,
    projectLocation: activity.project.location,
    contactedCompanyNames,
  });

  const { suggestionsCreated, warnings } = await createSuggestionsFromAnalysis(
    activity.projectId,
    activityId,
    analysis,
  );

  const enrichedAnalysis: ActivityAnalysisResult = {
    ...analysis,
    warnings,
    suggestionsCreated,
  };

  await prisma.dailyActivity.update({
    where: { id: activityId },
    data: {
      summary: analysis.dailySummary,
      aiAnalysis: enrichedAnalysis,
    },
  });

  return enrichedAnalysis;
}

async function createSuggestionsFromAnalysis(
  projectId: string,
  dailyActivityId: string,
  analysis: ActivityAnalysisResult,
) {
  const warnings: string[] = [];
  let suggestionsCreated = 0;

  for (const suggestion of analysis.newTargetSuggestions) {
    if (suggestion.recommendationScore < MIN_SUGGESTION_SCORE) {
      continue;
    }

    const existingPending = await prisma.targetExpansionSuggestion.findFirst({
      where: {
        projectId,
        segmentName: suggestion.segment,
        status: SuggestionStatus.PENDING,
      },
    });

    if (existingPending) {
      warnings.push(
        `동일 업종(${suggestion.segment})의 검토 대기 제안이 이미 있습니다.`,
      );
      continue;
    }

    const recentCollection = await prisma.targetCollectionJob.findFirst({
      where: {
        projectId,
        jobType: CollectionJobType.EXPANSION,
        status: CollectionJobStatus.COMPLETED,
        completedAt: {
          gte: new Date(
            Date.now() -
              COLLECTION_LIMITS.repeatSearchWaitDays * 24 * 60 * 60 * 1000,
          ),
        },
        suggestion: { segmentName: suggestion.segment },
      },
      orderBy: { completedAt: "desc" },
    });

    if (recentCollection) {
      warnings.push(
        `${suggestion.segment} 업종은 최근 ${COLLECTION_LIMITS.repeatSearchWaitDays}일 내 추가수집 이력이 있습니다. 재수집 시 중복 가능성을 검토하세요.`,
      );
    }

    const duplicateInActivity =
      await prisma.targetExpansionSuggestion.findFirst({
        where: {
          projectId,
          dailyActivityId,
          segmentName: suggestion.segment,
        },
      });

    if (duplicateInActivity) continue;

    await prisma.targetExpansionSuggestion.create({
      data: {
        projectId,
        dailyActivityId,
        segmentName: suggestion.segment,
        reason: suggestion.reason,
        evidence: suggestion.evidence,
        recommendationScore: suggestion.recommendationScore,
        priority: suggestion.priority,
        status: SuggestionStatus.PENDING,
        proposedRegions: suggestion.regions,
        proposedKeywords: suggestion.keywords,
        proposedTargetCount: suggestion.targetCount,
      },
    });

    suggestionsCreated += 1;
  }

  if (
    analysis.newTargetSuggestions.filter(
      (item) => item.recommendationScore >= MIN_SUGGESTION_SCORE,
    ).length === 0 &&
    analysis.newTargetSuggestions.length > 0
  ) {
    warnings.push(
      "추출된 신규 업종 단서가 있으나 50점 미만으로 DB 저장 대상이 아닙니다.",
    );
  }

  if (analysis.newTargetSuggestions.length === 0) {
    warnings.push("신규 타깃 업종 단서가 추출되지 않았습니다.");
  }

  return { suggestionsCreated, warnings };
}
