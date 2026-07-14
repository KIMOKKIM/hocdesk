"use client";

import { useCallback, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  COLLECTION_LIMITS,
  DEFAULT_INITIAL_SEGMENTS,
  INITIAL_TARGET_REGIONS,
} from "@/lib/constants/collection";
import { formatDateTime } from "@/lib/format";
import { withBasePath } from "@/lib/paths";
import {
  ChevronDown,
  ChevronUp,
  History,
  Loader2,
  Pause,
  Play,
  RefreshCw,
  Settings2,
} from "lucide-react";

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

type StepProgress = {
  jobId: string;
  status: string;
  currentQuery: string | null;
  processedQueries: number;
  totalQueries: number;
  remainingQueries: number;
  rawResultCount: number;
  candidatesCreated: number;
  acceptedCount: number;
  reviewRequiredCount: number;
  rejectedCount: number;
  duplicateCount: number;
  apiCallCount: number;
  lastMessage: string | null;
  done: boolean;
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

function isActiveStatus(status: string) {
  return (
    status === "QUEUED" ||
    status === "RUNNING" ||
    status === "PAUSED" ||
    status === "CANCEL_REQUESTED"
  );
}

function isTerminal(status: string) {
  return (
    status === "COMPLETED" ||
    status === "FAILED" ||
    status === "CANCELLED" ||
    status === "DRY_RUN"
  );
}

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
  const router = useRouter();
  const [jobs, setJobs] = useState(initialJobs);
  const [latestJob, setLatestJob] = useState<CollectionJobDetail | null>(
    initialJobDetail,
  );
  const [step, setStep] = useState<StepProgress | null>(null);
  const [orchestrating, setOrchestrating] = useState(false);
  const [paused, setPaused] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [completionNotice, setCompletionNotice] = useState<string | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [requestedCount, setRequestedCount] = useState(DEFAULT_REQUEST_COUNT);
  const [selectedProvider, setSelectedProvider] = useState<"kakao" | "composite">(
    () => {
      const preferred = providerOptions.find(
        (o) => o.value === "kakao" && o.enabled,
      );
      return preferred?.value === "composite" ? "composite" : "kakao";
    },
  );
  const [forceDuplicateSearch, setForceDuplicateSearch] = useState(false);
  const abortRef = useRef(false);
  const loopRef = useRef(false);

  // 페이지 로드 시 활성 job에서 진행 패널 초기값 유도 (effect setState 회피)
  const restoredStep: StepProgress | null = (() => {
    if (step) return null;
    const active = jobs.find((item) => isActiveStatus(item.status));
    if (!active) return null;
    if (active.status !== "PAUSED" && active.status !== "QUEUED") return null;
    return {
      jobId: active.id,
      status: active.status,
      currentQuery: active.currentQuery ?? null,
      processedQueries: active.processedQueries ?? 0,
      totalQueries: active.totalQueries ?? 0,
      remainingQueries: Math.max(
        0,
        (active.totalQueries ?? 0) - (active.processedQueries ?? 0),
      ),
      rawResultCount: active.rawResultCount ?? 0,
      candidatesCreated: active.acceptedCount,
      acceptedCount: active.acceptedCount,
      reviewRequiredCount: active.reviewRequiredCount ?? 0,
      rejectedCount: active.rejectedCount,
      duplicateCount: active.duplicateCount,
      apiCallCount: active.apiCallCount ?? 0,
      lastMessage: active.lastMessage ?? null,
      done: false,
    };
  })();

  const fetchJobDetail = useCallback(async (jobId: string) => {
    try {
      const response = await fetch(
        withBasePath(`/api/collection/jobs/${jobId}`),
        { cache: "no-store" },
      );
      const data = await response.json();
      if (data.ok) {
        setLatestJob(data.job);
        setError(null);
      }
    } catch {
      setError("상태 확인 실패. 새로고침을 눌러 다시 시도하세요.");
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

  const runNextLoop = useCallback(
    async (jobId: string) => {
      if (loopRef.current) return;
      loopRef.current = true;
      abortRef.current = false;
      setOrchestrating(true);
      setPaused(false);
      setError(null);

      try {
        while (!abortRef.current) {
          const response = await fetch(
            withBasePath(`/api/collection/jobs/${jobId}/run-next`),
            { method: "POST" },
          );
          const data = await response.json();
          if (!response.ok || !data.ok) {
            throw new Error(data.error ?? "검색어 처리에 실패했습니다.");
          }

          const progress = data as StepProgress & { ok?: boolean };
          setStep({
            jobId: progress.jobId,
            status: progress.status,
            currentQuery: progress.currentQuery,
            processedQueries: progress.processedQueries,
            totalQueries: progress.totalQueries,
            remainingQueries: progress.remainingQueries,
            rawResultCount: progress.rawResultCount,
            candidatesCreated: progress.candidatesCreated,
            acceptedCount: progress.acceptedCount,
            reviewRequiredCount: progress.reviewRequiredCount,
            rejectedCount: progress.rejectedCount,
            duplicateCount: progress.duplicateCount,
            apiCallCount: progress.apiCallCount,
            lastMessage: progress.lastMessage,
            done: progress.done,
          });

          if (progress.done || isTerminal(progress.status)) {
            setCompletionNotice(
              progress.lastMessage ??
                `검색 후보 ${progress.candidatesCreated}건이 생성되었습니다. 검색 후보 화면에서 승인하면 타깃 업체에 등록됩니다.`,
            );
            await fetchJobs();
            router.refresh();
            break;
          }

          // 짧은 간격으로 다음 검색어 (브라우저 부하·Kakao rate 고려)
          await new Promise((r) => setTimeout(r, 300));
        }
      } catch (runError) {
        setError(
          runError instanceof Error
            ? runError.message
            : "검색어 처리에 실패했습니다.",
        );
      } finally {
        loopRef.current = false;
        setOrchestrating(false);
        if (abortRef.current) {
          setPaused(true);
        }
      }
    },
    [fetchJobs, router],
  );

  async function handlePrepareAndStart() {
    setError(null);
    setCompletionNotice(null);
    setShowConfirm(false);

    try {
      const response = await fetch(
        withBasePath(`/api/projects/${projectId}/collection/prepare`),
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            provider: selectedProvider,
            mode: "preview",
            requestedCount,
            confirmed: hasCompletedInitial || forceDuplicateSearch,
            force: forceDuplicateSearch,
          }),
        },
      );
      const data = await response.json();
      if (!response.ok || !data.ok) {
        throw new Error(data.error ?? "검색 계획 생성에 실패했습니다.");
      }

      setStep({
        jobId: data.jobId,
        status: data.status,
        currentQuery: null,
        processedQueries: 0,
        totalQueries: data.totalQueries,
        remainingQueries: data.totalQueries,
        rawResultCount: 0,
        candidatesCreated: 0,
        acceptedCount: 0,
        reviewRequiredCount: 0,
        rejectedCount: 0,
        duplicateCount: 0,
        apiCallCount: 0,
        lastMessage: data.message ?? null,
        done: false,
      });

      if (data.job) setLatestJob(data.job);
      setShowHistory(true);
      void runNextLoop(data.jobId);
    } catch (prepareError) {
      setError(
        prepareError instanceof Error
          ? prepareError.message
          : "검색 시작에 실패했습니다.",
      );
    }
  }

  async function handlePause() {
    abortRef.current = true;
    const jobId = step?.jobId ?? latestJob?.id;
    if (!jobId) return;
    await fetch(withBasePath(`/api/collection/jobs/${jobId}/pause`), {
      method: "POST",
    });
    setPaused(true);
    setOrchestrating(false);
    await fetchJobDetail(jobId);
  }

  function handleResume() {
    const jobId = step?.jobId ?? latestJob?.id;
    if (!jobId) return;
    void runNextLoop(jobId);
  }

  // 페이지 로드 시 PAUSED/QUEUED 복원은 restoredStep으로 처리

  const display = step ?? restoredStep;
  const percent = display
    ? display.totalQueries > 0
      ? Math.round(
          (display.processedQueries / display.totalQueries) * 100,
        )
      : display.done
        ? 100
        : 0
    : latestJob?.progressPercent ?? 0;

  const lastCollectionLabel = panelStats.lastCollectionAt
    ? formatDateTime(panelStats.lastCollectionAt)
    : "없음";

  const kakaoEnabled = providerOptions.some(
    (o) => o.value === "kakao" && o.enabled,
  );

  return (
    <Card id="target-collection-panel" className="border-border/80 shadow-sm">
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div>
          <CardTitle>카카오 후보 검색</CardTitle>
          <p className="mt-1 text-sm text-muted-foreground">
            Provider: {providerName} · 검색어 단위 실행 · 후보 승인 후 타깃 등록 ·
            이메일 자동발송 없음
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowSettings((v) => !v)}
          >
            <Settings2 data-icon="inline-start" />
            검색 설정
            {showSettings ? (
              <ChevronUp className="size-4" />
            ) : (
              <ChevronDown className="size-4" />
            )}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowHistory((v) => !v)}
          >
            <History data-icon="inline-start" />
            수집 이력
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              if (latestJob?.id) void fetchJobDetail(latestJob.id);
              else void fetchJobs();
            }}
          >
            <RefreshCw data-icon="inline-start" />
            상태 새로고침
          </Button>
          {!orchestrating && !showConfirm ? (
            <Button
              size="sm"
              disabled={!kakaoEnabled}
              onClick={() => setShowConfirm(true)}
            >
              <Play data-icon="inline-start" />
              카카오 후보 검색 시작
            </Button>
          ) : null}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Stat label="오늘 신규(타깃)" value={`${panelStats.todayCount}곳`} />
          <Stat
            label="검토 대기(타깃)"
            value={`${panelStats.pendingReview}곳`}
          />
          <Stat label="최근 수집" value={lastCollectionLabel} />
          <Stat
            label="최근 결과"
            value={
              panelStats.lastJobStatus
                ? `신규 ${panelStats.lastAcceptedCount} · 중복 ${panelStats.lastDuplicateCount}`
                : "없음"
            }
          />
        </div>

        <p className="rounded-lg border border-dashed p-3 text-xs text-muted-foreground">
          검색 결과는 먼저 검색 후보에 저장됩니다. 타깃 업체 목록에는 후보를
          승인한 뒤에만 표시됩니다. (Vercel 제한을 피하기 위해 검색어를 한 번에
          1개씩 처리합니다)
        </p>

        {showSettings ? (
          <div className="space-y-4 rounded-lg border bg-muted/20 p-4">
            <div>
              <label className="mb-1 block text-sm font-medium">
                요청 처리 한도
              </label>
              <input
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
                className="flex h-9 w-full max-w-xs rounded-lg border border-input bg-background px-3 text-sm"
              />
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
            <div>
              <p className="mb-2 text-sm font-medium">Provider</p>
              {providerOptions
                .filter((o) => o.value !== "demo")
                .map((option) => (
                  <label
                    key={option.value}
                    className="mb-2 flex cursor-pointer gap-3 rounded-lg border p-3"
                  >
                    <input
                      type="radio"
                      name="provider"
                      disabled={!option.enabled}
                      checked={selectedProvider === option.value}
                      onChange={() =>
                        setSelectedProvider(
                          option.value === "composite" ? "composite" : "kakao",
                        )
                      }
                    />
                    <span>
                      <span className="font-medium">{option.label}</span>
                      <span className="mt-1 block text-xs text-muted-foreground">
                        {option.enabled
                          ? option.description
                          : option.disabledReason}
                      </span>
                    </span>
                  </label>
                ))}
            </div>
          </div>
        ) : null}

        {showConfirm ? (
          <div className="rounded-lg border border-primary/30 bg-primary/5 p-4">
            <p className="text-sm font-medium">
              {projectName} — 카카오 후보 검색
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              검색어를 순차 실행하고 결과를 검색 후보에만 저장합니다. 타깃
              업체에는 바로 등록되지 않습니다.
            </p>
            {hasCompletedInitial ? (
              <label className="mt-3 flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={forceDuplicateSearch}
                  onChange={(e) => setForceDuplicateSearch(e.target.checked)}
                />
                이전 수집이 있어도 재검색합니다
              </label>
            ) : null}
            <div className="mt-4 flex gap-2">
              <Button size="sm" onClick={() => void handlePrepareAndStart()}>
                검색 시작
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowConfirm(false)}
              >
                취소
              </Button>
            </div>
          </div>
        ) : null}

        {display ? (
          <div className="space-y-3 rounded-lg border bg-muted/20 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-sm font-medium">
                  상태:{" "}
                  {orchestrating
                    ? "검색 중"
                    : paused
                      ? "일시정지"
                      : display.done
                        ? "완료"
                        : display.status}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {display.lastMessage ?? "검색어 단위로 진행합니다."}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {orchestrating ? (
                  <Button size="sm" variant="outline" onClick={() => void handlePause()}>
                    <Pause data-icon="inline-start" />
                    일시정지
                  </Button>
                ) : null}
                {(paused || display.status === "PAUSED" || display.status === "QUEUED") &&
                !orchestrating &&
                !display.done ? (
                  <Button size="sm" onClick={handleResume}>
                    <Play data-icon="inline-start" />
                    계속 실행
                  </Button>
                ) : null}
                <Button
                  size="sm"
                  variant="outline"
                  render={
                    <Link href={`/search-candidates?jobId=${display.jobId}`} />
                  }
                >
                  검색 후보 보기
                </Button>
              </div>
            </div>

            <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary transition-all duration-300"
                style={{ width: `${Math.min(100, Math.max(0, percent))}%` }}
              />
            </div>

            <div className="grid gap-2 text-sm sm:grid-cols-2 xl:grid-cols-4">
              <Stat label="현재 검색어" value={display.currentQuery ?? "-"} />
              <Stat
                label="검색어 처리"
                value={`${display.processedQueries} / ${display.totalQueries}`}
              />
              <Stat
                label="남은 검색어"
                value={`${display.remainingQueries}`}
              />
              <Stat label="API 호출" value={`${display.apiCallCount}회`} />
              <Stat label="원본 결과" value={`${display.rawResultCount}건`} />
              <Stat
                label="후보 저장"
                value={`${display.candidatesCreated}건`}
              />
              <Stat
                label="검토 필요"
                value={`${display.reviewRequiredCount}`}
              />
              <Stat label="제외" value={`${display.rejectedCount}`} />
              <Stat label="중복" value={`${display.duplicateCount}`} />
            </div>

            {orchestrating ? (
              <p className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="size-4 animate-spin" />
                검색어를 순차 처리 중…
              </p>
            ) : null}
          </div>
        ) : null}

        {completionNotice ? (
          <p className="rounded-lg border border-sky-300 bg-sky-50 p-3 text-sm text-sky-950 dark:bg-sky-950/20 dark:text-sky-100">
            {completionNotice}
          </p>
        ) : null}

        {error ? (
          <p className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
            {error}
          </p>
        ) : null}

        {showHistory && jobs.length > 0 ? (
          <>
            <Separator />
            <div>
              <p className="mb-2 font-medium">수집 이력</p>
              <ul className="divide-y rounded-lg border">
                {jobs.slice(0, 8).map((job) => (
                  <li
                    key={job.id}
                    className="flex items-center justify-between gap-3 p-3 text-sm"
                  >
                    <div>
                      <Link
                        href={`/collection-jobs/${job.id}`}
                        className="font-medium text-primary hover:underline"
                      >
                        {job.statusLabel} · 후보 {job.acceptedCount}
                      </Link>
                      <p className="text-xs text-muted-foreground">
                        {job.createdAt}
                        {job.currentQuery ? ` · ${job.currentQuery}` : ""}
                      </p>
                    </div>
                    <Badge variant="outline">{job.status}</Badge>
                  </li>
                ))}
              </ul>
            </div>
          </>
        ) : null}
      </CardContent>
    </Card>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border bg-background/60 p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 font-medium break-all">{value}</p>
    </div>
  );
}
