import {
  EMAIL_DISCLAIMER,
  EXTERNAL_PROJECT_EXPRESSION,
  resolveIndustryTemplate,
  type IndustryTemplateKey,
} from "@/lib/constants/email";
import type {
  EmailDraftInput,
  EmailDraftProvider,
  EmailDraftResult,
} from "@/lib/email/draft/types";

const ASKING_PRICE_LABEL = "53억원";
const ASSET_LOCATION = "경기도 양주시";

const FORBIDDEN_PATTERNS = [
  /급매/i,
  /금융.*압박/i,
  /경마장.*확정/i,
  /토양.*문제.*없/i,
  /인허가.*가능/i,
  /주변.*시세.*싸/i,
];

function industryUseCase(
  key: IndustryTemplateKey,
  input: EmailDraftInput,
): string {
  const use = input.projectCompany.recommendedUse ?? "사업장 확장 또는 신규 거점";
  const region = input.company.region ?? ASSET_LOCATION;

  const map: Record<IndustryTemplateKey, string> = {
    scrap_auto: `${region} 일대 폐차·자동차해체 재활용 운영에 필요한 부지·공장 활용을 검토하실 수 있습니다. ${use} 관점에서 1차 검토가 가능합니다.`,
    truck_repair: `대형차·건설기계 정비 역량을 보유한 귀사의 ${region} 사업 확장 또는 정비 야드 확보에 참고하실 수 있는 조건입니다. ${use}에 대한 검토 여지가 있습니다.`,
    used_truck_export: `중고 상용차 매매·수출 업무 특성상 차량 보관·운영 공간 수요와 맞물릴 수 있는 산업용 부지입니다. ${use}에 활용 가능한 규모를 사전에 확인하실 수 있습니다.`,
    recycling: `자원순환·재활용 업종에서 ${region} 권역 운영을 하시는 귀사의 확장·이전 검토에 참고하실 수 있습니다. ${use} 관점에서 1차 정보 교환이 가능합니다.`,
    logistics: `물류·창고 운영 관점에서 ${region} 입지 조건을 중시하시는 귀사께 연락드립니다. ${use} 등 물류·창고 활용을 염두에 둔 잠재 수요를 폭넓게 검토 중입니다.`,
    construction_material: `건설자재·중장비 관련 운영을 하시는 귀사의 ${region} 사업 범위와 맞는 산업용 부지 기회입니다. ${use}에 대한 1차 검토 의사를 여쭙고자 합니다.`,
    industrial_dev: `산업용 부동산 개발·운영 경험을 보유한 귀사께 ${region} 권역 매각 검토 건을 소개드립니다. ${use} 또는 유사 용도로의 재개발·전환 가능성을 함께 검토할 수 있습니다.`,
    factory_broker: `공장·산업 부지 중개 전문성을 갖춘 귀사께 ${region} 일대 매각 검토 건을 공유드립니다. 잠재 매수·임대 수요사와의 연결 가능성이 있으실 것으로 판단되어 1차 정보 교환을 제안드립니다.`,
    general_manufacturing: `제조업 확장·이전을 검토하시는 귀사의 ${region} 사업 계획과 맞물릴 수 있는 산업용 부지입니다. ${use} 관점에서 1차 검토가 가능합니다.`,
    general_industrial: `산업용 부지 수요가 있는 귀사의 ${region} 사업 확장 계획과 연관하여 1차 정보를 공유드립니다. ${use}에 대한 검토 여부를 확인드리고자 합니다.`,
  };

  return map[key];
}

function buildSubject(input: EmailDraftInput) {
  const industryLabel =
    input.company.detailedIndustry ??
    input.company.industryGroup ??
    "산업용 부지";
  return `[${input.company.companyName}] 경기북부 ${industryLabel} 관련 산업용 부지 검토 제안`;
}

function buildBody(
  input: EmailDraftInput,
  templateKey: IndustryTemplateKey,
): string {
  const { senderProfile } = input;
  const salutation = input.contact?.jobTitle
    ? `${input.contact.jobTitle}님`
    : "담당자님";

  const reason = input.projectCompany.targetingReason
    ? `선정 배경: ${input.projectCompany.targetingReason}`
    : "";

  const sections = [
    "안녕하세요.",
    `${salutation}, ${input.company.companyName} 귀중.`,
    senderProfile.introText,
    "귀사의 사업 특성을 고려할 때 경기북부 지역의 사업장 확장 또는 신규 거점 용도로 검토 가능성이 있다고 판단해 연락드립니다.",
    EXTERNAL_PROJECT_EXPRESSION.replace(
      "산업용 부동산",
      `${ASSET_LOCATION} 소재 산업용 공장 및 토지`,
    ),
    industryUseCase(templateKey, input),
    [
      "【자산 개요】",
      `· 위치: ${ASSET_LOCATION}`,
      "· 자산형태: 토지 및 기존 공장",
      `· 희망 매각가: ${ASKING_PRICE_LABEL}`,
      "· 거래방식: 자산매각 중심 협의",
      "· 기존 설비: 철거 또는 별도 활용 검토",
      "· 상세자료: 관심 확인 후 제공",
    ].join("\n"),
    "기존 제조설비는 매수자의 사업 목적에 따라 철거, 재배치 또는 별도 활용을 검토할 수 있습니다.",
    reason,
    "토지·시설 관련 환경·인허가 사항은 확인 전 단정하지 않으며, 필요 시 단계별 자료 요청에 응하겠습니다.",
    "관심 여부를 알려주시면 후속 절차를 안내드리겠습니다.",
    senderProfile.unsubscribeNotice || EMAIL_DISCLAIMER,
    [
      senderProfile.senderName,
      senderProfile.jobTitle,
      senderProfile.companyName,
      senderProfile.phone ? `Tel. ${senderProfile.phone}` : "",
      senderProfile.email ? `Email. ${senderProfile.email}` : "",
      senderProfile.signature,
    ]
      .filter(Boolean)
      .join("\n"),
  ].filter(Boolean);

  return sections.join("\n\n");
}

function normalizeLength(body: string) {
  if (body.length >= 500 && body.length <= 900) return body;
  if (body.length < 500) {
    return `${body}\n\n본 건은 소유자의 사업 재편에 따른 매각 검토이며, 금융손실·급매 등의 표현 없이 사실 관계 중심으로 정보를 공유드립니다.`.slice(
      0,
      900,
    );
  }
  return `${body.slice(0, 880)}…`;
}

function collectWarnings(text: string): string[] {
  const warnings: string[] = [];
  for (const pattern of FORBIDDEN_PATTERNS) {
    if (pattern.test(text)) {
      warnings.push(`금지 표현 패턴 감지: ${pattern.source}`);
    }
  }
  return warnings;
}

export class RuleBasedEmailDraftProvider implements EmailDraftProvider {
  async generateDraft(input: EmailDraftInput): Promise<EmailDraftResult> {
    const templateKey =
      input.templateType === "AUTO"
        ? resolveIndustryTemplate(
            input.company.industryGroup,
            input.company.detailedIndustry,
          )
        : input.templateType;

    const subject = buildSubject(input);
    const body = normalizeLength(buildBody(input, templateKey));

    const personalizationPoints = [
      input.company.companyName,
      input.company.detailedIndustry ?? input.company.industryGroup ?? "",
      input.projectCompany.recommendedUse ?? "",
      ASKING_PRICE_LABEL,
    ].filter(Boolean);

    return {
      subject,
      body,
      personalizationPoints,
      warnings: collectWarnings(`${subject}\n${body}`),
      templateType: templateKey,
      generationMethod: "rules",
    };
  }
}
