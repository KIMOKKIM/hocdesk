import type { Metadata } from "next";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DbSetupAlert } from "@/components/ui/db-setup-alert";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { loadPageData } from "@/lib/db/errors";
import { getActivities } from "@/lib/db/activities";
import { FileText, Plus } from "lucide-react";

export const metadata: Metadata = {
  title: "일일 활동",
};

export default async function ActivitiesPage() {
  const activities = await loadPageData(() => getActivities());

  if (activities === null) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="일일 활동"
          description="담당자별 일일 업무 기록과 AI 분석 결과를 확인합니다."
        />
        <DbSetupAlert />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="일일 활동"
        description="담당자별 일일 업무 기록과 AI 분석 결과를 확인합니다."
        action={
          <Button render={<Link href="/activities/new" />}>
            <Plus data-icon="inline-start" />
            활동 기록 작성
          </Button>
        }
      />

      {activities.length === 0 ? (
        <EmptyState
          title="등록된 활동이 없습니다"
          description="일일 업무를 입력하면 신규 타깃 확장 제안이 생성됩니다."
          actionLabel="활동 작성"
        />
      ) : (
        <div className="space-y-4">
          {activities.map((activity) => (
            <Card key={activity.id} className="border-border/80 shadow-sm">
              <CardHeader className="flex flex-row items-start justify-between gap-4 pb-3">
                <div className="flex items-start gap-3">
                  <div className="flex size-10 items-center justify-center rounded-lg bg-muted">
                    <FileText className="size-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-base">
                      <Link
                        href={`/activities/${activity.id}`}
                        className="hover:text-primary hover:underline"
                      >
                        {activity.summary ?? activity.rawText.slice(0, 80)}
                      </Link>
                    </CardTitle>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {activity.projectName}
                    </p>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <Badge variant="outline">{activity.activityDate}</Badge>
                  <Badge variant="secondary">{activity.activityTypeLabel}</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <p className="whitespace-pre-wrap text-muted-foreground">
                  {activity.rawText}
                </p>
                <div className="flex flex-wrap gap-2">
                  {activity.resultLabel ? (
                    <Badge variant="outline">{activity.resultLabel}</Badge>
                  ) : null}
                  {activity.hasAnalysis ? (
                    <Badge>분석 완료 · 제안 {activity.suggestionCount}건</Badge>
                  ) : (
                    <Badge variant="secondary">분석 대기</Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
