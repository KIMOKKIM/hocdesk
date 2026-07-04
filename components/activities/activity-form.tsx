"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  ActivityType,
  activityResultLabels,
  activityTypeLabels,
} from "@/lib/constants/activity";
import { withBasePath } from "@/lib/paths";

type ActivityFormProps = {
  projects: { value: string; label: string }[];
  companies: { value: string; label: string }[];
  defaultProjectId?: string;
};

const inputClassName =
  "flex w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

export function ActivityForm({
  projects,
  companies,
  defaultProjectId,
}: ActivityFormProps) {
  const router = useRouter();
  const [projectId, setProjectId] = useState(defaultProjectId ?? projects[0]?.value ?? "");
  const [selectedCompanies, setSelectedCompanies] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);

    const formData = new FormData(event.currentTarget);

    try {
      const response = await fetch(withBasePath("/api/activities"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId,
          activityDate: formData.get("activityDate"),
          rawText: formData.get("rawText"),
          activityType: formData.get("activityType"),
          result: formData.get("result") || null,
          contactedCompanyIds: selectedCompanies,
          analyze: true,
          nextActionDate: formData.get("nextActionDate") || null,
          memo: formData.get("memo") || null,
        }),
      });

      const data = await response.json();
      if (!response.ok || !data.ok) {
        throw new Error(data.error ?? "저장 실패");
      }

      router.push(`/activities/${data.activity.id}`);
      router.refresh();
    } catch (submitError) {
      setError(
        submitError instanceof Error ? submitError.message : "저장 실패",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  function toggleCompany(id: string) {
    setSelectedCompanies((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid gap-4 xl:grid-cols-2">
        <div className="space-y-2">
          <label htmlFor="projectId" className="text-sm font-medium">
            프로젝트 *
          </label>
          <select
            id="projectId"
            value={projectId}
            onChange={(event) => setProjectId(event.target.value)}
            className={inputClassName}
            required
          >
            {projects.map((project) => (
              <option key={project.value} value={project.value}>
                {project.label}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <label htmlFor="activityDate" className="text-sm font-medium">
            활동일 *
          </label>
          <input
            id="activityDate"
            name="activityDate"
            type="date"
            defaultValue={new Date().toISOString().slice(0, 10)}
            className={inputClassName}
            required
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="activityType" className="text-sm font-medium">
            활동유형 *
          </label>
          <select
            id="activityType"
            name="activityType"
            defaultValue={ActivityType.PHONE}
            className={inputClassName}
            required
          >
            {Object.entries(activityTypeLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <label htmlFor="result" className="text-sm font-medium">
            결과
          </label>
          <select id="result" name="result" className={inputClassName}>
            <option value="">선택 안함</option>
            {Object.entries(activityResultLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <label htmlFor="nextActionDate" className="text-sm font-medium">
            다음 조치일
          </label>
          <input
            id="nextActionDate"
            name="nextActionDate"
            type="date"
            className={inputClassName}
          />
        </div>
      </div>

      <div className="space-y-2">
        <label htmlFor="memo" className="text-sm font-medium">
          메모
        </label>
        <textarea
          id="memo"
          name="memo"
          rows={3}
          className={`${inputClassName} min-h-20`}
          placeholder="내부 메모 (선택)"
        />
      </div>

      <div className="space-y-2">
        <label htmlFor="rawText" className="text-sm font-medium">
          업무 내용 *
        </label>
        <textarea
          id="rawText"
          name="rawText"
          required
          rows={8}
          className={`${inputClassName} min-h-40`}
          placeholder="오늘 접촉한 업체, 반응, 시장에서 들은 조언 등을 자유롭게 입력하세요."
        />
      </div>

      {companies.length > 0 ? (
        <div className="space-y-2">
          <p className="text-sm font-medium">접촉 업체 (선택)</p>
          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
            {companies.map((company) => (
              <label
                key={company.value}
                className="flex items-center gap-2 rounded-lg border px-3 py-2 text-sm"
              >
                <input
                  type="checkbox"
                  checked={selectedCompanies.includes(company.value)}
                  onChange={() => toggleCompany(company.value)}
                />
                {company.label}
              </label>
            ))}
          </div>
        </div>
      ) : null}

      {error ? (
        <p className="text-sm text-destructive">{error}</p>
      ) : null}

      <div className="flex gap-2">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "저장·분석 중..." : "저장 및 AI 분석"}
        </Button>
        <Button variant="outline" render={<Link href="/activities" />}>
          취소
        </Button>
      </div>
    </form>
  );
}
