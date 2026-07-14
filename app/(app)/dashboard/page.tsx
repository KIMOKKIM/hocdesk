import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DbSetupPageNotice } from "@/components/ui/db-setup-page-notice";
import { DemoDataToggle } from "@/components/ui/demo-data-toggle";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { loadPageData } from "@/lib/db/errors";
import {
  getDashboardStats,
  getOutreachDashboardSummary,
  getRecentActivities,
  getRecentExpansionSuggestions,
  getRecentOutreachItems,
  getTodayWorkAnalysis,
} from "@/lib/db/dashboard";
import {
  outreachApprovalLabels,
  outreachStatusLabels,
} from "@/lib/constants/labels";
import { shouldIncludeDemo } from "@/lib/demo-filter";
import { formatDateTime } from "@/lib/format";

export const metadata: Metadata = {
  title: "대시보드",
};

type DashboardPageProps = {
  searchParams: Promise<{ includeDemo?: string }>;
};

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  const params = await searchParams;
  const includeDemo = shouldIncludeDemo(params.includeDemo);

  const pageData = await loadPageData(() =>
    Promise.all([
      getDashboardStats(params.includeDemo),
      getRecentActivities(),
      getTodayWorkAnalysis(),
      getRecentExpansionSuggestions(),
      getOutreachDashboardSummary(params.includeDemo),
      getRecentOutreachItems(params.includeDemo),
    ]),
  );

  if (pageData === null) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="대시보드"
          description="프로젝트 전체 현황과 최근 활동을 한눈에 확인합니다."
        />
        <DbSetupPageNotice resource="대시보드 데이터" />
      </div>
    );
  }

  const [
    dashboardStats,
    recentActivities,
    todayAnalysis,
    recentSuggestions,
    outreachPerformance,
    recentOutreach,
  ] = pageData;

  return (
    <div className="space-y-6">
      <PageHeader
        title="대시보드"
        description="프로젝트 전체 현황과 최근 활동을 한눈에 확인합니다."
      />

      <Suspense fallback={null}>
        <DemoDataToggle includeDemo={includeDemo} />
      </Suspense>

      <Card className="border-border/80 shadow-sm">
        <CardHeader>
          <CardTitle>오늘의 업무 분석</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <MiniStat label="입력 활동" value={todayAnalysis.inputCount} />
            <MiniStat label="발송 이메일" value={todayAnalysis.emailSentCount} />
            <MiniStat label="회신" value={todayAnalysis.replyCount} />
            <MiniStat label="전화 접촉" value={todayAnalysis.phoneContactCount} />
            <MiniStat label="관심 업체" value={todayAnalysis.interestedCount} />
            <MiniStat label="거절 업체" value={todayAnalysis.rejectedCount} />
            <MiniStat
              label="새 타깃 발견"
              value={todayAnalysis.newTargetsDiscovered}
            />
            <MiniStat
              label="추가수집 판단"
              value={todayAnalysis.collectionRecommendation}
              isText
            />
          </div>

          {todayAnalysis.topPositiveSignals.length > 0 ? (
            <div>
              <p className="mb-2 text-sm font-medium">주요 긍정 신호</p>
              <div className="flex flex-wrap gap-2">
                {todayAnalysis.topPositiveSignals.map((item) => (
                  <Badge key={item} variant="secondary">
                    {item}
                  </Badge>
                ))}
              </div>
            </div>
          ) : null}

          {todayAnalysis.topObjections.length > 0 ? (
            <div>
              <p className="mb-2 text-sm font-medium">주요 거절사유</p>
              <div className="flex flex-wrap gap-2">
                {todayAnalysis.topObjections.map((item) => (
                  <Badge key={item} variant="outline">
                    {item}
                  </Badge>
                ))}
              </div>
            </div>
          ) : null}

          {todayAnalysis.newSegments.length > 0 ? (
            <div>
              <p className="mb-2 text-sm font-medium">새롭게 발견된 업종</p>
              <div className="flex flex-wrap gap-2">
                {todayAnalysis.newSegments.map((item) => (
                  <Badge key={item}>{item}</Badge>
                ))}
              </div>
            </div>
          ) : null}

          {todayAnalysis.recommendedActions.length > 0 ? (
            <div>
              <p className="mb-2 text-sm font-medium">추천 조치</p>
              <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                {todayAnalysis.recommendedActions.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-7">
        {dashboardStats.map((stat) => (
          <StatCard
            key={stat.label}
            label={stat.label}
            value={stat.value}
            change={stat.change}
          />
        ))}
      </div>

      <Card className="border-border/80 shadow-sm">
        <CardHeader>
          <CardTitle>아웃리치 성과 요약</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
            <MiniStat label="생성 초안" value={outreachPerformance.created} />
            <MiniStat
              label="발송"
              value={outreachPerformance.sent}
            />
            <MiniStat label="회신" value={outreachPerformance.replied} />
            <MiniStat
              label="관심 회신"
              value={outreachPerformance.interestedReplies}
            />
            <MiniStat
              label="거절·수신거부"
              value={outreachPerformance.rejectedReplies}
            />
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/80 shadow-sm">
        <CardHeader>
          <CardTitle>최근 아웃리치</CardTitle>
        </CardHeader>
        <CardContent>
          {recentOutreach.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              생성된 아웃리치 이메일이 없습니다.
            </p>
          ) : (
            <ul className="divide-y">
              {recentOutreach.map((item) => (
                <li
                  key={item.id}
                  className="flex items-start justify-between gap-4 py-4 first:pt-0 last:pb-0"
                >
                  <div>
                    <Link
                      href={`/outreach/${item.id}`}
                      className="text-sm font-medium text-primary hover:underline"
                    >
                      {item.company.companyName}
                    </Link>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {item.subject ?? "(제목 없음)"}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {item.project.name}
                      {item.sentAt
                        ? ` · 발송 ${formatDateTime(item.sentAt)}`
                        : ""}
                      {item.nextActionDate
                        ? ` · 다음 조치 ${formatDateTime(item.nextActionDate)}`
                        : ""}
                    </p>
                  </div>
                  <div className="flex flex-wrap justify-end gap-2">
                    <Badge variant="outline">
                      {outreachApprovalLabels[item.approvalStatus] ??
                        item.approvalStatus}
                    </Badge>
                    <Badge variant="secondary">
                      {outreachStatusLabels[item.status] ?? item.status}
                    </Badge>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card className="border-border/80 shadow-sm">
        <CardHeader>
          <CardTitle>최근 신규 타깃 제안</CardTitle>
        </CardHeader>
        <CardContent>
          {recentSuggestions.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              최근 생성된 제안이 없습니다.
            </p>
          ) : (
            <ul className="divide-y">
              {recentSuggestions.map((item) => (
                <li
                  key={item.id}
                  className="flex items-start justify-between gap-4 py-4 first:pt-0 last:pb-0"
                >
                  <div>
                    <Link
                      href="/expansion-suggestions"
                      className="text-sm font-medium text-primary hover:underline"
                    >
                      {item.segmentName}
                    </Link>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {item.projectName} · {item.createdAt}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Badge>{item.recommendationScore}점</Badge>
                    <Badge variant="outline">{item.status}</Badge>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card className="border-border/80 shadow-sm">
        <CardHeader>
          <CardTitle>최근 활동</CardTitle>
        </CardHeader>
        <CardContent>
          {recentActivities.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              등록된 일일 활동이 없습니다.
            </p>
          ) : (
            <ul className="divide-y">
              {recentActivities.map((activity) => (
                <li
                  key={activity.id}
                  className="flex items-start justify-between gap-4 py-4 first:pt-0 last:pb-0"
                >
                  <div>
                    <Link
                      href={`/activities/${activity.id}`}
                      className="text-sm font-medium text-primary hover:underline"
                    >
                      {activity.title}
                    </Link>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {activity.time}
                    </p>
                  </div>
                  <Badge variant="secondary">{activity.type}</Badge>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function MiniStat({
  label,
  value,
  isText = false,
}: {
  label: string;
  value: number | string;
  isText?: boolean;
}) {
  return (
    <div className="rounded-lg border bg-muted/20 p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`mt-1 font-semibold ${isText ? "text-sm" : "text-2xl"}`}>
        {value}
      </p>
    </div>
  );
}
