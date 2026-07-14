import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DbSetupPageNotice } from "@/components/ui/db-setup-page-notice";
import { DemoDataToggle } from "@/components/ui/demo-data-toggle";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { TargetFilters } from "@/components/targets/target-filters";
import { TargetsTable } from "@/components/targets/targets-table";
import { loadPageData } from "@/lib/db/errors";
import {
  getTargetFilterOptions,
  getTargets,
} from "@/lib/db/targets";
import { resolveIncludeDemo } from "@/lib/demo-filter";
import { Plus } from "lucide-react";

export const metadata: Metadata = {
  title: "타깃 업체",
};

type TargetsPageProps = {
  searchParams: Promise<{
    q?: string;
    industry?: string;
    region?: string;
    grade?: string;
    status?: string;
    projectId?: string;
    sourceType?: string;
    collectedFrom?: string;
    collectedTo?: string;
    hasContact?: string;
    hasEmail?: string;
    includeDemo?: string;
  }>;
};

export default async function TargetsPage({ searchParams }: TargetsPageProps) {
  const filters = await searchParams;
  const pageData = await loadPageData(() =>
    Promise.all([getTargets(filters), getTargetFilterOptions()]),
  );

  if (pageData === null) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="타깃 업체"
          description="프로젝트별 타깃 업체 목록과 등급·상태를 관리합니다."
        />
        <DbSetupPageNotice resource="타깃 목록" />
      </div>
    );
  }

  const [targets, filterOptions] = pageData;
  const includeDemo = resolveIncludeDemo(filters.includeDemo);

  return (
    <div className="space-y-6">
      <PageHeader
        title="타깃 업체"
        description="프로젝트별 타깃 업체 목록과 등급·상태를 관리합니다."
        action={
          <Button render={<Link href="/targets/new" />}>
            <Plus data-icon="inline-start" />
            타깃 추가
          </Button>
        }
      />

      <Suspense fallback={<div className="h-32 rounded-xl border bg-muted/20" />}>
        <div className="space-y-4">
          <DemoDataToggle includeDemo={includeDemo} />
          <TargetFilters
          industries={filterOptions.industries}
          regions={filterOptions.regions}
          grades={filterOptions.grades}
          sourceTypes={filterOptions.sourceTypes}
          statuses={filterOptions.statuses}
        />
        </div>
      </Suspense>

      <Card className="border-border/80 shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>타깃 목록</CardTitle>
          <span className="text-sm text-muted-foreground">
            총 {targets.length}곳
          </span>
        </CardHeader>
        <CardContent>
          {targets.length === 0 ? (
            <EmptyState
              title="아직 실제 타깃 업체가 없습니다"
              description="아직 실제 타깃 업체가 없습니다. 프로젝트 상세에서 카카오 실제 업체 검색을 실행하세요."
              actionLabel="프로젝트로 이동"
            />
          ) : (
            <TargetsTable targets={targets} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
