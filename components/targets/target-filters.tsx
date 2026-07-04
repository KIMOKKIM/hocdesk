"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useTransition } from "react";
import { Button } from "@/components/ui/button";

type TargetFiltersProps = {
  industries: string[];
  regions: string[];
  grades: string[];
  sourceTypes: string[];
  statuses: { value: string; label: string }[];
};

export function TargetFilters({
  industries,
  regions,
  grades,
  sourceTypes,
  statuses,
}: TargetFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const updateParams = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value && value !== "ALL") {
        params.set(key, value);
      } else {
        params.delete(key);
      }
      startTransition(() => {
        router.push(`/targets?${params.toString()}`);
      });
    },
    [router, searchParams],
  );

  const inputClassName =
    "flex h-9 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

  return (
    <div className="grid gap-4 rounded-xl border bg-card p-4 md:grid-cols-2 xl:grid-cols-4">
      <div className="space-y-2">
        <label htmlFor="q" className="text-sm font-medium">
          검색
        </label>
        <input
          id="q"
          name="q"
          defaultValue={searchParams.get("q") ?? ""}
          placeholder="업체명, 업종, 지역"
          className={inputClassName}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              updateParams("q", event.currentTarget.value);
            }
          }}
        />
      </div>

      <div className="space-y-2">
        <label htmlFor="industry" className="text-sm font-medium">
          업종
        </label>
        <select
          id="industry"
          className={inputClassName}
          value={searchParams.get("industry") ?? "ALL"}
          onChange={(event) => updateParams("industry", event.target.value)}
        >
          <option value="ALL">전체</option>
          {industries.map((industry) => (
            <option key={industry} value={industry}>
              {industry}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-2">
        <label htmlFor="region" className="text-sm font-medium">
          지역
        </label>
        <select
          id="region"
          className={inputClassName}
          value={searchParams.get("region") ?? "ALL"}
          onChange={(event) => updateParams("region", event.target.value)}
        >
          <option value="ALL">전체</option>
          {regions.map((region) => (
            <option key={region} value={region}>
              {region}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-2">
        <label htmlFor="grade" className="text-sm font-medium">
          등급
        </label>
        <select
          id="grade"
          className={inputClassName}
          value={searchParams.get("grade") ?? "ALL"}
          onChange={(event) => updateParams("grade", event.target.value)}
        >
          <option value="ALL">전체</option>
          {grades.map((grade) => (
            <option key={grade} value={grade}>
              {grade}등급
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-2">
        <label htmlFor="status" className="text-sm font-medium">
          검토상태
        </label>
        <select
          id="status"
          className={inputClassName}
          value={searchParams.get("status") ?? "ALL"}
          onChange={(event) => updateParams("status", event.target.value)}
        >
          <option value="ALL">전체</option>
          {statuses.map((status) => (
            <option key={status.value} value={status.value}>
              {status.label}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-2">
        <label htmlFor="sourceType" className="text-sm font-medium">
          수집 출처
        </label>
        <select
          id="sourceType"
          className={inputClassName}
          value={searchParams.get("sourceType") ?? "ALL"}
          onChange={(event) => updateParams("sourceType", event.target.value)}
        >
          <option value="ALL">전체</option>
          {sourceTypes.map((sourceType) => (
            <option key={sourceType} value={sourceType}>
              {sourceType}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-2">
        <label htmlFor="collectedFrom" className="text-sm font-medium">
          수집일 (부터)
        </label>
        <input
          id="collectedFrom"
          type="date"
          className={inputClassName}
          defaultValue={searchParams.get("collectedFrom") ?? ""}
          onChange={(event) => updateParams("collectedFrom", event.target.value)}
        />
      </div>

      <div className="space-y-2">
        <label htmlFor="collectedTo" className="text-sm font-medium">
          수집일 (까지)
        </label>
        <input
          id="collectedTo"
          type="date"
          className={inputClassName}
          defaultValue={searchParams.get("collectedTo") ?? ""}
          onChange={(event) => updateParams("collectedTo", event.target.value)}
        />
      </div>

      <div className="space-y-2">
        <label htmlFor="hasContact" className="text-sm font-medium">
          연락처 보유
        </label>
        <select
          id="hasContact"
          className={inputClassName}
          value={searchParams.get("hasContact") ?? "ALL"}
          onChange={(event) => updateParams("hasContact", event.target.value)}
        >
          <option value="ALL">전체</option>
          <option value="YES">보유</option>
          <option value="NO">없음</option>
        </select>
      </div>

      <div className="space-y-2">
        <label htmlFor="hasEmail" className="text-sm font-medium">
          이메일 보유
        </label>
        <select
          id="hasEmail"
          className={inputClassName}
          value={searchParams.get("hasEmail") ?? "ALL"}
          onChange={(event) => updateParams("hasEmail", event.target.value)}
        >
          <option value="ALL">전체</option>
          <option value="YES">보유</option>
          <option value="NO">없음</option>
        </select>
      </div>

      <div className="flex items-end gap-2 md:col-span-2 xl:col-span-4">
        <Button
          variant="outline"
          disabled={isPending}
          onClick={() => {
            const q = (
              document.getElementById("q") as HTMLInputElement | null
            )?.value;
            if (q !== undefined) updateParams("q", q);
          }}
        >
          검색 적용
        </Button>
        <Button
          variant="ghost"
          disabled={isPending}
          onClick={() => router.push("/targets")}
        >
          필터 초기화
        </Button>
      </div>
    </div>
  );
}
