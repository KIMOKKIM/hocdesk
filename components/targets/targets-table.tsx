"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ReviewStatus } from "@/lib/constants/status";
import { withBasePath } from "@/lib/paths";

type TargetRow = {
  id: string;
  companyName: string;
  reviewStatus: string;
  reviewStatusLabel: string;
  targetGrade: string;
  fitScore: number;
  region: string | null;
  industryGroup: string | null;
  detailedIndustry: string | null;
  projectName: string;
  latestSourceType: string | null;
  latestSourceLabel?: string | null;
  latestSourceConfidenceLabel?: string | null;
  latestCollectedAt: string | null;
  isDemo?: boolean;
  hasContact: boolean;
  hasEmail: boolean;
  hasPhone?: boolean;
  mainPhone?: string | null;
  hasWebsite?: boolean;
};

const BULK_MAX = 30;

async function bulkPatch(ids: string[], status: string) {
  const response = await fetch(
    withBasePath("/api/project-companies/bulk-review-status"),
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids, status }),
    },
  );
  const data = await response.json();
  if (!response.ok || !data.ok) {
    throw new Error(data.error ?? "일괄 처리 실패");
  }
  return data as {
    successCount: number;
    failureCount: number;
    failures: { id: string; message: string }[];
  };
}

export function TargetsTable({ targets }: { targets: TargetRow[] }) {
  const router = useRouter();
  const [selected, setSelected] = useState<string[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const selectedSet = useMemo(() => new Set(selected), [selected]);
  const allSelected = targets.length > 0 && selected.length === targets.length;

  function toggleAll() {
    if (allSelected) {
      setSelected([]);
    } else {
      setSelected(targets.slice(0, BULK_MAX).map((item) => item.id));
    }
  }

  function toggleOne(id: string) {
    setSelected((prev) => {
      if (prev.includes(id)) return prev.filter((item) => item !== id);
      if (prev.length >= BULK_MAX) {
        setMessage(`최대 ${BULK_MAX}개까지 선택할 수 있습니다.`);
        return prev;
      }
      return [...prev, id];
    });
  }

  function runBulk(status: string) {
    if (selected.length === 0) {
      setMessage("선택된 업체가 없습니다.");
      return;
    }
    setMessage(null);
    startTransition(async () => {
      try {
        const result = await bulkPatch(selected, status);
        setMessage(
          `성공 ${result.successCount}건 · 실패 ${result.failureCount}건`,
        );
        setSelected([]);
        router.refresh();
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "일괄 처리 실패");
      }
    });
  }

  function exportCsv() {
    const rows = targets.filter((item) => selectedSet.has(item.id));
    if (rows.length === 0) {
      setMessage("CSV 내보내기할 업체를 선택하세요.");
      return;
    }
    const header = [
      "업체명",
      "검토상태",
      "등급",
      "적합도",
      "업종",
      "지역",
      "연락처",
      "이메일",
    ];
    const lines = rows.map((row) =>
      [
        row.companyName,
        row.reviewStatusLabel,
        row.targetGrade,
        row.fitScore,
        row.industryGroup ?? "",
        row.region ?? "",
        row.hasContact ? "Y" : "N",
        row.hasEmail ? "Y" : "N",
      ]
        .map((value) => `"${String(value).replace(/"/g, '""')}"`)
        .join(","),
    );
    const blob = new Blob([[header.join(","), ...lines].join("\n")], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `targets-${new Date().toISOString().slice(0, 10)}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={allSelected} onChange={toggleAll} />
          전체 선택 (최대 {BULK_MAX}개)
        </label>
        <span className="text-sm text-muted-foreground">
          {selected.length}개 선택
        </span>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button
          size="sm"
          variant="outline"
          disabled={isPending}
          onClick={() => runBulk(ReviewStatus.REVIEWED)}
        >
          검토 완료
        </Button>
        <Button
          size="sm"
          disabled={isPending}
          onClick={() => runBulk(ReviewStatus.CONTACT_READY)}
        >
          연락 준비 완료
        </Button>
        <Button
          size="sm"
          variant="outline"
          disabled={isPending}
          onClick={() => runBulk(ReviewStatus.HOLD)}
        >
          보류
        </Button>
        <Button
          size="sm"
          variant="destructive"
          disabled={isPending}
          onClick={() => runBulk(ReviewStatus.REJECTED)}
        >
          제외
        </Button>
        <Button size="sm" variant="secondary" onClick={exportCsv}>
          CSV 내보내기
        </Button>
      </div>

      {message ? <p className="text-sm text-primary">{message}</p> : null}

      <div className="overflow-x-auto">
        <table className="w-full min-w-[1280px] text-sm">
          <thead>
            <tr className="border-b text-left text-muted-foreground">
              <th className="pb-3 pr-3 font-medium">선택</th>
              <th className="pb-3 font-medium">구분</th>
              <th className="pb-3 font-medium">업체명</th>
              <th className="pb-3 font-medium">업종</th>
              <th className="pb-3 font-medium">지역</th>
              <th className="pb-3 font-medium">전화번호</th>
              <th className="pb-3 font-medium">출처</th>
              <th className="pb-3 font-medium">신뢰도</th>
              <th className="pb-3 font-medium">검토상태</th>
              <th className="pb-3 font-medium">적합도</th>
              <th className="pb-3 font-medium">발견일</th>
            </tr>
          </thead>
          <tbody>
            {targets.map((target) => (
              <tr key={target.id} className="border-b last:border-0">
                <td className="py-3 pr-3">
                  <input
                    type="checkbox"
                    checked={selectedSet.has(target.id)}
                    onChange={() => toggleOne(target.id)}
                  />
                </td>
                <td className="py-3">
                  {target.isDemo ? (
                    <Badge variant="outline" className="text-xs">
                      데모
                    </Badge>
                  ) : (
                    <Badge className="text-xs">실제</Badge>
                  )}
                </td>
                <td className="py-3">
                  <Link
                    href={`/targets/${target.id}`}
                    className="font-medium text-primary hover:underline"
                  >
                    {target.companyName}
                  </Link>
                  <p className="text-xs text-muted-foreground">
                    {target.projectName}
                    {!target.hasEmail ? " · 이메일 없음" : ""}
                  </p>
                </td>
                <td className="py-3">
                  {target.industryGroup}
                  {target.detailedIndustry ? (
                    <p className="text-xs text-muted-foreground">
                      {target.detailedIndustry}
                    </p>
                  ) : null}
                </td>
                <td className="py-3">{target.region ?? "-"}</td>
                <td className="py-3">{target.mainPhone ?? (target.hasPhone ? "있음" : "-")}</td>
                <td className="py-3">
                  {target.latestSourceLabel ?? target.latestSourceType ?? "-"}
                </td>
                <td className="py-3">
                  {target.latestSourceConfidenceLabel ?? "-"}
                </td>
                <td className="py-3">
                  <Badge variant="outline">{target.reviewStatusLabel}</Badge>
                </td>
                <td className="py-3 font-medium">{target.fitScore}점</td>
                <td className="py-3 text-muted-foreground">
                  {target.latestCollectedAt ?? "-"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
