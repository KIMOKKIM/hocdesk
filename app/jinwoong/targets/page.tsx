import Link from "next/link";
import { GradeBadge, SectionCard, StatusBadge } from "@/components/jinwoong/ui";
import {
  ACQUISITION_PROBABILITY_LABELS,
  TARGET_STAGE_LABELS,
  TARGET_STATUS_LABELS,
} from "@/lib/jinwoong/constants";
import { listJinwoongTargets } from "@/lib/jinwoong/data";

type Props = {
  searchParams: Promise<{
    stage?: string;
    country?: string;
    status?: string;
    q?: string;
  }>;
};

function formatDate(value: Date | null | undefined) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("ko-KR", { dateStyle: "medium" }).format(value);
}

export default async function JinwoongTargetsPage({ searchParams }: Props) {
  const params = await searchParams;
  const stage = params.stage ? Number(params.stage) : undefined;
  const targets = await listJinwoongTargets({
    stage: Number.isFinite(stage) ? stage : undefined,
    country: params.country,
    status: params.status,
    q: params.q,
  });

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-[#0b1f3a]">타깃 업체 리스트</h1>
        <p className="mt-1 text-sm text-slate-600">
          7단계 분류 기준의 잠재 매수 후보입니다. 총 {targets.length}건
        </p>
      </header>

      <SectionCard title="필터">
        <form className="flex flex-wrap gap-2">
          <select
            name="stage"
            defaultValue={params.stage ?? ""}
            className="h-9 rounded-md border border-slate-300 bg-white px-2 text-sm"
          >
            <option value="">전체 단계</option>
            {Object.entries(TARGET_STAGE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          <select
            name="country"
            defaultValue={params.country ?? ""}
            className="h-9 rounded-md border border-slate-300 bg-white px-2 text-sm"
          >
            <option value="">국내·해외</option>
            <option value="KR">국내</option>
            <option value="JP">일본</option>
            <option value="US">미국</option>
            <option value="CN">중국</option>
          </select>
          <select
            name="status"
            defaultValue={params.status ?? ""}
            className="h-9 rounded-md border border-slate-300 bg-white px-2 text-sm"
          >
            <option value="">전체 상태</option>
            {Object.entries(TARGET_STATUS_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          <input
            name="q"
            defaultValue={params.q ?? ""}
            placeholder="업체명·업종 검색"
            className="h-9 min-w-[200px] rounded-md border border-slate-300 bg-white px-3 text-sm"
          />
          <button
            type="submit"
            className="h-9 rounded-md bg-[#0b1f3a] px-4 text-sm font-medium text-white"
          >
            적용
          </button>
        </form>
      </SectionCard>

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
        {targets.length === 0 ? (
          <p className="p-8 text-center text-sm text-slate-500">
            조건에 맞는 타깃 업체가 없습니다. 필터를 변경해 보세요.
          </p>
        ) : (
          <table className="min-w-full text-left text-sm">
            <thead className="border-b bg-slate-50 text-xs text-slate-500">
              <tr>
                <th className="px-3 py-3 font-medium">단계</th>
                <th className="px-3 py-3 font-medium">업체명</th>
                <th className="px-3 py-3 font-medium">국가</th>
                <th className="px-3 py-3 font-medium">업종</th>
                <th className="px-3 py-3 font-medium">규모</th>
                <th className="px-3 py-3 font-medium">선정 사유</th>
                <th className="px-3 py-3 font-medium">매수 가능성</th>
                <th className="px-3 py-3 font-medium">AI 적합도</th>
                <th className="px-3 py-3 font-medium">담당자</th>
                <th className="px-3 py-3 font-medium">제안서</th>
                <th className="px-3 py-3 font-medium">상태</th>
                <th className="px-3 py-3 font-medium">업데이트</th>
                <th className="px-3 py-3 font-medium">상세</th>
              </tr>
            </thead>
            <tbody>
              {targets.map((target) => (
                <tr key={target.id} className="border-b last:border-0">
                  <td className="px-3 py-3 whitespace-nowrap text-xs">
                    {target.targetStage}단계
                  </td>
                  <td className="px-3 py-3 font-medium text-slate-900">
                    {target.companyName}
                  </td>
                  <td className="px-3 py-3">{target.country}</td>
                  <td className="px-3 py-3">{target.industry ?? "-"}</td>
                  <td className="px-3 py-3">{target.companySize ?? "-"}</td>
                  <td className="max-w-[220px] truncate px-3 py-3 text-xs text-slate-600">
                    {target.targetReason ?? "-"}
                  </td>
                  <td className="px-3 py-3">
                    {ACQUISITION_PROBABILITY_LABELS[
                      target.acquisitionProbability ?? ""
                    ] ?? target.acquisitionProbability ?? "-"}
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">{target.displayScore}</span>
                      <GradeBadge grade={target.displayGrade} />
                    </div>
                  </td>
                  <td className="px-3 py-3">
                    {target.hasContact ? "확보" : "미확보"}
                  </td>
                  <td className="px-3 py-3">
                    {target.hasProposal ? "생성" : "-"}
                  </td>
                  <td className="px-3 py-3">
                    <StatusBadge
                      label={
                        TARGET_STATUS_LABELS[target.status] ?? target.status
                      }
                    />
                  </td>
                  <td className="px-3 py-3 whitespace-nowrap text-xs">
                    {formatDate(target.updatedAt)}
                  </td>
                  <td className="px-3 py-3">
                    <Link
                      href={`/jinwoong/targets/${target.id}`}
                      className="text-[#0b1f3a] underline-offset-2 hover:underline"
                    >
                      상세보기
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
