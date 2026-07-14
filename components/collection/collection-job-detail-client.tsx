"use client";

import Link from "next/link";
import { CollectionJobProgressPanel } from "@/components/collection/collection-job-progress-panel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { ArrowLeft } from "lucide-react";

type JobDetail = {
  id: string;
  projectId: string;
  projectName: string;
  jobType: string;
  status: string;
  statusLabel: string;
  searchPlan: unknown;
  jobStats: unknown;
  requestedCount: number;
  collectedCount: number;
  acceptedCount: number;
  duplicateCount: number;
  rejectedCount: number;
  progressPercent?: number | null;
  currentStep?: string | null;
  currentQuery?: string | null;
  processedQueries?: number;
  totalQueries?: number;
  apiCallCount?: number;
  rawResultCount?: number;
  reviewRequiredCount?: number;
  lastProgressAt?: string | null;
  lastProgressAtLabel?: string | null;
  lastMessage?: string | null;
  startedAt?: string | null;
  startedAtIso?: string | null;
  completedAt?: string | null;
  createdAt: string;
  errorMessage?: string | null;
  gradeCounts: { A: number; B: number; C: number };
  companies: {
    projectCompanyId: string | null;
    companyId: string;
    companyName: string;
    industryGroup: string | null;
    detailedIndustry: string | null;
    region: string | null;
    status: string | null;
    targetGrade: string | null;
    fitScore: number | null;
    sourceType: string | null;
    collectedAt: string;
  }[];
};

export function CollectionJobDetailClient({ job: initialJob }: { job: JobDetail }) {
  return (
    <div className="space-y-6">
      <PageHeader
        title="수집 작업 상세"
        description={`${initialJob.projectName} · ${initialJob.jobType}`}
        action={
          <Button
            variant="outline"
            render={<Link href={`/projects/${initialJob.projectId}`} />}
          >
            <ArrowLeft data-icon="inline-start" />
            프로젝트로
          </Button>
        }
      />

      <CollectionJobProgressPanel job={initialJob} poll showActions />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <InfoCard label="상태" value={initialJob.statusLabel} />
        <InfoCard label="실행 시간" value={initialJob.startedAt ?? initialJob.createdAt} />
        <InfoCard label="완료 시간" value={initialJob.completedAt ?? "-"} />
        <InfoCard label="요청 건수" value={`${initialJob.requestedCount}건`} />
        <InfoCard label="처리" value={`${initialJob.collectedCount}건`} />
        <InfoCard label="신규" value={`${initialJob.acceptedCount}건`} />
        <InfoCard label="중복" value={`${initialJob.duplicateCount}건`} />
        <InfoCard label="제외" value={`${initialJob.rejectedCount}건`} />
      </div>

      <SearchPlanCard searchPlan={initialJob.searchPlan} requestedCount={initialJob.requestedCount} />
      <QualityReportCard job={initialJob} />

      <Card className="border-border/80 shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>생성·연결된 업체 ({initialJob.companies.length}건)</CardTitle>
          <div className="flex gap-2 text-sm text-muted-foreground">
            <span>A {initialJob.gradeCounts.A}</span>
            <span>B {initialJob.gradeCounts.B}</span>
            <span>C {initialJob.gradeCounts.C}</span>
          </div>
        </CardHeader>
        <CardContent>
          {initialJob.companies.length === 0 ? (
            <p className="text-sm text-muted-foreground">기록된 업체가 없습니다.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1000px] text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="pb-3 font-medium">업체명</th>
                    <th className="pb-3 font-medium">업종</th>
                    <th className="pb-3 font-medium">지역</th>
                    <th className="pb-3 font-medium">적합도</th>
                    <th className="pb-3 font-medium">등급</th>
                    <th className="pb-3 font-medium">상태</th>
                    <th className="pb-3 font-medium">출처</th>
                    <th className="pb-3 font-medium">상세</th>
                  </tr>
                </thead>
                <tbody>
                  {initialJob.companies.map((company) => (
                    <tr
                      key={`${company.companyId}-${company.collectedAt}`}
                      className="border-b last:border-0"
                    >
                      <td className="py-3 font-medium">{company.companyName}</td>
                      <td className="py-3">
                        {company.industryGroup}
                        {company.detailedIndustry ? (
                          <p className="text-xs text-muted-foreground">
                            {company.detailedIndustry}
                          </p>
                        ) : null}
                      </td>
                      <td className="py-3">{company.region ?? "-"}</td>
                      <td className="py-3">{company.fitScore ?? "-"}</td>
                      <td className="py-3">{company.targetGrade ?? "-"}</td>
                      <td className="py-3">{company.status ?? "-"}</td>
                      <td className="py-3">{company.sourceType ?? "-"}</td>
                      <td className="py-3">
                        {company.projectCompanyId ? (
                          <Link
                            href={`/targets/${company.projectCompanyId}`}
                            className="text-primary hover:underline"
                          >
                            보기
                          </Link>
                        ) : (
                          "-"
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function SearchPlanCard({
  searchPlan,
  requestedCount,
}: {
  searchPlan: unknown;
  requestedCount: number;
}) {
  const plan = searchPlan as {
    regions?: string[];
    segments?: { segmentName: string }[];
    maxTotal?: number;
    maxPerSegment?: number;
    provider?: string;
    queryCount?: number;
    generatedQueries?: { query: string; segment: string }[];
  };

  return (
    <Card className="border-border/80 shadow-sm">
      <CardHeader>
        <CardTitle>검색계획</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <p>
          Provider: {plan.provider ?? "demo"} · 검색어{" "}
          {plan.queryCount ?? plan.generatedQueries?.length ?? "-"}개
        </p>
        <p>
          최대 {plan.maxTotal ?? requestedCount}건 · 업종별{" "}
          {plan.maxPerSegment ?? "-"}건
        </p>
        <div className="flex flex-wrap gap-2">
          {(plan.regions ?? []).map((region) => (
            <Badge key={region} variant="outline">
              {region}
            </Badge>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          {(plan.segments ?? []).map((segment) => (
            <Badge key={segment.segmentName} variant="secondary">
              {segment.segmentName}
            </Badge>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function QualityReportCard({ job }: { job: JobDetail }) {
  const jobStats = job.jobStats as {
    apiCallCount?: number;
    rawResultCount?: number;
    industryAccepted?: number;
    industryReview?: number;
    industryRejected?: number;
    withPhone?: number;
    withoutWebsite?: number;
    withoutEmail?: number;
  } | null;

  if (!jobStats) return null;

  return (
    <Card className="border-border/80 shadow-sm">
      <CardHeader>
        <CardTitle>품질 리포트</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <InfoCard label="API 호출" value={`${jobStats.apiCallCount ?? 0}회`} />
          <InfoCard label="원본 결과" value={`${jobStats.rawResultCount ?? 0}건`} />
          <InfoCard label="업종 적합" value={`${jobStats.industryAccepted ?? 0}건`} />
          <InfoCard label="검토 필요" value={`${jobStats.industryReview ?? 0}건`} />
          <InfoCard label="업종 제외" value={`${jobStats.industryRejected ?? 0}건`} />
          <InfoCard label="전화번호 보유" value={`${jobStats.withPhone ?? 0}건`} />
          <InfoCard label="홈페이지 미확인" value={`${jobStats.withoutWebsite ?? 0}건`} />
          <InfoCard label="이메일 미확인" value={`${jobStats.withoutEmail ?? 0}건`} />
        </div>
      </CardContent>
    </Card>
  );
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border bg-muted/20 p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 font-semibold">{value}</p>
    </div>
  );
}
