import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import type { ActivityAnalysisResult } from "@/lib/analysis/types";
import {
  activityResultLabels,
  activityTypeLabels,
  collectionRecommendationLabel,
} from "@/lib/constants/activity";
import { getActivityById } from "@/lib/db/activities";
import { formatDate, formatDateTime } from "@/lib/format";
import { ArrowLeft, Lightbulb } from "lucide-react";

type ActivityDetailPageProps = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({
  params,
}: ActivityDetailPageProps): Promise<Metadata> {
  const { id } = await params;
  const activity = await getActivityById(id);
  return { title: activity?.summary ?? "활동 상세" };
}

export default async function ActivityDetailPage({
  params,
}: ActivityDetailPageProps) {
  const { id } = await params;
  const activity = await getActivityById(id);

  if (!activity) {
    notFound();
  }

  const analysis =
    activity.aiAnalysis && typeof activity.aiAnalysis === "object"
      ? (activity.aiAnalysis as ActivityAnalysisResult)
      : null;

  return (
    <div className="space-y-6">
      <PageHeader
        title="일일 활동 상세"
        description={`${activity.project.name} · ${formatDate(activity.activityDate)}`}
        action={
          <Button variant="outline" render={<Link href="/activities" />}>
            <ArrowLeft data-icon="inline-start" />
            목록
          </Button>
        }
      />

      <div className="flex flex-wrap gap-2">
        <Badge variant="outline">
          {activityTypeLabels[activity.activityType] ?? activity.activityType}
        </Badge>
        {activity.result ? (
          <Badge variant="secondary">
            {activityResultLabels[activity.result] ?? activity.result}
          </Badge>
        ) : null}
        {analysis ? (
          <Badge>
            {analysis.analyzer === "ai" ? "AI 분석" : "규칙 기반 분석"}
          </Badge>
        ) : (
          <Badge variant="secondary">분석 없음</Badge>
        )}
      </div>

      <Card className="border-border/80 shadow-sm">
        <CardHeader>
          <CardTitle>원문 업무기록</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <p className="whitespace-pre-wrap leading-7">{activity.rawText}</p>
          {activity.memo ? (
            <p className="text-muted-foreground">메모: {activity.memo}</p>
          ) : null}
          {activity.nextActionDate ? (
            <p className="text-muted-foreground">
              다음 조치일: {formatDate(activity.nextActionDate)}
            </p>
          ) : null}
        </CardContent>
      </Card>

      {analysis ? (
        <>
          <Card className="border-border/80 shadow-sm">
            <CardHeader>
              <CardTitle>분석 요약</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <p className="leading-7">{analysis.dailySummary}</p>
              <AnalysisList title="긍정 신호" items={analysis.positiveSignals} />
              <AnalysisList title="부정 신호" items={analysis.negativeSignals} />
              <AnalysisList title="주요 거절 사유" items={analysis.objections} />
              <AnalysisList
                title="추천 조치"
                items={analysis.recommendedActions}
              />
              <p>
                <span className="text-muted-foreground">추가수집 필요: </span>
                {collectionRecommendationLabel(analysis.collectionRecommended)}
              </p>
              {analysis.warnings && analysis.warnings.length > 0 ? (
                <div>
                  <p className="mb-2 font-medium text-amber-700">주의</p>
                  <ul className="list-disc space-y-1 pl-5 text-amber-800">
                    {analysis.warnings.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </CardContent>
          </Card>

          {analysis.newTargetSuggestions.length > 0 ? (
            <Card className="border-border/80 shadow-sm">
              <CardHeader>
                <CardTitle>새롭게 발견된 타깃</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                {analysis.newTargetSuggestions.map((item) => (
                  <div key={item.segment} className="rounded-lg border p-3">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-medium">{item.segment}</p>
                      <Badge>{item.recommendationScore}점 · {item.priority}</Badge>
                    </div>
                    <p className="mt-2 text-muted-foreground">{item.reason}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          ) : null}

          {activity.targetExpansionSuggestions.length > 0 ? (
            <Button render={<Link href="/expansion-suggestions" />}>
              <Lightbulb data-icon="inline-start" />
              신규 타깃 제안 보기 ({activity.targetExpansionSuggestions.length}건)
            </Button>
          ) : null}
        </>
      ) : (
        <Card className="border-border/80 shadow-sm">
          <CardContent className="py-8 text-sm text-muted-foreground">
            아직 분석 결과가 없습니다. 활동 저장 시 자동 분석이 실행됩니다.
          </CardContent>
        </Card>
      )}

      <p className="text-xs text-muted-foreground">
        등록: {formatDateTime(activity.createdAt)}
      </p>
    </div>
  );
}

function AnalysisList({ title, items }: { title: string; items: string[] }) {
  if (items.length === 0) return null;
  return (
    <div>
      <p className="mb-2 font-medium">{title}</p>
      <ul className="list-disc space-y-1 pl-5 text-muted-foreground">
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </div>
  );
}
