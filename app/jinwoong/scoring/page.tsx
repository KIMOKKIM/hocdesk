import Link from "next/link";
import { GradeBadge, SectionCard } from "@/components/jinwoong/ui";
import { listJinwoongTargets } from "@/lib/jinwoong/data";

export default async function JinwoongScoringPage() {
  const targets = await listJinwoongTargets();
  const sorted = [...targets].sort((a, b) => b.displayScore - a.displayScore);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-[#0b1f3a]">AI 적합도 평가</h1>
        <p className="mt-1 text-sm text-slate-600">
          1차 MVP: 저장된 AI 점수·등급 조회. 수동 조정·재분석은 다음 단계입니다.
        </p>
      </header>

      <SectionCard title="적합도 순위">
        {sorted.length === 0 ? (
          <p className="text-sm text-slate-500">평가 대상이 없습니다.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b text-xs text-slate-500">
                <tr>
                  <th className="py-2 pr-3">순위</th>
                  <th className="py-2 pr-3">업체명</th>
                  <th className="py-2 pr-3">단계</th>
                  <th className="py-2 pr-3">점수</th>
                  <th className="py-2 pr-3">등급</th>
                  <th className="py-2">상세</th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((target, index) => (
                  <tr key={target.id} className="border-b last:border-0">
                    <td className="py-3 pr-3">{index + 1}</td>
                    <td className="py-3 pr-3 font-medium">{target.companyName}</td>
                    <td className="py-3 pr-3">{target.targetStage}단계</td>
                    <td className="py-3 pr-3 font-semibold">
                      {target.displayScore}
                    </td>
                    <td className="py-3 pr-3">
                      <GradeBadge grade={target.displayGrade} />
                    </td>
                    <td className="py-3">
                      <Link
                        href={`/jinwoong/targets/${target.id}`}
                        className="text-[#0b1f3a] hover:underline"
                      >
                        보기
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>
    </div>
  );
}
