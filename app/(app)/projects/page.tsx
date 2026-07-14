import type { Metadata } from "next";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DbSetupPageNotice } from "@/components/ui/db-setup-page-notice";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { isProductionEnvironment } from "@/lib/db/database-provider";
import { loadPageData } from "@/lib/db/errors";
import { getProjects } from "@/lib/db/projects";
import { ArrowRight, Plus } from "lucide-react";

export const metadata: Metadata = {
  title: "매각 프로젝트",
};

export default async function ProjectsPage() {
  const projects = await loadPageData(() => getProjects());

  if (projects === null) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="매각 프로젝트"
          description="진행 중인 매각·Exit 프로젝트를 관리합니다."
        />
        <DbSetupPageNotice resource="프로젝트 목록" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="매각 프로젝트"
        description="진행 중인 매각·Exit 프로젝트를 관리합니다."
        action={
          <Button disabled>
            <Plus data-icon="inline-start" />
            새 프로젝트
          </Button>
        }
      />

      {projects.length === 0 ? (
        <EmptyState
          title="등록된 프로젝트가 없습니다"
          description={
            isProductionEnvironment()
              ? "진웅산업 seed가 필요한 경우 npm run turso:seed:apply 를 실행하세요."
              : "시드 데이터를 실행하거나 새 매각 프로젝트를 등록하세요."
          }
          actionLabel="프로젝트 등록"
        />
      ) : (
        <div className="grid gap-4 xl:grid-cols-3">
          {projects.map((project) => (
            <Card
              key={project.id}
              className="border-border/80 shadow-sm transition-colors hover:border-primary/40"
            >
              <CardHeader className="flex flex-row items-start justify-between gap-4">
                <div>
                  <CardTitle className="text-base">{project.name}</CardTitle>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {project.projectType}
                  </p>
                </div>
                <Badge variant="secondary">{project.statusLabel}</Badge>
              </CardHeader>
              <CardContent className="space-y-4 text-sm">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">매각 주체</span>
                    <span>{project.companyName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">위치</span>
                    <span>{project.location ?? "-"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">타깃 업체</span>
                    <span className="font-medium">{project.targetCount}곳</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">희망가</span>
                    <span>{project.askingPriceLabel}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">최근 업데이트</span>
                    <span>{project.updatedAt}</span>
                  </div>
                </div>
                <div className="flex justify-end border-t pt-3">
                  <Button
                    size="sm"
                    render={<Link href={`/projects/${project.id}`} />}
                  >
                    상세보기
                    <ArrowRight data-icon="inline-end" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
