import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { InitialCollectionPanel } from "@/components/projects/initial-collection-panel";
import { ProjectInsightsPanel } from "@/components/projects/project-insights-panel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { Separator } from "@/components/ui/separator";
import { getProjectById } from "@/lib/db/projects";
import {
  getCollectionJobDetail,
  getCollectionJobsByProject,
  getLatestInitialJob,
} from "@/lib/db/collection-jobs";
import { getCollectionPanelStats } from "@/lib/collection/limits";
import { getProviderDisplayName, getProviderOptions } from "@/lib/collection/providers";
import { getProjectInsights } from "@/lib/project-insights/service";
import { formatKoreanWon } from "@/lib/format";
import { ArrowLeft, Building2 } from "lucide-react";

type ProjectDetailPageProps = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({
  params,
}: ProjectDetailPageProps): Promise<Metadata> {
  const { id } = await params;
  const project = await getProjectById(id);
  return { title: project?.name ?? "프로젝트 상세" };
}

export default async function ProjectDetailPage({
  params,
}: ProjectDetailPageProps) {
  const { id } = await params;
  const project = await getProjectById(id);

  if (!project) {
    notFound();
  }

  const [collectionJobs, latestInitialJob, panelStats, insights] =
    await Promise.all([
      getCollectionJobsByProject(id),
      getLatestInitialJob(id),
      getCollectionPanelStats(id),
      getProjectInsights(id),
    ]);

  const hasCompletedInitial = latestInitialJob?.status === "COMPLETED";
  const latestJobDetail = latestInitialJob
    ? await getCollectionJobDetail(latestInitialJob.id)
    : null;
  const providerOptions = getProviderOptions();

  return (
    <div className="space-y-6">
      <PageHeader
        title={project.name}
        description={`${project.companyName} · ${project.location ?? ""}`}
        action={
          <div className="flex gap-2">
            <Button variant="outline" render={<Link href="/projects" />}>
              <ArrowLeft data-icon="inline-start" />
              목록
            </Button>
            <Button render={<Link href={`/projects/${id}/search-quality`} />}>
              검색 품질
            </Button>
            <Button render={<Link href={`/targets?projectId=${project.id}`} />}>
              타깃 업체 보기
            </Button>
          </div>
        }
      />

      <div className="grid gap-6 xl:grid-cols-3">
        <Card className="border-border/80 shadow-sm xl:col-span-2">
          <CardHeader>
            <CardTitle>프로젝트 개요</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div className="flex flex-wrap gap-2">
              <Badge>{project.statusLabel}</Badge>
              <Badge variant="outline">{project.projectType}</Badge>
            </div>
            <p className="leading-7 text-muted-foreground">{project.summary}</p>
            <Separator />
            <dl className="grid gap-3 sm:grid-cols-2">
              <div>
                <dt className="text-muted-foreground">부동산 유형</dt>
                <dd className="font-medium">{project.propertyType ?? "-"}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">희망가</dt>
                <dd className="font-medium">
                  {formatKoreanWon(project.askingPrice)}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">토지 면적</dt>
                <dd className="font-medium">{project.landArea ?? "-"}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">건물 면적</dt>
                <dd className="font-medium">{project.buildingArea ?? "-"}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">희망 클로징</dt>
                <dd className="font-medium">
                  {project.desiredClosingDateLabel}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">등록일</dt>
                <dd className="font-medium">{project.createdAtLabel}</dd>
              </div>
            </dl>
          </CardContent>
        </Card>

        <Card className="border-border/80 shadow-sm">
          <CardHeader>
            <CardTitle>현황 요약</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">타깃 업체</span>
              <span className="font-semibold">
                {project._count.projectCompanies}곳
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">이메일</span>
              <span className="font-semibold">{project._count.outreachs}건</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">일일 활동</span>
              <span className="font-semibold">
                {project._count.dailyActivities}건
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      <ProjectInsightsPanel projectId={project.id} initialInsights={insights} />

      <InitialCollectionPanel
        projectId={project.id}
        projectName={project.name}
        providerName={getProviderDisplayName()}
        providerOptions={providerOptions}
        hasCompletedInitial={hasCompletedInitial}
        panelStats={panelStats}
        initialJobs={collectionJobs}
        initialJobDetail={latestJobDetail}
      />

      <Card className="border-border/80 shadow-sm">
        <CardHeader>
          <CardTitle>검색 이력</CardTitle>
        </CardHeader>
        <CardContent>
          {collectionJobs.length === 0 ? (
            <p className="text-sm text-muted-foreground">수집 작업 이력이 없습니다.</p>
          ) : (
            <ul className="divide-y">
              {collectionJobs.slice(0, 8).map((job) => (
                <li
                  key={job.id}
                  className="flex items-start justify-between gap-4 py-4 first:pt-0 last:pb-0"
                >
                  <div>
                    <Link
                      href={`/collection-jobs/${job.id}`}
                      className="text-sm font-medium text-primary hover:underline"
                    >
                      {job.jobType} · {job.statusLabel}
                    </Link>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Provider {job.provider} · {job.createdAt}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      신규 {job.acceptedCount} · 중복 {job.duplicateCount} · 제외{" "}
                      {job.rejectedCount}
                    </p>
                  </div>
                  <Badge variant="outline">{job.provider}</Badge>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card className="border-border/80 shadow-sm">
        <CardHeader>
          <CardTitle>상위 타깃 업체</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {project.projectCompanies.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              등록된 타깃 업체가 없습니다.
            </p>
          ) : (
            project.projectCompanies.map((target) => (
              <Link
                key={target.id}
                href={`/targets/${target.id}`}
                className="flex items-center justify-between rounded-lg border p-4 transition-colors hover:bg-muted/30"
              >
                <div className="flex items-center gap-3">
                  <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10">
                    <Building2 className="size-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">{target.company.companyName}</p>
                    <p className="text-sm text-muted-foreground">
                      {target.company.industryGroup} · 적합도 {target.fitScore}점
                    </p>
                  </div>
                </div>
                <Badge>{target.targetGrade}등급</Badge>
              </Link>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
