import type { Metadata } from "next";
import Link from "next/link";
import { InitialCollectionPanel } from "@/components/projects/initial-collection-panel";
import {
  ProjectDetailIssuePanel,
  ProjectSectionNotice,
} from "@/components/projects/project-detail-issue-panel";
import { ProjectInsightsPanel } from "@/components/projects/project-insights-panel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DbSetupAlert } from "@/components/ui/db-setup-alert";
import { PageHeader } from "@/components/ui/page-header";
import { Separator } from "@/components/ui/separator";
import { getCollectionPanelStats } from "@/lib/collection/limits";
import {
  getProviderDisplayName,
  getProviderOptions,
} from "@/lib/collection/providers";
import {
  getCollectionJobDetail,
  getCollectionJobsByProject,
  getLatestInitialJob,
} from "@/lib/db/collection-jobs";
import {
  isProductionEnvironment,
  resolveDatabaseProvider,
} from "@/lib/db/database-provider";
import { getProjectByIdOrSlug } from "@/lib/db/projects";
import { assessDatabaseReadiness } from "@/lib/db/readiness";
import { safeQuery } from "@/lib/db/safe-query";
import { hasTursoEnv } from "@/lib/db/turso-env";
import { formatDateTime, formatKoreanWon } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { getProjectInsightsSafe } from "@/lib/project-insights/service";
import { JINWOONG_SALE_HIGHLIGHTS } from "@/lib/projects/jinwoong-sale-content";
import { OPERATIONAL_PROJECT_ID } from "@/lib/seed/operational-seed";
import { ArrowLeft, Building2 } from "lucide-react";

type ProjectDetailPageProps = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({
  params,
}: ProjectDetailPageProps): Promise<Metadata> {
  const { id } = await params;
  try {
    const project = await getProjectByIdOrSlug(id);
    return { title: project?.name ?? "프로젝트 상세" };
  } catch {
    return { title: "프로젝트 상세" };
  }
}

function emptyPanelStats() {
  return {
    todayCount: 0,
    pendingReview: 0,
    lastCollectionAt: null as Date | string | null,
    lastJobStatus: null as string | null,
    lastAcceptedCount: 0,
    lastDuplicateCount: 0,
    lastRejectedCount: 0,
  };
}

export default async function ProjectDetailPage({
  params,
}: ProjectDetailPageProps) {
  const { id: routeParam } = await params;

  let databaseProvider = "sqlite";
  try {
    databaseProvider = resolveDatabaseProvider();
  } catch {
    databaseProvider = process.env.DATABASE_PROVIDER?.trim() || "sqlite";
  }
  const isProduction = isProductionEnvironment();
  const hasTursoCredentials = hasTursoEnv();

  const readinessResult = await safeQuery(
    "readiness",
    () => assessDatabaseReadiness(prisma),
    {
      database: "error" as const,
      databaseProvider,
      schemaReady: false,
      seedReady: false,
      checks: {
        projectTable: false,
        companyTable: false,
        appSettingTable: false,
        jinwoongProject: false,
      },
    },
  );
  const readiness = readinessResult.data;

  const projectResult = await safeQuery(
    "project",
    () => getProjectByIdOrSlug(routeParam),
    null,
  );
  const project = projectResult.data;

  if (!project) {
    if (!readiness.schemaReady) {
      return (
        <div className="space-y-6">
          <PageHeader title="프로젝트 상세" description={routeParam} />
          <ProjectDetailIssuePanel
            code="SCHEMA_NOT_READY"
            message="운영 DB schema가 아직 준비되지 않았습니다. 초기화를 실행한 뒤 다시 열어주세요."
            showSetup
            databaseProvider={databaseProvider}
            isProduction={isProduction}
            hasTursoCredentials={hasTursoCredentials}
          />
        </div>
      );
    }

    if (!readiness.seedReady) {
      return (
        <div className="space-y-6">
          <PageHeader title="프로젝트 상세" description={routeParam} />
          <ProjectDetailIssuePanel
            code="SEED_NOT_READY"
            message="진웅산업 기본 데이터가 아직 생성되지 않았습니다. seed를 적용한 뒤 다시 열어주세요."
            showSetup
            databaseProvider={databaseProvider}
            isProduction={isProduction}
            hasTursoCredentials={hasTursoCredentials}
          />
        </div>
      );
    }

    if (!projectResult.ok) {
      return (
        <div className="space-y-6">
          <PageHeader title="프로젝트 상세" description={routeParam} />
          <ProjectDetailIssuePanel
            code="UNKNOWN"
            message="프로젝트 상세 정보를 불러오는 중 오류가 발생했습니다. 잠시 후 다시 시도하거나 DB 초기화 상태를 확인하세요."
            showSetup={databaseProvider === "turso"}
            databaseProvider={databaseProvider}
            isProduction={isProduction}
            hasTursoCredentials={hasTursoCredentials}
          />
        </div>
      );
    }

    return (
      <div className="space-y-6">
        <PageHeader title="프로젝트 상세" description={routeParam} />
        <ProjectDetailIssuePanel
          code="NOT_FOUND"
          message={`식별자 “${routeParam}”에 해당하는 프로젝트를 찾을 수 없습니다. 프로젝트 목록에서 다시 선택하세요.`}
          databaseProvider={databaseProvider}
          isProduction={isProduction}
          hasTursoCredentials={hasTursoCredentials}
        />
      </div>
    );
  }

  const projectId = project.id;

  const [insightsResult, jobsResult, latestJobResult, panelStatsResult, activitiesResult] =
    await Promise.all([
      safeQuery("insights", () => getProjectInsightsSafe(projectId), {
        insights: [],
        available: false,
        errorCode: "PROJECT_INSIGHT_TABLE_MISSING",
      }),
      safeQuery("collection-jobs", () => getCollectionJobsByProject(projectId), []),
      safeQuery("latest-initial-job", () => getLatestInitialJob(projectId), null),
      safeQuery("panel-stats", () => getCollectionPanelStats(projectId), emptyPanelStats()),
      safeQuery(
        "recent-activities",
        async () => {
          const rows = await prisma.dailyActivity.findMany({
            where: { projectId },
            orderBy: { activityDate: "desc" },
            take: 5,
            select: {
              id: true,
              activityType: true,
              activityDate: true,
              summary: true,
              result: true,
            },
          });
          return rows.map((row) => ({
            id: row.id,
            title: row.summary?.slice(0, 80) || row.activityType || "활동",
            activityType: row.activityType,
            summary: row.result ?? row.summary,
            activityDateLabel: formatDateTime(row.activityDate),
          }));
        },
        [] as Array<{
          id: string;
          title: string;
          activityType: string;
          summary: string | null;
          activityDateLabel: string;
        }>,
      ),
    ]);

  const insightsLoad = insightsResult.data;
  const collectionJobs = jobsResult.data;
  const latestInitialJob = latestJobResult.data;
  const panelStats = panelStatsResult.data;
  const recentActivities = activitiesResult.data;

  let latestJobDetail = null;
  if (latestInitialJob?.id) {
    const detailResult = await safeQuery(
      "job-detail",
      () => getCollectionJobDetail(latestInitialJob.id),
      null,
    );
    latestJobDetail = detailResult.data;
  }

  let providerName = "KakaoLocalSearchProvider";
  let providerOptions: ReturnType<typeof getProviderOptions> = [];
  try {
    providerName = getProviderDisplayName();
    providerOptions = getProviderOptions();
  } catch (error) {
    console.error(
      "[project-detail] provider options failed:",
      error instanceof Error ? error.message : error,
    );
  }

  const hasCompletedInitial = latestInitialJob?.status === "COMPLETED";
  const collectionAvailable = jobsResult.ok && panelStatsResult.ok;
  const insightsAvailable =
    insightsResult.ok && insightsLoad.available !== false;

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
            <Button
              render={<Link href={`/projects/${projectId}/search-quality`} />}
            >
              검색 품질
            </Button>
            <Button
              render={<Link href={`/targets?projectId=${projectId}`} />}
            >
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
                <dt className="text-muted-foreground">매각 주체</dt>
                <dd className="font-medium">{project.companyName}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">위치</dt>
                <dd className="font-medium">{project.location ?? "-"}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">자산 유형</dt>
                <dd className="font-medium">{project.projectType}</dd>
              </div>
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
                <dt className="text-muted-foreground">최근 업데이트</dt>
                <dd className="font-medium">{project.updatedAtLabel}</dd>
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
              <div>
                <dt className="text-muted-foreground">프로젝트 ID</dt>
                <dd className="font-mono text-xs">{projectId}</dd>
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
                {project._count?.projectCompanies ?? 0}곳
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">이메일</span>
              <span className="font-semibold">
                {project._count?.outreachs ?? 0}건
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">일일 활동</span>
              <span className="font-semibold">
                {project._count?.dailyActivities ?? 0}건
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {projectId === OPERATIONAL_PROJECT_ID ? (
        <Card className="border-border/80 shadow-sm">
          <CardHeader>
            <CardTitle>핵심 매각 정보</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="list-disc space-y-2 pl-5 text-sm leading-7 text-muted-foreground">
              {JINWOONG_SALE_HIGHLIGHTS.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
      ) : null}

      {insightsAvailable ? (
        <ProjectInsightsPanel
          projectId={projectId}
          initialInsights={insightsLoad.insights}
        />
      ) : (
        <div className="space-y-4">
          <ProjectSectionNotice
            title="진웅산업 분석"
            message="진웅산업 분석 테이블이 아직 생성되지 않았습니다. 운영 DB 초기화를 실행하세요."
            showSetupHint
          />
          {databaseProvider === "turso" ? (
            <DbSetupAlert
              databaseProvider={databaseProvider}
              isProduction={isProduction}
              hasTursoCredentials={hasTursoCredentials}
            />
          ) : null}
        </div>
      )}

      {collectionAvailable ? (
        <InitialCollectionPanel
          projectId={projectId}
          projectName={project.name}
          providerName={providerName}
          providerOptions={providerOptions}
          hasCompletedInitial={Boolean(hasCompletedInitial)}
          panelStats={panelStats}
          initialJobs={collectionJobs}
          initialJobDetail={latestJobDetail}
        />
      ) : (
        <div className="space-y-4">
          <ProjectSectionNotice
            title="타깃 업체 자동수집"
            message="타깃 수집 작업 테이블을 불러올 수 없습니다. schema에 TargetCollectionJob이 포함되어 있는지 확인하세요."
            showSetupHint
          />
          {databaseProvider === "turso" && insightsAvailable ? (
            <DbSetupAlert
              databaseProvider={databaseProvider}
              isProduction={isProduction}
              hasTursoCredentials={hasTursoCredentials}
            />
          ) : null}
        </div>
      )}

      <Card className="border-border/80 shadow-sm">
        <CardHeader>
          <CardTitle>검색 이력</CardTitle>
        </CardHeader>
        <CardContent>
          {!jobsResult.ok ? (
            <p className="text-sm text-muted-foreground">
              수집 이력을 불러올 수 없습니다.
            </p>
          ) : collectionJobs.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              수집 작업 이력이 없습니다.
            </p>
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
          {!project.projectCompanies || project.projectCompanies.length === 0 ? (
            <div className="space-y-4 rounded-lg border border-dashed p-6">
              <div>
                <p className="font-medium">아직 실제 타깃 업체가 없습니다</p>
                <p className="mt-2 text-sm text-muted-foreground">
                  카카오 실제 업체 검색을 실행하면 검토대기 상태의 실제 업체가
                  이곳에 표시됩니다.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button render={<Link href="#target-collection-panel" />}>
                  카카오 검색 실행
                </Button>
                <Button
                  variant="outline"
                  render={
                    <Link href={`/search-candidates?projectId=${projectId}`} />
                  }
                >
                  검색 후보 보기
                </Button>
                <Button
                  variant="outline"
                  render={<Link href="#target-collection-panel" />}
                >
                  수집 이력 보기
                </Button>
              </div>
            </div>
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

      <Card className="border-border/80 shadow-sm">
        <CardHeader>
          <CardTitle>최근 활동</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-lg border p-3">
              <p className="text-xs text-muted-foreground">일일 활동</p>
              <p className="mt-1 font-semibold">
                {project._count?.dailyActivities ?? 0}건
              </p>
            </div>
            <div className="rounded-lg border p-3">
              <p className="text-xs text-muted-foreground">신규 타깃(실제)</p>
              <p className="mt-1 font-semibold">
                {project._count?.projectCompanies ?? 0}곳
              </p>
            </div>
            <div className="rounded-lg border p-3">
              <p className="text-xs text-muted-foreground">아웃리치</p>
              <p className="mt-1 font-semibold">
                {project._count?.outreachs ?? 0}건
              </p>
            </div>
          </div>
          {!activitiesResult.ok ? (
            <p className="text-muted-foreground">
              활동 기록을 불러올 수 없습니다.
            </p>
          ) : recentActivities.length === 0 ? (
            <p className="text-muted-foreground">아직 활동 기록이 없습니다.</p>
          ) : (
            <ul className="divide-y">
              {recentActivities.map((activity) => (
                <li key={activity.id} className="py-3 first:pt-0 last:pb-0">
                  <Link
                    href={`/activities/${activity.id}`}
                    className="font-medium text-primary hover:underline"
                  >
                    {activity.title}
                  </Link>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {activity.activityType} · {activity.activityDateLabel}
                  </p>
                  {activity.summary ? (
                    <p className="mt-1 text-muted-foreground">{activity.summary}</p>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
