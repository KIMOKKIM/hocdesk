import {
  EMAIL_DISCLAIMER,
  EXTERNAL_PROJECT_EXPRESSION,
  type IndustryTemplateKey,
} from "@/lib/constants/email";
import type { EmailGenerationInput, GeneratedEmail } from "@/lib/email/types";

const OPENING = "안녕하세요.";

function industryParagraph(key: IndustryTemplateKey, input: EmailGenerationInput) {
  const use = input.recommendedUse ?? "귀사의 운영 특성에 맞는 활용";
  const region = input.region ?? input.projectLocation ?? "수도권 북부";

  const map: Record<IndustryTemplateKey, string> = {
    scrap_auto: `폐차·자동차해체 업종에서 ${region} 일대의 안정적 운영 기반을 갖춘 귀사께 연락드립니다. 검토 중인 산업용 부지는 ${use}에 참고하실 만한 조건을 갖추고 있어, 1차로 개략 정보 공유가 가능한지 여쭙고자 합니다.`,
    truck_repair: `${region}에서 대형차·건설기계 정비 역량을 보유한 귀사의 확장·운영 환경과 맞물릴 수 있는 산업용 부지 매각 기회를 공유드리고자 합니다. ${use} 관점에서 검토 여지가 있을 것으로 판단되어 연락드립니다.`,
    used_truck_export: `중고 상용차·수출 업무 특성상 차량 보관·운영 공간 수요가 있는 귀사께, ${region} 소재 산업용 부동산 매각 검토 건을 소개드립니다. ${use}에 활용 가능한 규모와 입지 조건을 사전에 확인하실 수 있습니다.`,
    recycling: `자원순환·재활용 업종에서 ${region} 권역 운영을 하시는 귀사께 산업용 부지 매각 기회를 제안드립니다. ${use}에 대한 검토가 가능하시다면, 관심 여부를 먼저 확인드리고자 합니다.`,
    logistics: `물류·창고 운영 관점에서 ${region} 입지 조건을 중시하시는 귀사께 연락드립니다. ${EXTERNAL_PROJECT_EXPRESSION} 본 건은 ${use} 등 물류·창고 활용을 염두에 둔 잠재 매수·임대 수요를 폭넓게 검토 중입니다.`,
    construction_material: `건설자재·중장비 관련 운영을 하시는 귀사의 ${region} 사업 범위와 맞는 산업용 부지 기회를 공유드립니다. ${use}에 대한 1차 검토 의사를 여쭙고자 합니다.`,
    industrial_dev: `산업용 부동산 개발·운영 경험을 보유한 귀사께 ${region} 권역 매각 검토 건을 소개드립니다. ${use} 또는 유사 용도로의 재개발·전환 가능성을 함께 검토할 수 있습니다.`,
    factory_broker: `공장·산업 부지 중개 전문성을 갖춘 귀사께 ${region} 일대 매각 검토 건을 공유드립니다. 잠재 매수·임대 수요사와의 연결 가능성이 있으실 것으로 판단되어 1차 정보 교환을 제안드립니다.`,
    general_manufacturing: `제조업 확장·이전을 검토하시는 귀사의 ${region} 사업 계획과 맞물릴 수 있는 산업용 부지입니다. ${use} 관점에서 1차 검토가 가능합니다.`,
    general_industrial: `산업용 부지 수요가 있는 귀사의 ${region} 사업 확장 계획과 연관하여 1차 정보를 공유드립니다. ${use}에 대한 검토 여부를 확인드리고자 합니다.`,
  };

  return map[key];
}

function buildBody(input: EmailGenerationInput): string {
  const title = input.contactTitle ? `${input.contactTitle}님` : "담당자님";
  const reason = input.targetingReason
    ? `타깃 선정 배경: ${input.targetingReason}`
    : "";
  const activity = input.recentActivitySummary
    ? `최근 내부 검토 메모: ${input.recentActivitySummary}`
    : "";

  const paragraphs = [
    OPENING,
    `${title}, ${input.companyName} 귀중.`,
    EXTERNAL_PROJECT_EXPRESSION,
    industryParagraph(input.templateKey, input),
    `적합도 내부 평가 ${input.fitScore}점 기준으로 귀사 업종(${input.detailedIndustry ?? input.industryGroup ?? "관련 업종"})과의 연관성을 확인했습니다.`,
    reason,
    activity,
    "상세 주소·민감 자료는 관심 및 NDA 등 절차 확인 후 공유드리겠습니다. 토지·시설 관련 인허가·환경 사항은 확인 전 단정하지 않으며, 필요 시 단계별 자료 요청에 응하겠습니다.",
    "간단한 관심 여부 회신을 부탁드립니다. 첨부파일 없이 1차 개요만 전달드립니다.",
    EMAIL_DISCLAIMER,
  ].filter(Boolean);

  return paragraphs.join("\n\n");
}

function normalizeLength(body: string) {
  if (body.length >= 500 && body.length <= 800) return body;

  if (body.length < 500) {
    const padding =
      "본 건은 급매 또는 금융 압박 사유가 아닌 사업 재편에 따른 매각 검토이며, 과장된 표현 없이 사실 관계 중심으로 정보를 공유드립니다. 관심 있으시면 후속 미팅 또는 자료 요청 절차를 안내드리겠습니다.";
    return `${body}\n\n${padding}`.slice(0, 800);
  }

  return `${body.slice(0, 780)}…`;
}

export function generateTemplateEmail(
  input: EmailGenerationInput,
): GeneratedEmail {
  const subject = `[비공개] ${input.projectLocation ?? "경기"} 산업용 부지 매각 검토 — ${input.companyName} 귀중`;
  const body = normalizeLength(buildBody(input));

  return {
    subject,
    body,
    templateKey: input.templateKey,
    generator: "template",
  };
}
