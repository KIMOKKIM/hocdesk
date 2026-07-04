import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { getCollectionJobDetail } from "@/lib/db/collection-jobs";
import { ArrowLeft } from "lucide-react";

type CollectionJobPageProps = {
  params: Promise<{ jobId: string }>;
};

export async function generateMetadata({
  params,
}: CollectionJobPageProps): Promise<Metadata> {
  const { jobId } = await params;
  const job = await getCollectionJobDetail(jobId);
  return { title: job ? `수집 작업 ${job.statusLabel}` : "수집 작업" };
}

export default async function CollectionJobPage({ params }: CollectionJobPageProps) {
  const { jobId } = await params;
  const job = await getCollectionJobDetail(jobId);

  if (!job) {
    notFound();
  }

  const searchPlan = job.searchPlan as {
    regions?: string[];
    segments?: { segmentName: string }[];
    maxTotal?: number;
    maxPerSegment?: number;
    provider?: string;
    queryCount?: number;
    generatedQueries?: { query: string; segment: string }[];
  };
  const jobStats = job.jobStats as {
    provider?: string;
    queryCount?: number;
    apiCallCount?: number;
    rawResultCount?: number;
    industryAccepted?: number;
    industryReview?: number;
    industryRejected?: number;
    withPhone?: number;
    withoutWebsite?: number;
    withoutEmail?: number;
  } | null;

  return (
    <div className="space-y-6">
      <PageHeader
        title="수집 작업 상세"
        description={`${job.projectName} · ${job.jobType}`}
        action={
          <Button variant="outline" render={<Link href={`/projects/${job.projectId}`} />}>
            <ArrowLeft data-icon="inline-start" />
            프로젝트로
          </Button>
        }
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <InfoCard label="상태" value={job.statusLabel} />
        <InfoCard label="실행 시간" value={job.startedAt ?? job.createdAt} />
        <InfoCard label="완료 시간" value={job.completedAt ?? "-"} />
        <InfoCard label="요청 건수" value={`${job.requestedCount}건`} />
        <InfoCard label="처리" value={`${job.collectedCount}건`} />
        <InfoCard label="신규" value={`${job.acceptedCount}건`} />
        <InfoCard label="중복" value={`${job.duplicateCount}건`} />
        <InfoCard label="제외" value={`${job.rejectedCount}건`} />
      </div>

      <Card className="border-border/80 shadow-sm">
        <CardHeader>
          <CardTitle>검색계획</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <p>
            Provider: {searchPlan.provider ?? "demo"} · 검색어{" "}
            {searchPlan.queryCount ?? searchPlan.generatedQueries?.length ?? "-"}개
          </p>
          <p>
            최대 {searchPlan.maxTotal ?? job.requestedCount}건 · 업종별{" "}
            {searchPlan.maxPerSegment ?? "-"}건
          </p>
          <div className="flex flex-wrap gap-2">
            {(searchPlan.regions ?? []).map((region) => (
              <Badge key={region} variant="outline">
                {region}
              </Badge>
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            {(searchPlan.segments ?? []).map((segment) => (
              <Badge key={segment.segmentName} variant="secondary">
                {segment.segmentName}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      {jobStats ? (
        <Card className="border-border/80 shadow-sm">
          <CardHeader>
            <CardTitle>품질 리포트</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <InfoCard label="API 호출" value={`${jobStats.apiCallCount ?? 0}회`} />
              <InfoCard label="원본 결과" value={`${jobStats.rawResultCount ?? 0}건`} />
              <InfoCard
                label="업종 적합"
                value={`${jobStats.industryAccepted ?? 0}건`}
              />
              <InfoCard
                label="검토 필요"
                value={`${jobStats.industryReview ?? 0}건`}
              />
              <InfoCard
                label="업종 제외"
                value={`${jobStats.industryRejected ?? 0}건`}
              />
              <InfoCard label="전화번호 보유" value={`${jobStats.withPhone ?? 0}건`} />
              <InfoCard
                label="홈페이지 미확인"
                value={`${jobStats.withoutWebsite ?? 0}건`}
              />
              <InfoCard
                label="이메일 미확인"
                value={`${jobStats.withoutEmail ?? 0}건`}
              />
            </div>
            <p className="mt-4 text-sm text-muted-foreground">
              신규 비율{" "}
              {job.collectedCount > 0
                ? `${Math.round((job.acceptedCount / job.collectedCount) * 100)}%`
                : "-"}
              · 중복 비율{" "}
              {job.collectedCount > 0
                ? `${Math.round((job.duplicateCount / job.collectedCount) * 100)}%`
                : "-"}
              · 제외 비율{" "}
              {job.collectedCount > 0
                ? `${Math.round((job.rejectedCount / job.collectedCount) * 100)}%`
                : "-"}
            </p>
          </CardContent>
        </Card>
      ) : null}

      {job.errorMessage ? (
        <Card className="border-destructive/40 bg-destructive/5">
          <CardHeader>
            <CardTitle className="text-destructive">실패 사유</CardTitle>
          </CardHeader>
          <CardContent className="text-sm">{job.errorMessage}</CardContent>
        </Card>
      ) : null}

      <Card className="border-border/80 shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>생성·연결된 업체 ({job.companies.length}건)</CardTitle>
          <div className="flex gap-2 text-sm text-muted-foreground">
            <span>A {job.gradeCounts.A}</span>
            <span>B {job.gradeCounts.B}</span>
            <span>C {job.gradeCounts.C}</span>
          </div>
        </CardHeader>
        <CardContent>
          {job.companies.length === 0 ? (
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
                  {job.companies.map((company) => (
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

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border bg-muted/20 p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 font-semibold">{value}</p>
    </div>
  );
}
