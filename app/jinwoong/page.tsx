import Link from "next/link";
import { GradeBadge, SectionCard, StatusBadge } from "@/components/jinwoong/ui";
import {
  PROGRESS_STEP_LABELS,
  TARGET_STATUS_LABELS,
} from "@/lib/jinwoong/constants";
import { getJinwoongOverviewStats } from "@/lib/jinwoong/data";

function formatDateTime(value: Date) {
  return new Intl.DateTimeFormat("ko-KR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(value);
}

export default async function JinwoongOverviewPage() {
  const { project, stats } = await getJinwoongOverviewStats();
  const steps = (project.progressSteps as { key: string; label: string; status: string }[]) ?? [];

  const cards = [
    { label: "전체 타깃 업체 수", value: stats.totalTargets },
    { label: "우선 접촉 대상 수", value: stats.priorityCount },
    { label: "검토 중인 업체 수", value: stats.reviewingCount },
    { label: "제안서 생성 업체 수", value: stats.proposalCount },
    { label: "신규 발견 업체 수", value: stats.newCount },
    {
      label: "최근 자동 업데이트 일시",
      value: formatDateTime(stats.lastUpdatedAt),
    },
  ];

  return (
    <div className="space-y-6">
      <header>
        <p className="text-xs font-medium tracking-wide text-slate-500">대외비</p>
        <h1 className="mt-1 text-2xl font-bold text-[#0b1f3a]">
          Jinwww 매각 프로젝트
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          진웅산업 전략적 매각 및 잠재 매수자 발굴 프로젝트
        </p>
      </header>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {cards.map((card) => (
          <div
            key={card.label}
            className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
          >
            <p className="text-xs text-slate-500">{card.label}</p>
            <p className="mt-2 text-2xl font-semibold text-[#0b1f3a]">
              {card.value}
            </p>
          </div>
        ))}
      </div>

      <SectionCard title="프로젝트 진행 현황">
        <ol className="space-y-3">
          {steps.map((step, index) => (
            <li
              key={step.key}
              className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50 px-4 py-3"
            >
              <div className="flex items-center gap-3">
                <span className="flex size-7 items-center justify-center rounded-full bg-[#0b1f3a] text-xs font-semibold text-white">
                  {index + 1}
                </span>
                <span className="text-sm font-medium">{step.label}</span>
              </div>
              <StatusBadge
                label={PROGRESS_STEP_LABELS[step.status] ?? step.status}
              />
            </li>
          ))}
        </ol>
      </SectionCard>

      <div className="flex flex-wrap gap-3">
        <Link
          href="/jinwoong/targets"
          className="rounded-md bg-[#0b1f3a] px-4 py-2 text-sm font-medium text-white hover:bg-[#123056]"
        >
          타깃 업체 리스트 보기
        </Link>
        <Link
          href="/jinwoong/company"
          className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50"
        >
          진웅산업 분석 보기
        </Link>
      </div>

      <p className="text-xs text-slate-400">
        상태 예시: {TARGET_STATUS_LABELS.PRIORITY_REVIEW} · 등급 예시{" "}
        <GradeBadge grade="A" />
      </p>
    </div>
  );
}
