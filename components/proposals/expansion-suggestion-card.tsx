"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { parseJsonArray } from "@/lib/utils/json";
import { withBasePath } from "@/lib/paths";

type ExpansionSuggestionItem = {
  id: string;
  segmentName: string;
  reason: string;
  evidence: unknown;
  recommendationScore: number;
  priority: string;
  status: string;
  proposedRegions: unknown;
  proposedKeywords: unknown;
  proposedTargetCount: number;
  recommendationLabel: string;
  segmentCompanyCount: number;
  recentCollectionAt: string | null;
  latestJob: {
    id: string;
    status: string;
    acceptedCount: number;
    duplicateCount?: number;
    rejectedCount?: number;
    errorMessage?: string | null;
  } | null;
};

export function ExpansionSuggestionCard({
  suggestion,
}: {
  suggestion: ExpansionSuggestionItem;
}) {
  const [keywords, setKeywords] = useState(
    parseJsonArray(suggestion.proposedKeywords).join(", "),
  );
  const [targetCount, setTargetCount] = useState(
    suggestion.proposedTargetCount || 20,
  );
  const [selectedProvider, setSelectedProvider] = useState<"demo" | "kakao" | "composite">("demo");
  const [loading, setLoading] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function callApi(path: string, body?: Record<string, unknown>) {
    const response = await fetch(withBasePath(path), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body ?? {}),
    });
    const data = await response.json();
    if (!response.ok || !data.ok) {
      throw new Error(data.error ?? "요청 실패");
    }
    return data;
  }

  function confirmApprove(withKeywords = false, withTargetCount = false) {
    const keywordList = withKeywords
      ? keywords
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean)
      : parseJsonArray(suggestion.proposedKeywords);

    const count = withTargetCount ? targetCount : suggestion.proposedTargetCount || 20;
    const regions = parseJsonArray(suggestion.proposedRegions);

    const confirmed = window.confirm(
      `${suggestion.segmentName} 업종을 대상으로 추가수집을 실행합니다.\n선택 Provider: ${selectedProvider} · 최대 ${count}개 후보를 검색합니다.`,
    );
    if (!confirmed) return;

    void handleApprove(keywordList, regions, count);
  }

  async function handleApprove(
    keywordList: string[],
    regions: string[],
    count: number,
  ) {
    setLoading("approve");
    setMessage(null);
    try {
      const data = await callApi(
        `/api/expansion-suggestions/${suggestion.id}/approve`,
        {
          keywords: keywordList,
          regions,
          targetCount: count,
          provider: selectedProvider,
        },
      );
      const result = data.result;
      setMessage(
        `승인·수집 완료 · 작업 ${data.jobId} · 신규 ${result?.acceptedCount ?? 0} / 중복 ${result?.duplicateCount ?? 0}`,
      );
      window.location.reload();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "승인 실패");
    } finally {
      setLoading(null);
    }
  }

  async function handleHold() {
    setLoading("hold");
    try {
      await callApi(`/api/expansion-suggestions/${suggestion.id}/approve`, {
        action: "hold",
      });
      window.location.reload();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "보류 실패");
    } finally {
      setLoading(null);
    }
  }

  async function handleReject() {
    setLoading("reject");
    try {
      await callApi(`/api/expansion-suggestions/${suggestion.id}/reject`, {
        reason: "관리자 검토 후 거절",
      });
      window.location.reload();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "거절 실패");
    } finally {
      setLoading(null);
    }
  }

  const evidence = Array.isArray(suggestion.evidence)
    ? (suggestion.evidence as string[])
    : parseJsonArray(suggestion.evidence);
  const regions = parseJsonArray(suggestion.proposedRegions);

  return (
    <Card className="border-border/80 shadow-sm">
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div>
          <CardTitle className="text-base">{suggestion.segmentName}</CardTitle>
          <p className="mt-1 text-sm text-muted-foreground">
            {suggestion.recommendationLabel}
          </p>
        </div>
        <div className="flex gap-2">
          <Badge>{suggestion.recommendationScore}점</Badge>
          <Badge variant="outline">{suggestion.status}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        <div className="grid gap-2 sm:grid-cols-2 text-muted-foreground">
          <p>현재 DB 업체: {suggestion.segmentCompanyCount}곳</p>
          <p>
            최근 동일 업종 수집: {suggestion.recentCollectionAt ?? "없음"}
          </p>
          <p>추천 수집 수: {suggestion.proposedTargetCount}개</p>
          <p>우선순위: {suggestion.priority}</p>
        </div>

        <p className="leading-6">{suggestion.reason}</p>
        {evidence.length > 0 ? (
          <ul className="list-disc space-y-1 pl-5 text-muted-foreground">
            {evidence.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        ) : null}

        {regions.length > 0 ? (
          <p className="text-muted-foreground">
            검색 지역: {regions.join(", ")}
          </p>
        ) : null}

        {suggestion.status === "PENDING" ? (
          <>
            <div className="space-y-2">
              <label className="text-sm font-medium">검색 Provider</label>
              <select
                value={selectedProvider}
                onChange={(event) =>
                  setSelectedProvider(
                    event.target.value as "demo" | "kakao" | "composite",
                  )
                }
                className="flex h-9 w-full rounded-lg border border-input bg-background px-3 text-sm"
              >
                <option value="demo">데모 검색</option>
                <option value="kakao">카카오 실제 업체 검색</option>
                <option value="composite">복합 검색</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">키워드 (쉼표 구분)</label>
              <input
                value={keywords}
                onChange={(event) => setKeywords(event.target.value)}
                className="flex h-9 w-full rounded-lg border border-input bg-background px-3 text-sm"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">수집 수</label>
              <input
                type="number"
                min={1}
                max={20}
                value={targetCount}
                onChange={(event) =>
                  setTargetCount(Number(event.target.value) || 20)
                }
                className="flex h-9 w-full rounded-lg border border-input bg-background px-3 text-sm"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                disabled={Boolean(loading)}
                onClick={() => confirmApprove(false, false)}
              >
                추가수집 승인
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={Boolean(loading)}
                onClick={() => confirmApprove(true, false)}
              >
                키워드 수정 후 승인
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={Boolean(loading)}
                onClick={() => confirmApprove(true, true)}
              >
                수집 수 수정 후 승인
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={Boolean(loading)}
                onClick={handleHold}
              >
                보류
              </Button>
              <Button
                size="sm"
                variant="destructive"
                disabled={Boolean(loading)}
                onClick={handleReject}
              >
                거절
              </Button>
            </div>
          </>
        ) : null}

        {suggestion.latestJob?.status === "COMPLETED" ? (
          <p className="text-muted-foreground">
            수집 완료 · 신규 {suggestion.latestJob.acceptedCount}건 · 중복{" "}
            {suggestion.latestJob.duplicateCount ?? 0}건
          </p>
        ) : null}

        {suggestion.latestJob?.status === "FAILED" ? (
          <p className="text-destructive">
            수집 실패: {suggestion.latestJob.errorMessage ?? "알 수 없는 오류"}
          </p>
        ) : null}

        {message ? <p className="text-primary">{message}</p> : null}
      </CardContent>
    </Card>
  );
}
