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
  providerLabel: string;
};

const DEFAULT_QUERY = "양주 폐차장";

export function KakaoConnectionTestPanel({
  apiKeyPresent,
  providerLabel,
}: KakaoConnectionTestPanelProps) {
  const [query, setQuery] = useState(DEFAULT_QUERY);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<TestResult | null>(null);

  async function runTest() {
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch(withBasePath("/api/collection/providers/kakao/test"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query, segmentName: "폐차장" }),
      });
      const data = await res.json();
      if (data.ok === false) {
        setResult({
          configured: apiKeyPresent,
          success: false,
          query,
          resultCount: 0,
          elapsedMs: 0,
          errorMessage: data.error ?? "테스트 실패",
        });
        return;
      }
      setResult(data as TestResult);
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

  return (
    <div className="space-y-4 rounded-lg border bg-muted/10 p-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <p className="text-muted-foreground">현재 Provider</p>
          <p className="font-medium">{providerLabel}</p>
        </div>
        <div>
          <p className="text-muted-foreground">Kakao API 키</p>
          <p className="font-medium">{apiKeyPresent ? "설정됨" : "미설정"}</p>
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        KAKAO_REST_API_KEY와 TARGET_SEARCH_PROVIDER=kakao를 .env에 설정한 후{" "}
        <strong>개발 서버를 반드시 재시작</strong>해야 합니다. API 키는 화면에
        표시되지 않습니다.
      </p>

      <div className="space-y-2">
        <label htmlFor="kakaoTestQuery" className="text-sm font-medium">
          테스트 검색어
        </label>
        <input
          id="kakaoTestQuery"
          className="flex h-9 w-full rounded-lg border border-input bg-background px-3 text-sm"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      <div>
        <Button size="sm" disabled={loading} onClick={runTest}>
          {loading ? "테스트 중..." : "연결 테스트"}
        </Button>
        <p className="mt-2 text-xs text-muted-foreground">
          API 연결과 검색결과를 확인합니다. 이 테스트는 업체 DB를 변경하지
          않습니다.
        </p>
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
          {result.results && result.results.length > 0 ? (
            <ul className="divide-y">
              {result.results.map((item) => (
                <li key={item.placeName} className="py-2">
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
