"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { KakaoConnectionTestPanel } from "@/components/settings/kakao-connection-test-panel";
import type { SenderProfile } from "@/lib/db/settings";
import { withBasePath } from "@/lib/paths";

type SuppressionEntry = {
  id: string;
  email: string;
  companyName: string | null;
  reason: string | null;
};

type SettingsFormProps = {
  initialProfile: SenderProfile;
  initialSuppression: SuppressionEntry[];
  searchProviderStatus: {
    provider: string;
    providerLabel: string;
    providerName?: string;
    configured?: boolean;
    apiKeyPresent: boolean;
    apiKeyMasked?: string | null;
    targetSearchProvider?: string;
    message?: string;
    statusKind?: string;
    misconfiguredHints?: string[];
    environment?: string;
    vercel?: boolean;
    lastSuccessAt: string | null;
    lastErrorAt: string | null;
    lastErrorMessage: string | null;
    limits: {
      dailyNewCompanies: number;
      maxPendingReview: number;
      maxQueriesPerJob: number;
      maxRawResultsPerJob: number;
      repeatSearchWaitDays: number;
    };
  };
};

const inputClassName =
  "flex h-9 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

export function SettingsForm({
  initialProfile,
  initialSuppression,
  searchProviderStatus,
}: SettingsFormProps) {
  const [profile, setProfile] = useState(initialProfile);
  const [suppression, setSuppression] = useState(initialSuppression);
  const [newEmail, setNewEmail] = useState("");
  const [newReason, setNewReason] = useState("수신거부 요청");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const provider = searchProviderStatus.provider;
  const apiKeyPresent = searchProviderStatus.apiKeyPresent;
  const statusKind =
    searchProviderStatus.statusKind ??
    (provider === "demo"
      ? "demo"
      : provider === "kakao" || provider === "composite"
        ? apiKeyPresent
          ? "kakao_ready"
          : "kakao_missing_key"
        : "unsupported");

  async function saveProfile() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(withBasePath("/api/settings"), {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(profile),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error ?? "저장 실패");
      setMessage("발신자 프로필이 저장되었습니다.");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "저장 실패");
    } finally {
      setLoading(false);
    }
  }

  async function addSuppression() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(withBasePath("/api/settings"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: newEmail, reason: newReason }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error ?? "등록 실패");
      setSuppression((prev) => [data.entry, ...prev]);
      setNewEmail("");
      setMessage("수신거부 목록에 추가되었습니다.");
    } catch (addError) {
      setError(addError instanceof Error ? addError.message : "등록 실패");
    } finally {
      setLoading(false);
    }
  }

  async function removeSuppression(id: string) {
    const res = await fetch(withBasePath(`/api/settings?id=${id}`), {
      method: "DELETE",
    });
    const data = await res.json();
    if (!data.ok) {
      setError(data.error ?? "삭제 실패");
      return;
    }
    setSuppression((prev) => prev.filter((item) => item.id !== id));
  }

  function updateField<K extends keyof SenderProfile>(
    key: K,
    value: SenderProfile[K],
  ) {
    setProfile((prev) => ({ ...prev, [key]: value }));
  }

  return (
    <div className="space-y-6">
      <Card className="border-border/80 shadow-sm">
        <CardHeader>
          <CardTitle>외부 검색 설정</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <p className="text-muted-foreground">현재 Provider</p>
              <p className="font-medium">
                {searchProviderStatus.providerName ??
                  searchProviderStatus.providerLabel}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Kakao API 키 설정 여부</p>
              <p className="font-medium">
                {apiKeyPresent ? "설정됨" : "미설정"}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">API 키 마스킹</p>
              <p className="font-medium font-mono">
                {searchProviderStatus.apiKeyMasked ?? "-"}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">TARGET_SEARCH_PROVIDER</p>
              <p className="font-medium font-mono">
                {searchProviderStatus.targetSearchProvider ?? provider}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">마지막 성공 검색</p>
              <p className="font-medium">
                {searchProviderStatus.lastSuccessAt ?? "-"}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">마지막 오류</p>
              <p className="font-medium">
                {searchProviderStatus.lastErrorMessage ??
                  searchProviderStatus.lastErrorAt ??
                  "-"}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">환경</p>
              <p className="font-medium">
                {searchProviderStatus.environment ?? "-"}
                {searchProviderStatus.vercel ? " · Vercel" : ""}
              </p>
            </div>
          </div>

          {statusKind === "demo" ? (
            <p className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-amber-900 dark:bg-amber-950/20 dark:text-amber-100">
              현재 데모 검색 Provider입니다. 운영에서는 kakao를 권장합니다.
            </p>
          ) : null}

          {statusKind === "kakao_missing_key" ? (
            <div className="space-y-2 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-destructive">
              <p>
                KAKAO_REST_API_KEY가 설정되지 않았습니다. Vercel Production
                환경변수에 추가 후 Redeploy하세요.
              </p>
              <p className="text-xs text-muted-foreground">
                {searchProviderStatus.message}
              </p>
            </div>
          ) : null}

          {statusKind === "kakao_ready" ? (
            <p className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-3 text-emerald-800 dark:text-emerald-200">
              Kakao API 키가 설정되어 있습니다. 연결 테스트를 실행할 수
              있습니다.
            </p>
          ) : null}

          {statusKind === "unsupported" ? (
            <p className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-destructive">
              지원하지 않는 TARGET_SEARCH_PROVIDER 값입니다.
            </p>
          ) : null}

          {searchProviderStatus.misconfiguredHints &&
          searchProviderStatus.misconfiguredHints.length > 0 ? (
            <ul className="list-disc space-y-1 rounded-lg border border-amber-300 bg-amber-50 p-3 pl-5 text-amber-900 dark:bg-amber-950/20 dark:text-amber-100">
              {searchProviderStatus.misconfiguredHints.map((hint) => (
                <li key={hint}>{hint}</li>
              ))}
            </ul>
          ) : null}

          <div className="rounded-lg border bg-muted/20 p-3 text-xs text-muted-foreground space-y-2">
            <p className="font-medium text-foreground">Vercel 환경변수 설정</p>
            <p>
              Vercel Dashboard → hocdesk 프로젝트 → Settings → Environment
              Variables
            </p>
            <pre className="overflow-x-auto rounded border bg-background p-2 font-mono">
              {`TARGET_SEARCH_PROVIDER=kakao
KAKAO_REST_API_KEY=<카카오 REST API 키>`}
            </pre>
            <ul className="list-disc space-y-1 pl-4">
              <li>Production 환경에 추가해야 합니다.</li>
              <li>Preview에만 추가하면 운영 사이트에서 인식되지 않습니다.</li>
              <li>저장 후 반드시 Redeploy해야 합니다.</li>
              <li>변수명은 KAKAO_REST_API_KEY입니다.</li>
              <li>NEXT_PUBLIC_ 접두사를 붙이면 안 됩니다.</li>
            </ul>
          </div>

          <p className="text-muted-foreground">
            일일 신규 {searchProviderStatus.limits.dailyNewCompanies}건 ·
            검토대기 한도 {searchProviderStatus.limits.maxPendingReview}건 ·
            작업당 검색어 {searchProviderStatus.limits.maxQueriesPerJob}개
          </p>
          <KakaoConnectionTestPanel
            apiKeyPresent={apiKeyPresent}
            apiKeyMasked={searchProviderStatus.apiKeyMasked}
            providerLabel={
              searchProviderStatus.providerName ??
              searchProviderStatus.providerLabel
            }
          />
        </CardContent>
      </Card>

      <Card className="border-border/80 shadow-sm">
        <CardHeader>
          <CardTitle>발신자 프로필</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 xl:grid-cols-2">
          {(
            [
              ["senderName", "발신자명"],
              ["companyName", "회사명"],
              ["jobTitle", "직책"],
              ["phone", "전화번호"],
              ["email", "이메일"],
            ] as const
          ).map(([key, label]) => (
            <div key={key} className="space-y-2">
              <label className="text-sm font-medium">{label}</label>
              <input
                className={inputClassName}
                value={profile[key]}
                onChange={(e) => updateField(key, e.target.value)}
              />
            </div>
          ))}
          <div className="space-y-2 xl:col-span-2">
            <label className="text-sm font-medium">소개문구</label>
            <textarea
              className={`${inputClassName} min-h-20 py-2`}
              value={profile.introText}
              onChange={(e) => updateField("introText", e.target.value)}
            />
          </div>
          <div className="space-y-2 xl:col-span-2">
            <label className="text-sm font-medium">이메일 서명</label>
            <textarea
              className={`${inputClassName} min-h-16 py-2`}
              value={profile.signature}
              onChange={(e) => updateField("signature", e.target.value)}
            />
          </div>
          <div className="space-y-2 xl:col-span-2">
            <label className="text-sm font-medium">수신거부 문구</label>
            <textarea
              className={`${inputClassName} min-h-16 py-2`}
              value={profile.unsubscribeNotice}
              onChange={(e) => updateField("unsubscribeNotice", e.target.value)}
            />
          </div>
          <div className="xl:col-span-2">
            <Button disabled={loading} onClick={saveProfile}>
              프로필 저장
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/80 shadow-sm">
        <CardHeader>
          <CardTitle>수신거부 목록 (SuppressionList)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <input
              className={inputClassName}
              placeholder="email@example.com"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
            />
            <input
              className={inputClassName}
              placeholder="사유"
              value={newReason}
              onChange={(e) => setNewReason(e.target.value)}
            />
            <Button disabled={loading || !newEmail} onClick={addSuppression}>
              추가
            </Button>
          </div>
          {suppression.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              등록된 수신거부 이메일이 없습니다.
            </p>
          ) : (
            <ul className="divide-y text-sm">
              {suppression.map((item) => (
                <li
                  key={item.id}
                  className="flex items-center justify-between gap-4 py-3"
                >
                  <div>
                    <p className="font-medium">{item.email}</p>
                    <p className="text-muted-foreground">{item.reason}</p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => removeSuppression(item.id)}
                  >
                    삭제
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {message ? <p className="text-sm text-primary">{message}</p> : null}
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  );
}
