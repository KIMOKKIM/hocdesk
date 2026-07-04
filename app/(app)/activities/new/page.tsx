import type { Metadata } from "next";
import Link from "next/link";
import { ActivityForm } from "@/components/activities/activity-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { getProjectCompaniesForSelect } from "@/lib/db/activities";
import { getProjectOptions } from "@/lib/db/projects";
import { ArrowLeft } from "lucide-react";

export const metadata: Metadata = {
  title: "일일 활동 작성",
};

export default async function NewActivityPage() {
  const projects = await getProjectOptions();
  const defaultProjectId = projects[0]?.value;
  const companies = defaultProjectId
    ? await getProjectCompaniesForSelect(defaultProjectId)
    : [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="일일 활동 작성"
        description="업무 내용을 입력하면 규칙/AI 분석으로 신규 타깃 확장 제안을 생성합니다."
        action={
          <Button variant="outline" render={<Link href="/activities" />}>
            <ArrowLeft data-icon="inline-start" />
            목록
          </Button>
        }
      />

      <Card className="border-border/80 shadow-sm">
        <CardHeader>
          <CardTitle>활동 입력</CardTitle>
        </CardHeader>
        <CardContent>
          <ActivityForm
            projects={projects}
            companies={companies}
            defaultProjectId={defaultProjectId}
          />
        </CardContent>
      </Card>
    </div>
  );
}
