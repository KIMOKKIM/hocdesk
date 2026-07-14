"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { withBasePath } from "@/lib/paths";

type TestResult = {
  configured: boolean;
  success: boolean;
  query: string;
  resultCount: number;
  elapsedMs: number;
  errorCode?: string;
  errorMessage?: string;
  message?: string;
  checklist?: string[];
  diagnostics?: {
    keyPresent?: boolean;
    keyMasked?: string | null;
    endpoint?: string;
    environment?: string;
    vercel?: boolean;
    keyWarnings?: string[];
    kakaoErrorType?: string | null;
    kakaoMessage?: string | null;
  };
  results?: Array<{
    placeName: string;
    categoryName: string;
    phone: string | null;
    address: string | null;
    placeUrl: string | null;
    validation: string;
    score: number;
  }>;
};

type KakaoConnectionTestPanelProps = {
  apiKeyPresent: boolean;
  apiKeyMasked?: string | null;
  providerLabel: string;
};

const DEFAULT_QUERY = "양주 폐차장";

export function KakaoConnectionTestPanel({
  apiKeyPresent,
  apiKeyMasked = null,
  providerLabel,
}: KakaoConnectionTestPanelProps) {
  const [query, setQuery] = useState(DEFAULT_QUERY);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<TestResult | null>(null);

  async function runTest() {
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch(
        withBasePath("/api/collection/providers/kakao/test"),
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query, segmentName: "폐차장" }),
        },
      );
      const data = await res.json();
      if (data.ok === false) {
        setResult({
          configured: apiKeyPresent,
          success: false,
          query,
          resultCount: 0,
          elapsedMs: 0,
          errorCode: data.code,
          errorMessage: data.error ?? "테스트 실패",
        });
        return;
      }
      setResult({
        configured: Boolean(data.configured ?? apiKeyPresent),
        success: Boolean(data.success),
        query: data.query ?? query,
        resultCount: data.resultCount ?? 0,
        elapsedMs: data.elapsedMs ?? 0,
        errorCode: data.errorCode,
        errorMessage: data.errorMessage ?? data.message,
        message: data.message,
        checklist: data.checklist,
        diagnostics: data.diagnostics,
        results: data.results,
      });
    } catch {
      setResult({
        configured: apiKeyPresent,
        success: false,
        query,
        resultCount: 0,
        elapsedMs: 0,
        errorMessage: "네트워크 오류",
      });
    } finally {
      setLoading(false);
    }
  }

  const showPermissionHelp =
    result &&
    !result.success &&
    (result.errorCode === "PERMISSION_DENIED" ||
      result.errorCode === "LOCAL_API_NOT_ALLOWED" ||
      result.errorCode === "INVALID_APP_KEY_TYPE" ||
      result.errorCode === "AUTHENTICATION_FAILED" ||
      result.errorCode === "API_KEY_MISSING");

  return (
    <div className="space-y-4 rounded-lg border bg-muted/10 p-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <p className="text-muted-foreground">현재 Provider</p>
          <p className="font-medium">{providerLabel}</p>
        </div>
        <div>
          <p className="text-muted-foreground">Kakao API 키</p>
          <p className="font-medium">
            {apiKeyPresent
              ? `설정됨${apiKeyMasked ? ` (${apiKeyMasked})` : ""}`
              : "미설정"}
          </p>
        </div>
      </div>

      {!apiKeyPresent ? (
        <p className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
          API 키 설정 후 Redeploy가 필요합니다. 변수명은{" "}
          <code className="rounded bg-muted px-1">KAKAO_REST_API_KEY</code>{" "}
          이며 <code className="rounded bg-muted px-1">NEXT_PUBLIC_</code>{" "}
          접두사를 붙이면 안 됩니다.
        </p>
      ) : (
        <p className="text-xs text-muted-foreground">
          연결 테스트는 Kakao Local API를 1회 호출합니다. DB는 변경하지 않으며
          API 키 원문은 표시되지 않습니다.
        </p>
      )}

      <div className="space-y-2">
        <label htmlFor="kakaoTestQuery" className="text-sm font-medium">
          테스트 검색어
        </label>
        <input
          id="kakaoTestQuery"
          className="flex h-9 w-full rounded-lg border border-input bg-background px-3 text-sm disabled:opacity-60"
          value={query}
          disabled={!apiKeyPresent || loading}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      <div>
        <Button
          size="sm"
          disabled={!apiKeyPresent || loading || !query.trim()}
          onClick={() => void runTest()}
        >
          {loading ? "테스트 중..." : "연결 테스트"}
        </Button>
        {!apiKeyPresent ? (
          <p className="mt-2 text-xs text-muted-foreground">
            API 키 설정 후 Redeploy가 필요합니다.
          </p>
        ) : (
          <p className="mt-2 text-xs text-muted-foreground">
            API 연결과 검색결과를 확인합니다. 이 테스트는 업체 DB를 변경하지
            않습니다.
          </p>
        )}
      </div>

      {result ? (
        <div className="space-y-3 rounded-lg border p-3 text-sm">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={result.success ? "default" : "outline"}>
              {result.success ? "성공" : "실패"}
            </Badge>
            {result.errorCode ? (
              <Badge variant="outline">{result.errorCode}</Badge>
            ) : null}
            <span className="text-muted-foreground">
              {result.elapsedMs}ms · 결과 {result.resultCount}건
            </span>
          </div>
          {result.errorMessage ? (
            <p className="text-destructive">{result.errorMessage}</p>
          ) : null}
          {result.success ? (
            <p className="text-muted-foreground">
              {result.message ?? "DB 변경 없음"}
            </p>
          ) : null}
          {result.diagnostics?.kakaoErrorType ? (
            <p className="text-xs text-muted-foreground">
              Kakao errorType: {result.diagnostics.kakaoErrorType}
              {result.diagnostics.kakaoMessage
                ? ` · ${result.diagnostics.kakaoMessage}`
                : ""}
            </p>
          ) : null}

          {showPermissionHelp ? (
            <div className="space-y-2 rounded-lg border border-amber-300 bg-amber-50 p-3 text-amber-950 dark:bg-amber-950/20 dark:text-amber-100">
              <p className="font-medium">Kakao 권한 오류 점검</p>
              <ol className="list-decimal space-y-1 pl-5 text-xs">
                {(result.checklist ?? []).map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ol>
              <pre className="overflow-x-auto rounded border bg-background p-2 font-mono text-[11px] text-foreground">
                {`curl -H "Authorization: KakaoAK <REST_API_KEY>" \\
  "https://dapi.kakao.com/v2/local/search/keyword.json?query=%EC%96%91%EC%A3%BC%20%ED%8F%90%EC%B0%A8%EC%9E%A5"`}
              </pre>
            </div>
          ) : null}

          {result.results && result.results.length > 0 ? (
            <ul className="divide-y">
              {result.results.map((item) => (
                <li key={`${item.placeName}-${item.placeUrl}`} className="py-2">
                  <p className="font-medium">{item.placeName}</p>
                  <p className="text-xs text-muted-foreground">
                    {item.categoryName} · {item.validation} ({item.score}점)
                  </p>
                  <p className="text-xs">{item.phone ?? "전화 없음"}</p>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
