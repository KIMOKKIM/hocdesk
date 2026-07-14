import { prisma } from "@/lib/prisma";
import {
  ReviewStatus,
} from "@/lib/constants/status";
import { ActivityType, ActivityResult } from "@/lib/constants/activity";
import { collectionRecommendationLabel } from "@/lib/constants/activity";
import type { ActivityAnalysisResult } from "@/lib/analysis/types";
import { formatDateTime } from "@/lib/format";
import { getAllExpansionSuggestions } from "@/lib/db/expansion-suggestions";
import { getOutreachPerformance, getOutreachStats } from "@/lib/db/outreach";
import { demoCompanyExcludeWhere, shouldIncludeDemo } from "@/lib/demo-filter";

function startOfToday() {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  return date;
}

export async function getDashboardStats(includeDemoParam?: string) {
  const includeDemo = shouldIncludeDemo(includeDemoParam);
  const today = startOfToday();
  const companyFilter = includeDemo ? {} : { company: demoCompanyExcludeWhere() };

  const [
    totalTargets,
    pendingReview,
    contactReady,
    discoveredCandidates,
    collectionJobs,
    todayActivities,
    outreachStats,
  ] = await Promise.all([
    prisma.projectCompany.count({
      where: { reviewStatus: { not: ReviewStatus.EXCLUDED }, ...companyFilter },
    }),
    prisma.projectCompany.count({
      where: { reviewStatus: ReviewStatus.PENDING, ...companyFilter },
    }),
    prisma.projectCompany.count({
      where: {
        reviewStatus: {
          in: [ReviewStatus.CONTACT_READY, ReviewStatus.APPROVED],
        },
        ...companyFilter,
      },
    }),
    prisma.discoveredCandidate.findMany({
      select: { companyName: true, provider: true },
    }),
    prisma.targetCollectionJob.findMany({
      select: { jobType: true, searchPlan: true },
    }),
    prisma.dailyActivity.count({
      where: { activityDate: { gte: today } },
    }),
    getOutreachStats(undefined, includeDemoParam),
  ]);

  const searchCandidates = includeDemo
    ? discoveredCandidates.length
    : discoveredCandidates.filter(
        (c) =>
          c.provider !== "demo" && !c.companyName.includes("데모"),
      ).length;

  const kakaoJobs = collectionJobs.filter((job) => {
    const plan =
      job.searchPlan && typeof job.searchPlan === "object"
        ? (job.searchPlan as { provider?: string })
        : {};
    const provider = plan.provider ?? "";
    if (!includeDemo && (provider === "demo" || job.jobType.includes("DEMO"))) {
      return false;
    }
    return provider === "kakao" || provider.includes("kakao");
  }).length;

  return [
    { label: "실제 타깃 업체", value: totalTargets, change: includeDemo ? "전체" : "데모 제외" },
    { label: "검토대기 실제 업체", value: pendingReview, change: "담당자 검토 필요" },
    {
      label: "연락준비 실제 업체",
      value: contactReady,
      change: "이메일 초안 생성 가능",
    },
    { label: "실제 검색 후보", value: searchCandidates, change: "DiscoveredCandidate" },
    { label: "실제 Kakao 수집 작업", value: kakaoJobs, change: "TargetCollectionJob" },
    { label: "실제 업체 이메일 초안", value: outreachStats.draft, change: "작성·검토 중" },
    { label: "승인 대기", value: outreachStats.pending, change: "팀장 승인 대기" },
    { label: "승인 완료", value: outreachStats.approved, change: "발송 가능" },
    { label: "오늘 발송", value: outreachStats.todaySent, change: "ConsoleProvider" },
    { label: "예약 발송", value: outreachStats.scheduled, change: "예정 건수" },
    { label: "회신", value: outreachStats.replied, change: "수동 등록" },
    {
      label: "다음 조치 예정",
      value: outreachStats.nextAction,
      change: "후속 일정",
    },
    { label: "수신거부", value: outreachStats.suppressed, change: "SuppressionList" },
    { label: "오늘 활동", value: todayActivities, change: "일일 업무" },
  ];
}

export async function getOutreachDashboardSummary(includeDemoParam?: string) {
  return getOutreachPerformance(undefined, includeDemoParam);
}

export async function getRecentOutreachItems(includeDemoParam?: string) {
  const { getRecentOutreach } = await import("@/lib/db/outreach");
  return getRecentOutreach(5, includeDemoParam);
}

export async function getTodayWorkAnalysis() {
  const today = startOfToday();

  const [activities, outreachSent, outreachReplied, phoneActivities] =
    await Promise.all([
      prisma.dailyActivity.findMany({
        where: { activityDate: { gte: today } },
        include: { targetExpansionSuggestions: true },
      }),
      prisma.outreach.count({
        where: { sentAt: { gte: today } },
      }),
      prisma.outreach.count({
        where: { repliedAt: { gte: today } },
      }),
      prisma.dailyActivity.count({
        where: {
          activityDate: { gte: today },
          activityType: ActivityType.PHONE,
        },
      }),
    ]);

  const interestedCount = activities.filter(
    (item) => item.result === ActivityResult.INTERESTED,
  ).length;
  const rejectedCount = activities.filter(
    (item) => item.result === ActivityResult.REJECTED,
  ).length;

  const objections = new Set<string>();
  const positiveSignals = new Set<string>();
  const newSegments = new Set<string>();
  const recommendedActions = new Set<string>();
  let collectionLabel = "데이터 없음";

  const todaySuggestions = await prisma.targetExpansionSuggestion.count({
    where: { createdAt: { gte: today } },
  });

  for (const activity of activities) {
    if (activity.aiAnalysis && typeof activity.aiAnalysis === "object") {
      const analysis = activity.aiAnalysis as ActivityAnalysisResult;
      analysis.objections?.forEach((item) => objections.add(item));
      analysis.positiveSignals?.forEach((item) => positiveSignals.add(item));
      analysis.newTargetSuggestions?.forEach((item) =>
        newSegments.add(item.segment),
      );
      analysis.recommendedActions?.forEach((item) =>
        recommendedActions.add(item),
      );
      if (analysis.collectionRecommended) {
        collectionLabel = collectionRecommendationLabel(
          analysis.collectionRecommended,
        );
      }
    }
  }

  return {
    inputCount: activities.length,
    emailSentCount: outreachSent,
    replyCount: outreachReplied,
    phoneContactCount: phoneActivities,
    interestedCount,
    rejectedCount,
    topObjections: Array.from(objections).slice(0, 5),
    topPositiveSignals: Array.from(positiveSignals).slice(0, 5),
    newSegments: Array.from(newSegments).slice(0, 5),
    newTargetsDiscovered: todaySuggestions,
    recommendedActions: Array.from(recommendedActions).slice(0, 5),
    collectionRecommendation: collectionLabel,
  };
}

export async function getRecentActivities() {
  const activities = await prisma.dailyActivity.findMany({
    orderBy: { activityDate: "desc" },
    take: 5,
    include: { project: { select: { name: true } } },
  });

  return activities.map((activity) => ({
    id: activity.id,
    title: activity.summary ?? activity.rawText,
    time: formatDateTime(activity.activityDate),
    type: "활동",
  }));
}

export async function getRecentExpansionSuggestions() {
  return getAllExpansionSuggestions(5);
}
