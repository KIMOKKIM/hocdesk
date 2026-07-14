"use client";

import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { withBasePath } from "@/lib/paths";

type CandidateItem = {
  id: string;
  companyName: string;
  segmentName: string | null;
  categoryName: string | null;
  region: string | null;
  phone: string | null;
  address?: string | null;
  validationStatus: string;
  sourceConfidence: string | null;
  searchKeyword: string | null;
  isDuplicate: boolean;
  placeUrl: string | null;
  discoveredAt: string;
  project: { name: string };
};

const ACCEPT_STATUSES = new Set(["ACCEPTED", "ACCEPT", "DISCOVERED"]);

export function SearchCandidatesPanel({ initialItems }: { initialItems: CandidateItem[] }) {
  const [items, setItems] = useState(initialItems);
  const [selected, setSelected] = useState<string[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const acceptIds = useMemo(
    () =>
      items
        .filter(
          (item) =>
            !item.isDuplicate &&
            (ACCEPT_STATUSES.has(item.validationStatus) ||
              item.validationStatus === "REVIEW_REQUIRED"),
        )
        .filter((item) => item.validationStatus !== "REJECTED")
        .map((item) => item.id),
    [items],
  );

  const acceptOnlyIds = useMemo(
    () =>
      items
        .filter(
          (item) =>
            !item.isDuplicate &&
            (item.validationStatus === "ACCEPTED" ||
              item.validationStatus === "ACCEPT"),
        )
        .map((item) => item.id),
    [items],
  );

  async function postAction(body: Record<string, unknown>) {
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch(withBasePath("/api/search-candidates"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!data.ok) {
        setMessage(data.error ?? "처리 실패");
        return null;
      }
      return data;
    } finally {
      setBusy(false);
    }
  }

  async function importSelected() {
    if (selected.length === 0) return;
    const data = await postAction({
      action: "import",
      candidateIds: selected,
    });
    if (!data) return;
    setMessage(
      `승인 ${data.importedCount}건 완료 — 타깃 업체에 NEW/PENDING으로 등록되었습니다.`,
    );
    setItems((prev) => prev.filter((item) => !selected.includes(item.id)));
    setSelected([]);
  }

  async function importAllAccept() {
    const ids = acceptOnlyIds.length > 0 ? acceptOnlyIds : acceptIds.slice(0, 30);
    if (ids.length === 0) {
      setMessage("승인 가능한 ACCEPT 후보가 없습니다.");
      return;
    }
    const data = await postAction({
      action: "import",
      candidateIds: ids.slice(0, 30),
    });
    if (!data) return;
    setMessage(`ACCEPT 승인 ${data.importedCount}건 완료`);
    setItems((prev) => prev.filter((item) => !ids.includes(item.id)));
    setSelected([]);
  }

  async function rejectSelected() {
    if (selected.length === 0) return;
    const data = await postAction({
      action: "reject",
      candidateIds: selected,
      reason: "관리자 제외",
    });
    if (!data) return;
    setMessage(`제외 ${data.updated}건`);
    setItems((prev) => prev.filter((item) => !selected.includes(item.id)));
    setSelected([]);
  }

  function toggleAll() {
    if (selected.length === items.length) {
      setSelected([]);
    } else {
      setSelected(items.map((i) => i.id));
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <Button
          size="sm"
          disabled={busy || selected.length === 0}
          onClick={() => void importSelected()}
        >
          선택 승인 ({selected.length})
        </Button>
        <Button
          size="sm"
          variant="outline"
          disabled={busy || acceptOnlyIds.length === 0}
          onClick={() => void importAllAccept()}
        >
          ACCEPT 전체 승인 ({acceptOnlyIds.length})
        </Button>
        <Button
          size="sm"
          variant="outline"
          disabled={busy || selected.length === 0}
          onClick={() => void rejectSelected()}
        >
          제외
        </Button>
      </div>
      {message ? <p className="text-sm text-green-700">{message}</p> : null}
      {items.length === 0 ? (
        <p className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
          표시할 검색 후보가 없습니다. 프로젝트 상세에서 카카오 후보 검색을
          실행하세요.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full min-w-[1100px] text-sm">
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                <th className="p-3">
                  <input
                    type="checkbox"
                    checked={selected.length === items.length && items.length > 0}
                    onChange={toggleAll}
                  />
                </th>
                <th className="p-3">업체명</th>
                <th className="p-3">검색어</th>
                <th className="p-3">카테고리</th>
                <th className="p-3">주소</th>
                <th className="p-3">전화</th>
                <th className="p-3">검증</th>
                <th className="p-3">신뢰도</th>
                <th className="p-3">중복</th>
                <th className="p-3">출처</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id} className="border-b last:border-0">
                  <td className="p-3">
                    <input
                      type="checkbox"
                      checked={selected.includes(item.id)}
                      onChange={() =>
                        setSelected((prev) =>
                          prev.includes(item.id)
                            ? prev.filter((id) => id !== item.id)
                            : [...prev, item.id],
                        )
                      }
                    />
                  </td>
                  <td className="p-3 font-medium">{item.companyName}</td>
                  <td className="p-3">{item.searchKeyword ?? "-"}</td>
                  <td className="p-3">
                    {item.categoryName ?? item.segmentName ?? "-"}
                  </td>
                  <td className="p-3 max-w-[200px] truncate">
                    {item.address ?? item.region ?? "-"}
                  </td>
                  <td className="p-3">{item.phone ?? "-"}</td>
                  <td className="p-3">
                    <Badge variant="outline">{item.validationStatus}</Badge>
                  </td>
                  <td className="p-3">{item.sourceConfidence ?? "-"}</td>
                  <td className="p-3">{item.isDuplicate ? "예" : "-"}</td>
                  <td className="p-3">
                    {item.placeUrl ? (
                      <a
                        href={item.placeUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-primary hover:underline"
                      >
                        열기
                      </a>
                    ) : (
                      "-"
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
