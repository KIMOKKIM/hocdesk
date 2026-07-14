"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  formatElapsed,
  stalledProgressWarning,
} from "@/lib/collection/progress-shared";
import { CollectionJobStatus } from "@/lib/constants/status";
import { withBasePath } from "@/lib/paths";

export type CollectionJobProgress = {
  id: string;
  status: string;
  statusLabel?: string;
  currentStep?: string | null;
  currentQuery?: string | null;
  progressPercent?: number | null;
  processedQueries?: number;
  totalQueries?: number;
  apiCallCount?: number;
  rawResultCount?: number;
  collectedCount?: number;
  acceptedCount?: number;
  duplicateCount?: number;
  rejectedCount?: number;
  reviewRequiredCount?: number;
  lastProgressAt?: string | null;
  lastProgressAtLabel?: string | null;
  lastMessage?: string | null;
  startedAt?: string | null;
  startedAtIso?: string | null;
  completedAt?: string | null;
  errorMessage?: string | null;
  projectId?: string;
};

const TERMINAL_STATUSES = new Set<string>([
  CollectionJobStatus.COMPLETED,
  CollectionJobStatus.FAILED,
  CollectionJobStatus.CANCELLED,
  CollectionJobStatus.DRY_RUN,
]);

type CollectionJobProgressPanelProps = {
  job: CollectionJobProgress;
  poll?: boolean;
  onUpdate?: (job: CollectionJobProgress) => void;
  showActions?: boolean;
};

export function CollectionJobProgressPanel({
  job,
  poll = true,
  onUpdate,
  showActions = true,
}: CollectionJobProgressPanelProps) {
  const [polled, setPolled] = useState<CollectionJobProgress | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [cancelPending, setCancelPending] = useState(false);
  const onUpdateRef = useRef(onUpdate);

  useEffect(() => {
    onUpdateRef.current = onUpdate;
  }, [onUpdate]);

  const displayJob =
    polled && polled.id === job.id ? polled : job;

  const fetchProgress = useCallback(async () => {
    const response = await fetch(
      withBasePath(`/api/collection/jobs/${job.id}`),
    );
    const data = await response.json();
    if (data.ok && data.job) {
      setPolled(data.job);
      onUpdateRef.current?.(data.job);
    }
  }, [job.id]);

  useEffect(() => {
    if (!poll) return;
    if (TERMINAL_STATUSES.has(displayJob.status)) {
      return;
    }

    const interval = setInterval(() => {
      void fetchProgress();
      setNow(Date.now());
    }, 2000);

    return () => clearInterval(interval);
  }, [poll, displayJob.status, fetchProgress]);

  const percent =
    displayJob.progressPercent ??
    (TERMINAL_STATUSES.has(displayJob.status) ? 100 : 0);
  const stallWarning = stalledProgressWarning(
    displayJob.lastProgressAt,
    displayJob.status,
  );
  const isRunning =
    displayJob.status === CollectionJobStatus.RUNNING ||
    displayJob.status === CollectionJobStatus.QUEUED ||
    displayJob.status === CollectionJobStatus.CANCEL_REQUESTED;

  async function handleCancel() {
    setCancelPending(true);
    try {
      await fetch(withBasePath(`/api/collection/jobs/${displayJob.id}/cancel`), {
        method: "POST",
      });
      await fetchProgress();
    } finally {
      setCancelPending(false);
    }
  }

  async function handleRetry() {
    await fetch(withBasePath(`/api/collection/jobs/${displayJob.id}/run`), {
      method: "POST",
    });
    await fetchProgress();
  }

  return (
    <div className="space-y-4 rounded-lg border bg-muted/20 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-sm font-medium">
            진행률: {percent}% · {displayJob.statusLabel ?? displayJob.status}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            현재 단계: {displayJob.currentStep ?? "-"}
          </p>
        </div>
        {isRunning ? (
          <Button
            size="sm"
            variant="outline"
            disabled={
              cancelPending ||
              displayJob.status === CollectionJobStatus.CANCEL_REQUESTED
            }
            onClick={() => void handleCancel()}
          >
            {displayJob.status === CollectionJobStatus.CANCEL_REQUESTED
              ? "취소 처리 중..."
              : "취소 요청"}
          </Button>
        ) : null}
      </div>

      <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-primary transition-all duration-500"
          style={{ width: `${Math.min(100, Math.max(0, percent))}%` }}
        />
      </div>

      <div className="grid gap-2 text-sm sm:grid-cols-2 xl:grid-cols-4">
        <ProgressStat label="현재 검색어" value={displayJob.currentQuery ?? "-"} />
        <ProgressStat
          label="검색어 처리"
          value={`${displayJob.processedQueries ?? 0} / ${displayJob.totalQueries ?? 0}`}
        />
        <ProgressStat
          label="API 호출"
          value={`${displayJob.apiCallCount ?? 0}회`}
        />
        <ProgressStat
          label="원본 결과"
          value={`${displayJob.rawResultCount ?? 0}건`}
        />
        <ProgressStat label="신규" value={`${displayJob.acceptedCount ?? 0}`} />
        <ProgressStat label="중복" value={`${displayJob.duplicateCount ?? 0}`} />
        <ProgressStat label="제외" value={`${displayJob.rejectedCount ?? 0}`} />
        <ProgressStat
          label="검토 필요"
          value={`${displayJob.reviewRequiredCount ?? 0}`}
        />
        <ProgressStat
          label="마지막 업데이트"
          value={
            displayJob.lastProgressAtLabel ??
            (displayJob.lastProgressAt
              ? new Date(displayJob.lastProgressAt).toLocaleTimeString("ko-KR")
              : "-")
          }
        />
        <ProgressStat
          label="경과 시간"
          value={formatElapsed(displayJob.startedAtIso ?? displayJob.startedAt)}
        />
      </div>

      {displayJob.lastMessage ? (
        <p className="text-sm text-muted-foreground">{displayJob.lastMessage}</p>
      ) : null}

      {stallWarning ? (
        <p className="rounded-md border border-amber-300 bg-amber-50 p-2 text-sm text-amber-900 dark:bg-amber-950/20 dark:text-amber-100">
          {stallWarning}
        </p>
      ) : null}

      {displayJob.status === CollectionJobStatus.FAILED ? (
        <div className="space-y-2 rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm">
          <p className="font-medium text-destructive">
            실패 단계: {displayJob.currentStep ?? "실패"}
          </p>
          <p>{displayJob.errorMessage ?? "알 수 없는 오류"}</p>
          <p className="text-muted-foreground">
            Vercel Logs에서 상세 오류를 확인하세요.
          </p>
          {showActions ? (
            <Button size="sm" variant="outline" onClick={() => void handleRetry()}>
              재시도
            </Button>
          ) : null}
        </div>
      ) : null}

      {showActions &&
      (displayJob.status === CollectionJobStatus.COMPLETED ||
        displayJob.status === CollectionJobStatus.DRY_RUN) ? (
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" render={<Link href="/targets" />}>
            타깃 업체 보기
          </Button>
          <Button
            size="sm"
            variant="outline"
            render={<Link href={`/search-candidates?jobId=${displayJob.id}`} />}
          >
            검색 후보 보기
          </Button>
          <Button
            size="sm"
            variant="outline"
            render={<Link href={`/collection-jobs/${displayJob.id}`} />}
          >
            수집 작업 상세 보기
          </Button>
        </div>
      ) : null}

      <span className="hidden">{now}</span>
    </div>
  );
}

function ProgressStat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="font-medium">{value}</p>
    </div>
  );
}
