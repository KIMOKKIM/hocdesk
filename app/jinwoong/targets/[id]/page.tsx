import Link from "next/link";
import { notFound } from "next/navigation";
import {
  GradeBadge,
  InfoGrid,
  SectionCard,
  StatusBadge,
} from "@/components/jinwoong/ui";
import {
  ACQUISITION_PROBABILITY_LABELS,
  TARGET_STAGE_LABELS,
  TARGET_STATUS_LABELS,
} from "@/lib/jinwoong/constants";
import { getJinwoongTarget } from "@/lib/jinwoong/data";

type Props = { params: Promise<{ id: string }> };

export default async function JinwoongTargetDetailPage({ params }: Props) {
  const { id } = await params;
  const target = await getJinwoongTarget(id);
  if (!target) notFound();

  const analysis = target.analysis;

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/jinwoong/targets"
          className="text-sm text-slate-500 hover:text-slate-800"
        >
          ← 타깃 리스트
        </Link>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-bold text-[#0b1f3a]">
            {target.companyName}
          </h1>
          <GradeBadge grade={target.displayGrade} />
          <StatusBadge
            label={TARGET_STATUS_LABELS[target.status] ?? target.status}
          />
        </div>
        <p className="mt-1 text-sm text-slate-600">
          {TARGET_STAGE_LABELS[target.targetStage] ?? `${target.targetStage}단계`} ·
          AI 적합도 {target.displayScore}점 · 매수 가능성{" "}
          {ACQUISITION_PROBABILITY_LABELS[target.acquisitionProbability ?? ""] ??
            target.acquisitionProbability ??
            "-"}
        </p>
      </div>

      <SectionCard title="기본 업체정보">
        <InfoGrid
          items={[
            { label: "업체명", value: target.companyName },
            { label: "영문명", value: target.companyNameEn },
            { label: "국가", value: target.country },
            { label: "본사 주소", value: target.headquartersAddress },
            { label: "홈페이지", value: target.website },
            { label: "대표자", value: target.representativeName },
            { label: "주요 사업", value: target.mainBusiness },
            { label: "주요 제품", value: target.mainProducts },
            { label: "최근 매출", value: target.revenue },
            { label: "영업이익", value: target.operatingProfit },
            {
              label: "임직원 수",
              value: target.employeeCount?.toString() ?? "-",
            },
            { label: "기업 규모", value: target.companySize },
            { label: "업종", value: target.industry },
            { label: "타깃 선정 사유", value: target.targetReason },
            { label: "모기업", value: target.parentCompany },
            {
              label: "상장 여부",
              value: target.isListed ? "상장" : "비상장/해당없음",
            },
          ]}
        />
      </SectionCard>

      <SectionCard title="매수 가능성·AI 적합도 분석">
        {analysis ? (
          <div className="space-y-4">
            <p className="text-sm text-slate-700">{analysis.aiSummary}</p>
            <InfoGrid
              items={[
                { label: "총점", value: `${analysis.totalScore}점` },
                { label: "등급", value: `${analysis.grade}등급` },
                { label: "핵심 시너지", value: analysis.keySynergy },
                { label: "예상 인수 논리", value: analysis.acquisitionLogic },
                { label: "우려 요소", value: analysis.concerns },
                { label: "추가 조사 항목", value: analysis.followUpItems },
                { label: "권장 접근 전략", value: analysis.approachStrategy },
                {
                  label: "사업 시너지",
                  value: `${analysis.businessSynergy}/20`,
                },
                {
                  label: "제품·기술 시너지",
                  value: `${analysis.productSynergy + analysis.technologySynergy}/30`,
                },
                {
                  label: "고객·시장 시너지",
                  value: `${analysis.customerSynergy + analysis.marketSynergy}/30`,
                },
                {
                  label: "자금 여력",
                  value: `${analysis.financialCapacity}/15`,
                },
                {
                  label: "최근 M&A·투자",
                  value: `${analysis.acquisitionHistory}/15`,
                },
              ]}
            />
          </div>
        ) : (
          <p className="text-sm text-slate-500">아직 AI 분석 결과가 없습니다.</p>
        )}
      </SectionCard>

      <SectionCard title="담당자 정보">
        {target.contacts.length === 0 ? (
          <p className="text-sm text-slate-500">
            등록된 담당자가 없습니다. (2차 기능에서 공개정보 검색 예정)
          </p>
        ) : (
          <ul className="space-y-3">
            {target.contacts.map((contact) => (
              <li
                key={contact.id}
                className="rounded-lg border border-slate-100 bg-slate-50 p-3 text-sm"
              >
                <p className="font-medium">
                  {contact.name}
                  {contact.position ? ` · ${contact.position}` : ""}
                </p>
                <p className="text-slate-600">
                  {contact.email ?? "-"} · {contact.phone ?? "-"}
                </p>
              </li>
            ))}
          </ul>
        )}
      </SectionCard>

      <SectionCard title="맞춤 제안">
        {target.proposals.length === 0 ? (
          <p className="text-sm text-slate-500">
            생성된 제안서가 없습니다. (1차 MVP 후속: 이메일·문자 생성)
          </p>
        ) : (
          <ul className="space-y-2 text-sm">
            {target.proposals.map((proposal) => (
              <li key={proposal.id} className="rounded-lg border p-3">
                <p className="font-medium">{proposal.title}</p>
                <p className="text-xs text-slate-500">{proposal.proposalType}</p>
              </li>
            ))}
          </ul>
        )}
      </SectionCard>
    </div>
  );
}
