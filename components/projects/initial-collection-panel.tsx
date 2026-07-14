"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { CollectionJobProgressPanel } from "@/components/collection/collection-job-progress-panel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  COLLECTION_LIMITS,
  DEFAULT_INITIAL_SEGMENTS,
  INITIAL_TARGET_REGIONS,
  estimateInitialCollectionCount,
} from "@/lib/constants/collection";
import { formatDateTime } from "@/lib/format";
import { withBasePath } from "@/lib/paths";
import { ChevronDown, ChevronUp, History, Loader2, Play, RefreshCw, Settings2 } from "lucide-react";

type CollectionJobSummary = {
  id: string;
  status: string;
  statusLabel: string;
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
  lastMessage?: string | null;
  errorMessage?: string | null;
  createdAt: string;
  completedAt?: string | null;
  startedAt?: string | null;
};

type CollectionJobDetail = CollectionJobSummary & {
  gradeCounts?: { A: number; B: number; C: number };
  lastProgressAtLabel?: string | null;
  startedAtIso?: string | null;
  projectId?: string;
  companies: {
    projectCompanyId: string | null;
    companyId: string;
    companyName: string;
    industryGroup: string | null;
    region: string | null;
    targetGrade: string | null;
    fitScore: number | null;
    searchKeyword: string | null;
    sourceType: string | null;
    collectedAt: string;
  }[];
};

type CollectionPanelStats = {
  todayCount: number;
  pendingReview: number;
  lastCollectionAt: Date | string | null;
  lastJobStatus: string | null;
  lastAcceptedCount: number;
  lastDuplicateCount: number;
  lastRejectedCount: number;
};

type ProviderOption = {
  value: "demo" | "kakao" | "composite";
  label: string;
  description: string;
  enabled: boolean;
  disabledReason?: string;
};

type InitialCollectionPanelProps = {
  projectId: string;
  projectName: string;
  providerName: string;
  providerOptions: ProviderOption[];
  hasCompletedInitial: boolean;
  panelStats: CollectionPanelStats;
  initialJobs: CollectionJobSummary[];
  initialJobDetail?: CollectionJobDetail | null;
};

const DEFAULT_REQUEST_COUNT = 30;

const KEYWORD_CHECK_SAMPLES = [
  "양주 폐차장",
  "양주 대형차 정비",
  "포천 고철",
  "김포 중고차 수출",
  "양주 공장 전문 부동산",
];

type KeywordWarning = {
  query: string;
  lastRunAt: string;
  acceptedCount: number;
  duplicateCount: number;
  jobId: string | null;
};

export function InitialCollectionPanel({
  projectId,
  projectName,
  providerName,
  providerOptions,
  hasCompletedInitial,
  panelStats,
  initialJobs,
  initialJobDetail = null,
}: InitialCollectionPanelProps) {
  const [jobs, setJobs] = useState(initialJobs);
  const [latestJob, setLatestJob] = useState<CollectionJobDetail | null>(
    initialJobDetail,
  );
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [requestedCount, setRequestedCount] = useState(DEFAULT_REQUEST_COUNT);
  const [selectedProvider, setSelectedProvider] = useState<"demo" | "kakao" | "composite">(
    () => {
      const preferred =
        providerOptions.find((o) => o.value === "kakao" && o.enabled) ??
        providerOptions.find((o) => o.enabled);
      return preferred?.value ?? "kakao";
    },
  );
  const [executionMode, setExecutionMode] = useState<"preview" | "register">("preview");
  const [importMode, setImportMode] = useState<"review" | "fast">("review");
  const [keywordWarnings, setKeywordWarnings] = useState<KeywordWarning[]>([]);
  const [forceDuplicateSearch, setForceDuplicateSearch] = useState(false);
  const [confirmRegister, setConfirmRegister] = useState(false);

  const estimatedCount = estimateInitialCollectionCount(requestedCount);

  const loadKeywordWarnings = useCallback(async () => {
    const response = await fetch(withBasePath("/api/collection/search-keywords/check"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ queries: KEYWORD_CHECK_SAMPLES }),
    });
    const data = await response.json();
    if (data.ok) {
      setKeywordWarnings(data.warnings ?? []);
    }
  }, []);

  function openConfirmDialog() {
    setExecutionMode("preview");
    setImportMode("review");
    setConfirmRegister(false);
    setShowConfirm(true);
    void loadKeywordWarnings();
  }

  const fetchJobDetail = useCallback(async (jobId: string) => {
    let attempts = 0;
    while (attempts < 3) {
      try {
        const response = await fetch(
          withBasePath(`/api/collection/jobs/${jobId}`),
          { cache: "no-store" },
        );
        const data = await response.json();
        if (data.ok) {
          setLatestJob(data.job);
          setError(null);
          return;
        }
        throw new Error(data.error ?? "상태 확인 실패");
      } catch {
        attempts += 1;
        if (attempts >= 3) {
          setError("상태 확인 실패. 새로고침을 눌러 다시 시도하세요.");
        }
      }
    }
  }, []);

  const fetchJobs = useCallback(async () => {
    const response = await fetch(
      withBasePath(`/api/projects/${projectId}/collection/jobs`),
    );
    const data = await response.json();
    if (data.ok) {
      setJobs(data.jobs);
      if (data.jobs[0]) {
        await fetchJobDetail(data.jobs[0].id);
      }
    }
  }, [projectId, fetchJobDetail]);

  async function handleRun() {
    setIsRunning(true);
    setError(null);

    try {
      const response = await fetch(
        withBasePath(`/api/projects/${projectId}/collection/initial`),
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            confirmed: hasCompletedInitial ? true : undefined,
            requestedCount,
            provider: selectedProvider,
            dryRun: executionMode === "preview",
            importMode,
            forceDuplicateSearch,
          }),
        },
      );

      const data = await response.json();

      if (!response.ok || !data.ok) {
        throw new Error(data.error ?? "수집 실행에 실패했습니다.");
      }

      if (data.job) {
        setLatestJob(data.job);
      } else if (data.jobId) {
        await fetchJobDetail(data.jobId);
      }
      await fetchJobs();
      setShowConfirm(false);
      setShowHistory(true);
    } catch (runError) {
      setError(
        runError instanceof Error ? runError.message : "수집 실행에 실패했습니다.",
      );
    } finally {
      setIsRunning(false);
    }
  }

  const isActive = jobs.some(
    (job) =>
      job.status === "QUEUED" ||
      job.status === "RUNNING" ||
      job.status === "CANCEL_REQUESTED",
  );

  // 새로고침 후에도 RUNNING/QUEUED 작업이 있으면 진행 패널 복원
  useEffect(() => {
    const active = jobs.find(
      (item) =>
        item.status === "QUEUED" ||
        item.status === "RUNNING" ||
        item.status === "CANCEL_REQUESTED",
    );
    if (!active) return;
    if (latestJob?.id === active.id && isActiveStatus(latestJob.status)) return;

    const timer = setTimeout(() => {
      void fetchJobDetail(active.id);
    }, 0);
    return () => clearTimeout(timer);
  }, [jobs, latestJob, fetchJobDetail]);

  function isActiveStatus(status: string) {
    return (
      status === "QUEUED" ||
      status === "RUNNING" ||
      status === "CANCEL_REQUESTED"
    );
  }

  const lastCollectionLabel = panelStats.lastCollectionAt
    ? formatDateTime(panelStats.lastCollectionAt)
    : "없음";

  return (
    <Card id="target-collection-panel" className="border-border/80 shadow-sm">
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div>
          <CardTitle>타깃 업체 자동수집</CardTitle>
          <p className="mt-1 text-sm text-muted-foreground">
            Provider: {providerName} · robots.txt 준수 · 이메일 자동발송 없음
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowSettings((v) => !v)}>
            <Settings2 data-icon="inline-start" />
            수집 설정 보기
            {showSettings ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
          </Button>
          <Button variant="outline" size="sm" onClick={() => setShowHistory((v) => !v)}>
            <History data-icon="inline-start" />
            수집 이력 보기
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              if (latestJob?.id) {
                void fetchJobDetail(latestJob.id);
              } else {
                void fetchJobs();
              }
            }}
          >
            <RefreshCw data-icon="inline-start" />
            새로고침
          </Button>
          {(isRunning || isActive) && latestJob ? (
            <Button
              variant="outline"
              size="sm"
              render={<Link href={`/collection-jobs/${latestJob.id}`} />}
            >
              상태 보기
            </Button>
          ) : null}
          <Button size="sm" disabled={isRunning || isActive} onClick={openConfirmDialog}>
            {isRunning || isActive ? (
              <Loader2 className="size-4 animate-spin" data-icon="inline-start" />
            ) : (
              <Play data-icon="inline-start" />
            )}
            {isRunning || isActive ? "수집 진행 중" : "초기 타깃 수집"}
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <SummaryItem
            label="검색 대상 업종"
            value={`${DEFAULT_INITIAL_SEGMENTS.length}개`}
          />
          <SummaryItem
            label="검색 대상 지역"
            value={`${INITIAL_TARGET_REGIONS.length}개 권역`}
          />
          <SummaryItem
            label="최대 수집 수"
            value={`${COLLECTION_LIMITS.maxInitialCandidates}곳`}
          />
          <SummaryItem
            label="오늘 신규 등록"
            value={`${panelStats.todayCount}/${COLLECTION_LIMITS.maxNewCompaniesPerDay}곳`}
          />
          <SummaryItem
            label="현재 검토대기"
            value={`${panelStats.pendingReview}/${COLLECTION_LIMITS.maxPendingReview}곳`}
          />
          <SummaryItem label="마지막 수집일" value={lastCollectionLabel} />
          <SummaryItem
            label="마지막 수집 결과"
            value={
              panelStats.lastJobStatus
                ? `신규 ${panelStats.lastAcceptedCount} · 중복 ${panelStats.lastDuplicateCount} · 제외 ${panelStats.lastRejectedCount}`
                : "-"
            }
          />
          <SummaryItem label="요청 기본값" value={`${requestedCount}곳 처리`} />
        </div>

        {showSettings ? (
          <div className="rounded-lg border bg-muted/20 p-4 space-y-4">
            <p className="text-sm font-medium">수집 설정</p>
            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-2">
                <label htmlFor="requestedCount" className="text-sm font-medium">
                  1회 처리 건수
                </label>
                <input
                  id="requestedCount"
                  type="number"
                  min={1}
                  max={COLLECTION_LIMITS.maxInitialCandidates}
                  value={requestedCount}
                  onChange={(event) =>
                    setRequestedCount(
                      Math.min(
                        COLLECTION_LIMITS.maxInitialCandidates,
                        Math.max(1, Number(event.target.value) || DEFAULT_REQUEST_COUNT),
                      ),
                    )
                  }
                  className="flex h-9 w-full rounded-lg border border-input bg-background px-3 text-sm"
                />
                <p className="text-xs text-muted-foreground">
                  예상 후보 ~{estimatedCount}곳 · 업종별 최대 {COLLECTION_LIMITS.maxPerSegment}곳
                </p>
              </div>
            </div>
            <div>
              <p className="mb-2 text-sm font-medium">대상 업종</p>
              <div className="flex flex-wrap gap-2">
                {DEFAULT_INITIAL_SEGMENTS.map((segment) => (
                  <Badge key={segment.segmentName} variant="outline">
                    {segment.segmentName}
                  </Badge>
                ))}
              </div>
            </div>
            <div>
              <p className="mb-2 text-sm font-medium">대상 지역</p>
              <div className="flex flex-wrap gap-2">
                {INITIAL_TARGET_REGIONS.map((region) => (
                  <Badge key={region} variant="secondary">
                    {region}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
        ) : null}

        {showConfirm ? (
          <div className="rounded-lg border border-primary/30 bg-primary/5 p-4">
            <p className="text-sm font-medium">
              {projectName} — 카카오 실제 업체 검색
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              카카오 실제 업체 검색 결과를 기반으로 타깃 후보를 수집합니다.
              검색 결과는 검토대기 상태로 등록되며, 자동 이메일 발송 대상이
              되지 않습니다.
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              신규 등록은 오늘 최대 {COLLECTION_LIMITS.maxNewCompaniesPerDay}개로 제한됩니다.
              이번 요청은 {requestedCount}건을 처리합니다.
              {hasCompletedInitial
                ? " 이미 완료된 초기 수집이 있어 재실행합니다."
                : ""}
            </p>
            <div className="mt-4 space-y-2">
              <p className="text-sm font-medium">실행 방식</p>
              <label className="flex cursor-pointer gap-3 rounded-lg border p-3">
                <input
                  type="radio"
                  name="executionMode"
                  checked={executionMode === "preview"}
                  onChange={() => {
                    setExecutionMode("preview");
                    setConfirmRegister(false);
                  }}
                />
                <span>
                  <span className="font-medium">미리보기만 (권장)</span>
                  <span className="mt-1 block text-xs text-muted-foreground">
                    검색·검증·중복검사만 수행. Company DB 등록 없음.
                  </span>
                </span>
              </label>
              <label className="flex cursor-pointer gap-3 rounded-lg border p-3">
                <input
                  type="radio"
                  name="executionMode"
                  checked={executionMode === "register"}
                  onChange={() => setExecutionMode("register")}
                />
                <span>
                  <span className="font-medium">DB에 등록</span>
                  <span className="mt-1 block text-xs text-muted-foreground">
                    후보 확인 후 등록. 아래에서 확인 체크가 필요합니다.
                  </span>
                </span>
              </label>
            </div>
            {executionMode === "register" ? (
              <label className="mt-3 flex cursor-pointer items-start gap-2 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm dark:bg-amber-950/20">
                <input
                  type="checkbox"
                  className="mt-1"
                  checked={confirmRegister}
                  onChange={(e) => setConfirmRegister(e.target.checked)}
                />
                <span>
                  검색 후보를 DB에 등록합니다. 등록된 업체는 NEW/PENDING
                  상태이며 자동 이메일 발송 대상이 되지 않습니다.
                </span>
              </label>
            ) : null}
            {selectedProvider !== "demo" ? (
              <div className="mt-4 space-y-2">
                <p className="text-sm font-medium">등록 모드</p>
                <label className="flex cursor-pointer gap-3 rounded-lg border p-3">
                  <input
                    type="radio"
                    name="importMode"
                    checked={importMode === "review"}
                    onChange={() => setImportMode("review")}
                  />
                  <span>
                    <span className="font-medium">검토 모드 (기본)</span>
                    <span className="mt-1 block text-xs text-muted-foreground">
                      후보를 검토 목록에 저장 후 관리자 승인.
                    </span>
                  </span>
                </label>
                <label className="flex cursor-pointer gap-3 rounded-lg border p-3">
                  <input
                    type="radio"
                    name="importMode"
                    checked={importMode === "fast"}
                    onChange={() => setImportMode("fast")}
                  />
                  <span>
                    <span className="font-medium">빠른 등록</span>
                    <span className="mt-1 block text-xs text-muted-foreground">
                      ACCEPT만 바로 Company 등록.
                    </span>
                  </span>
                </label>
              </div>
            ) : null}
            {keywordWarnings.length > 0 ? (
              <div className="mt-4 space-y-2 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm dark:bg-amber-950/20">
                <p className="font-medium text-amber-900 dark:text-amber-200">
                  14일 이내 동일 검색어 실행 이력
                </p>
                {keywordWarnings.map((warning) => (
                  <div key={warning.query} className="text-xs text-amber-900/90 dark:text-amber-100">
                    &quot;{warning.query}&quot; — {warning.lastRunAt} 실행 (신규{" "}
                    {warning.acceptedCount} · 중복 {warning.duplicateCount})
                    {warning.jobId ? (
                      <>
                        {" "}
                        <Link
                          href={`/collection-jobs/${warning.jobId}`}
                          className="underline"
                        >
                          작업 상세
                        </Link>
                      </>
                    ) : null}
                  </div>
                ))}
                <label className="mt-2 flex items-center gap-2 text-xs">
                  <input
                    type="checkbox"
                    checked={forceDuplicateSearch}
                    onChange={(e) => setForceDuplicateSearch(e.target.checked)}
                  />
                  관리자 확인: 중복 검색 위험을 이해하고 그래도 실행합니다.
                </label>
              </div>
            ) : null}
            <div className="mt-4 space-y-2">
              <p className="text-sm font-medium">검색 Provider</p>
              {providerOptions.map((option) => (
                <label
                  key={option.value}
                  className={`flex cursor-pointer gap-3 rounded-lg border p-3 ${selectedProvider === option.value ? "border-primary bg-primary/5" : ""} ${!option.enabled ? "opacity-60" : ""}`}
                >
                  <input
                    type="radio"
                    name="provider"
                    value={option.value}
                    checked={selectedProvider === option.value}
                    disabled={!option.enabled}
                    onChange={() => setSelectedProvider(option.value)}
                  />
                  <span>
                    <span className="font-medium">{option.label}</span>
                    <span className="mt-1 block text-xs text-muted-foreground">
                      {option.description}
                    </span>
                    {!option.enabled && option.disabledReason ? (
                      <span className="mt-1 block text-xs text-destructive">
                        {option.disabledReason}
                      </span>
                    ) : null}
                  </span>
                </label>
              ))}
            </div>
            <div className="mt-4 flex gap-2">
              <Button
                size="sm"
                disabled={
                  isRunning ||
                  (keywordWarnings.length > 0 && !forceDuplicateSearch) ||
                  (executionMode === "register" && !confirmRegister)
                }
                onClick={handleRun}
              >
                {isRunning
                  ? "수집 실행 중..."
                  : executionMode === "preview"
                    ? "미리보기 실행"
                    : "수집 실행"}
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={isRunning}
                onClick={() => setShowConfirm(false)}
              >
                취소
              </Button>
            </div>
          </div>
        ) : null}

        {(isRunning || isActive || (latestJob && isActiveStatus(latestJob.status))) &&
        !showConfirm ? (
          <div className="space-y-2">
            <p className="text-sm font-medium">수집 진행상태</p>
            {latestJob ? (
              <CollectionJobProgressPanel
                job={latestJob}
                poll
                onUpdate={(job) => {
                  setLatestJob((prev) =>
                    prev
                      ? {
                          ...prev,
                          ...job,
                          companies: prev.companies,
                          gradeCounts: prev.gradeCounts,
                        }
                      : (job as CollectionJobDetail),
                  );
                  if (
                    job.status === "COMPLETED" ||
                    job.status === "FAILED" ||
                    job.status === "CANCELLED" ||
                    job.status === "DRY_RUN"
                  ) {
                    void fetchJobs();
                  }
                }}
              />
            ) : (
              <p className="rounded-lg border bg-muted/30 p-3 text-sm text-muted-foreground">
                수집 작업이 시작되었습니다. 진행상태를 불러오는 중…
              </p>
            )}
          </div>
        ) : null}

        {error ? (
          <p className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
            {error}
          </p>
        ) : null}

        {latestJob ? (
          <>
            <Separator />
            <div>
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <p className="font-medium">최근 실행 결과</p>
                <Badge variant="secondary">{latestJob.statusLabel}</Badge>
                <Button
                  size="sm"
                  variant="outline"
                  render={<Link href={`/search-candidates?jobId=${latestJob.id}`} />}
                >
                  후보 검토
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  render={<Link href={`/collection-jobs/${latestJob.id}`} />}
                >
                  결과 업체 보기
                </Button>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
                <StatBlock label="요청" value={latestJob.requestedCount} />
                <StatBlock label="처리" value={latestJob.collectedCount} />
                <StatBlock label="신규" value={latestJob.acceptedCount} />
                <StatBlock label="중복" value={latestJob.duplicateCount} />
                <StatBlock label="제외" value={latestJob.rejectedCount} />
                <StatBlock label="A등급" value={latestJob.gradeCounts?.A ?? 0} />
                <StatBlock label="B등급" value={latestJob.gradeCounts?.B ?? 0} />
                <StatBlock label="C등급" value={latestJob.gradeCounts?.C ?? 0} />
              </div>
              {latestJob.errorMessage ? (
                <p className="mt-2 text-sm text-destructive">{latestJob.errorMessage}</p>
              ) : null}
            </div>
          </>
        ) : null}

        {showHistory && jobs.length > 0 ? (
          <div>
            <p className="mb-2 text-sm font-medium">수집 작업 이력</p>
            <ul className="space-y-2 text-sm">
              {jobs.map((job) => (
                <li
                  key={job.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3"
                >
                  <div>
                    <Link
                      href={`/collection-jobs/${job.id}`}
                      className="font-medium text-primary hover:underline"
                    >
                      {job.statusLabel}
                    </Link>
                    <span className="ml-2 text-muted-foreground">{job.createdAt}</span>
                    {job.currentStep ? (
                      <p className="mt-1 text-xs text-muted-foreground">
                        {job.progressPercent ?? 0}% · {job.currentStep}
                        {job.currentQuery ? ` · ${job.currentQuery}` : ""}
                      </p>
                    ) : null}
                  </div>
                  <span className="text-muted-foreground">
                    요청 {job.requestedCount} · 신규 {job.acceptedCount} · 중복{" "}
                    {job.duplicateCount} · 제외 {job.rejectedCount}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        <p className="text-xs text-muted-foreground">
          신규 업체는 NEW 상태로 등록되며 발송 대상이 되지 않습니다.{" "}
          <Link href={`/targets?projectId=${projectId}`} className="text-primary underline">
            타깃 목록에서 확인
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}

function SummaryItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border bg-muted/20 p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 font-semibold">{value}</p>
    </div>
  );
}

function StatBlock({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border p-3 text-center">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-2xl font-bold">{value}</p>
    </div>
  );
}
