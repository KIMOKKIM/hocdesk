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
    apiKeyPresent: boolean;
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

  function updateField<K extends keyof SenderProfile>(key: K, value: SenderProfile[K]) {
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
              <p className="font-medium">{searchProviderStatus.providerLabel}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Kakao API 키</p>
              <p className="font-medium">
                {searchProviderStatus.apiKeyPresent ? "설정됨" : "미설정"}
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
          </div>
          {searchProviderStatus.provider === "demo" ? (
            <p className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-amber-900 dark:bg-amber-950/20 dark:text-amber-100">
              현재 Provider가 데모입니다. 운영에서는 Kakao 실제 업체 검색을
              사용하세요. (TARGET_SEARCH_PROVIDER=kakao)
            </p>
          ) : null}
          {!searchProviderStatus.apiKeyPresent ? (
            <p className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-destructive">
              Kakao API 키가 없어 실제 업체 검색을 실행할 수 없습니다.
              KAKAO_REST_API_KEY를 설정하세요.
            </p>
          ) : null}
          <p className="text-muted-foreground">
            일일 신규 {searchProviderStatus.limits.dailyNewCompanies}건 · 검토대기
            한도 {searchProviderStatus.limits.maxPendingReview}건 · 작업당 검색어{" "}
            {searchProviderStatus.limits.maxQueriesPerJob}개
          </p>
          <KakaoConnectionTestPanel
            apiKeyPresent={searchProviderStatus.apiKeyPresent}
            providerLabel={searchProviderStatus.providerLabel}
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
            <p className="text-sm text-muted-foreground">등록된 수신거부 이메일이 없습니다.</p>
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
