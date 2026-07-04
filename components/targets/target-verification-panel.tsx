"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { withBasePath } from "@/lib/paths";

type TargetVerificationPanelProps = {
  projectCompanyId: string;
  initial: {
    website: string | null;
    generalEmail: string | null;
    mainPhone: string | null;
    verificationMemo: string | null;
    detailedIndustry: string | null;
    currentFacilityType: string | null;
    contactName: string | null;
    contactTitle: string | null;
    contactEmail: string | null;
    sourceUrl: string | null;
  };
};

const inputClassName =
  "flex h-9 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

export function TargetVerificationPanel({
  projectCompanyId,
  initial,
}: TargetVerificationPanelProps) {
  const [form, setForm] = useState(initial);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function saveVerification() {
    setLoading(true);
    setError(null);
    try {
      const verifiedFields: string[] = [];
      if (form.website) verifiedFields.push("website");
      if (form.generalEmail) verifiedFields.push("generalEmail");
      if (form.mainPhone) verifiedFields.push("mainPhone");

      const res = await fetch(
        withBasePath(`/api/targets/${projectCompanyId}/verify`),
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...form,
            verifiedFields,
          }),
        },
      );
      const data = await res.json();
      if (!data.ok) throw new Error(data.error ?? "저장 실패");
      setMessage("정보 보강 내용이 저장되었습니다.");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "저장 실패");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="border-border/80 shadow-sm">
      <CardHeader>
        <CardTitle>정보 보강</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          확인되지 않은 정보는 자동 생성되지 않습니다. 관리자가 직접 확인한
          정보만 입력하세요.
        </p>

        <div className="grid gap-4 md:grid-cols-2">
          <Field label="공식 홈페이지">
            <input
              className={inputClassName}
              value={form.website ?? ""}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, website: e.target.value || null }))
              }
              placeholder="https://"
            />
          </Field>
          <Field label="대표 이메일">
            <input
              className={inputClassName}
              value={form.generalEmail ?? ""}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  generalEmail: e.target.value || null,
                }))
              }
            />
          </Field>
          <Field label="대표 전화">
            <input
              className={inputClassName}
              value={form.mainPhone ?? ""}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  mainPhone: e.target.value || null,
                }))
              }
            />
          </Field>
          <Field label="업종 확인">
            <input
              className={inputClassName}
              value={form.detailedIndustry ?? ""}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  detailedIndustry: e.target.value || null,
                }))
              }
            />
          </Field>
          <Field label="담당자 이름">
            <input
              className={inputClassName}
              value={form.contactName ?? ""}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  contactName: e.target.value || null,
                }))
              }
            />
          </Field>
          <Field label="담당자 직책">
            <input
              className={inputClassName}
              value={form.contactTitle ?? ""}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  contactTitle: e.target.value || null,
                }))
              }
            />
          </Field>
          <Field label="담당자 이메일">
            <input
              className={inputClassName}
              value={form.contactEmail ?? ""}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  contactEmail: e.target.value || null,
                }))
              }
            />
          </Field>
          <Field label="현재 사업장 특징">
            <input
              className={inputClassName}
              value={form.currentFacilityType ?? ""}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  currentFacilityType: e.target.value || null,
                }))
              }
            />
          </Field>
        </div>

        <Field label="검증 메모">
          <textarea
            className="min-h-24 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            value={form.verificationMemo ?? ""}
            onChange={(e) =>
              setForm((prev) => ({
                ...prev,
                verificationMemo: e.target.value || null,
              }))
            }
          />
        </Field>

        <div className="flex flex-wrap gap-2">
          {form.sourceUrl ? (
            <Button variant="outline" render={<a href={form.sourceUrl} target="_blank" rel="noreferrer" />}>
              출처 열기
            </Button>
          ) : null}
          <Button disabled={loading} onClick={() => saveVerification()}>
            {loading ? "저장 중..." : "검증 정보 저장"}
          </Button>
        </div>

        {message ? <p className="text-sm text-green-700">{message}</p> : null}
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
      </CardContent>
    </Card>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="space-y-1 text-sm">
      <span className="font-medium">{label}</span>
      {children}
    </label>
  );
}
