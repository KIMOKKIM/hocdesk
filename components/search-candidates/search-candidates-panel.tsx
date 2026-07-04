"use client";

import { useState } from "react";
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
  validationStatus: string;
  sourceConfidence: string | null;
  searchKeyword: string | null;
  isDuplicate: boolean;
  placeUrl: string | null;
  discoveredAt: string;
  project: { name: string };
};

export function SearchCandidatesPanel({ initialItems }: { initialItems: CandidateItem[] }) {
  const [items, setItems] = useState(initialItems);
  const [selected, setSelected] = useState<string[]>([]);
  const [message, setMessage] = useState<string | null>(null);

  async function importSelected() {
    const res = await fetch(withBasePath("/api/search-candidates"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "import", candidateIds: selected }),
    });
    const data = await res.json();
    if (!data.ok) {
      setMessage(data.error ?? "등록 실패");
      return;
    }
    setMessage(`등록 ${data.importedCount}건 완료`);
    setItems((prev) =>
      prev.filter((item) => !selected.includes(item.id)),
    );
    setSelected([]);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <Button
          size="sm"
          disabled={selected.length === 0}
          onClick={() => importSelected()}
        >
          선택 승인 ({selected.length})
        </Button>
      </div>
      {message ? <p className="text-sm text-green-700">{message}</p> : null}
      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full min-w-[1000px] text-sm">
          <thead>
            <tr className="border-b text-left text-muted-foreground">
              <th className="p-3">선택</th>
              <th className="p-3">업체명</th>
              <th className="p-3">업종</th>
              <th className="p-3">상태</th>
              <th className="p-3">전화</th>
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
                <td className="p-3">{item.segmentName ?? "-"}</td>
                <td className="p-3">
                  <Badge variant="outline">{item.validationStatus}</Badge>
                </td>
                <td className="p-3">{item.phone ?? "-"}</td>
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
    </div>
  );
}
