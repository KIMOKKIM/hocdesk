import "dotenv/config";
import { PrismaClient } from "../app/generated/prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import {
  CompanyStatus,
  ContactPermissionStatus,
  OutreachApprovalStatus,
  OutreachStatus,
  ProjectStatus,
  ReviewStatus,
  SuggestionStatus,
} from "../lib/constants/status";
import { normalizeCompanyName } from "../lib/format";
import { seedProjectInsights } from "../lib/project-insights/seed";

if (process.env.NODE_ENV === "production" && process.env.ALLOW_PRODUCTION_SEED !== "true") {
  console.error(
    "운영 환경 seed는 기본 차단됩니다. ALLOW_PRODUCTION_SEED=true 로 명시적으로 실행하세요.",
  );
  process.exit(1);
}

const prisma = new PrismaClient({
  adapter: new PrismaBetterSqlite3({
    url: process.env.DATABASE_URL ?? "file:./dev.db",
  }),
});

/** 고정 ID — seed 반복 실행 시 upsert 기준 */
const DEMO_PROJECT_ID = "seed_jinwoong_yangju_sale";

function demoCompanyId(companyName: string): string {
  return `seed_co_${normalizeCompanyName(companyName).replace(/\s+/g, "_")}`;
}

function demoProjectCompanyId(projectId: string, companyId: string): string {
  return `seed_pc_${projectId}_${companyId}`;
}

type DemoTarget = {
  companyName: string;
  industryGroup: string;
  detailedIndustry: string;
  region: string;
  targetGrade: string;
  fitScore: number;
  financialScore: number;
  locationScore: number;
  facilityNeedScore: number;
  expansionSignalScore: number;
  decisionMakerScore: number;
  recommendedUse: string;
  targetingReason: string;
  riskFactors: string;
  estimatedRevenue: string;
  currentFacilityType: string;
  employeeCount: number;
  companyStatus: string;
  reviewStatus: string;
};

const demoTargets: DemoTarget[] = [
  {
    companyName: "경기북부 상용차센터 데모",
    industryGroup: "운송·물류",
    detailedIndustry: "상용차 매매·정비",
    region: "경기도 양주시",
    targetGrade: "A",
    fitScore: 91,
    financialScore: 85,
    locationScore: 92,
    facilityNeedScore: 88,
    expansionSignalScore: 90,
    decisionMakerScore: 82,
    recommendedUse: "대형 상용차 정비·전시장 및 물류 부대시설",
    targetingReason:
      "양주 북부권 상용차 수요가 높고, 기존 공장 부지를 정비센터·주차장으로 전환하기 적합합니다.",
    riskFactors: "환경 인허가 변경 필요, 기존 염료 시설 잔존물 처리 비용 검토 필요",
    estimatedRevenue: "85억",
    currentFacilityType: "상용차 정비센터",
    employeeCount: 45,
    companyStatus: CompanyStatus.CONTACT_READY,
    reviewStatus: ReviewStatus.APPROVED,
  },
  {
    companyName: "양주 자원순환산업 데모",
    industryGroup: "환경·에너지",
    detailedIndustry: "자원순환·재활용",
    region: "경기도 양주시",
    targetGrade: "A",
    fitScore: 89,
    financialScore: 80,
    locationScore: 90,
    facilityNeedScore: 93,
    expansionSignalScore: 87,
    decisionMakerScore: 78,
    recommendedUse: "재활용 처리시설 및 순환자원 물류 거점",
    targetingReason:
      "수도권 북부 재활용 수요 증가로 대형 부지 확보 니즈가 있으며, 공장 토지 규모가 적합합니다.",
    riskFactors: "재활용 업종 허가 심사 기간 장기화 가능",
    estimatedRevenue: "62억",
    currentFacilityType: "재활용 처리장",
    employeeCount: 38,
    companyStatus: CompanyStatus.SCORED,
    reviewStatus: ReviewStatus.PENDING,
  },
  {
    companyName: "북부산업물류 데모",
    industryGroup: "운송·물류",
    detailedIndustry: "3PL·산업물류",
    region: "경기도 포천시",
    targetGrade: "A",
    fitScore: 87,
    financialScore: 88,
    locationScore: 84,
    facilityNeedScore: 90,
    expansionSignalScore: 85,
    decisionMakerScore: 80,
    recommendedUse: "산업용 창고·크로스독 물류센터",
    targetingReason:
      "경기 북부 산업단지 물류 수요가 꾸준하고, 공장 부지를 창고형 물류시설로 전환 가능합니다.",
    riskFactors: "물류 경쟁 심화, 임대 수익률 검증 필요",
    estimatedRevenue: "120억",
    currentFacilityType: "물류센터",
    employeeCount: 72,
    companyStatus: CompanyStatus.OUTREACH_STARTED,
    reviewStatus: ReviewStatus.APPROVED,
  },
  {
    companyName: "한강건설기계 데모",
    industryGroup: "건설·장비",
    detailedIndustry: "건설기계 임대·정비",
    region: "경기도 의정부시",
    targetGrade: "B",
    fitScore: 78,
    financialScore: 75,
    locationScore: 80,
    facilityNeedScore: 82,
    expansionSignalScore: 70,
    decisionMakerScore: 72,
    recommendedUse: "건설기계 보관·정비 야드",
    targetingReason:
      "수도권 북부 건설기계 임대사의 야드 확장 수요가 있으나, 접근로 폭 검토가 필요합니다.",
    riskFactors: "소음·진동 민원, 야드 포장 공사 비용",
    estimatedRevenue: "48억",
    currentFacilityType: "건설기계 야드",
    employeeCount: 28,
    companyStatus: CompanyStatus.REVIEWED,
    reviewStatus: ReviewStatus.PENDING,
  },
  {
    companyName: "경기산업개발 데모",
    industryGroup: "부동산·개발",
    detailedIndustry: "산업단지 개발",
    region: "경기도 양주시",
    targetGrade: "B",
    fitScore: 76,
    financialScore: 82,
    locationScore: 85,
    facilityNeedScore: 68,
    expansionSignalScore: 74,
    decisionMakerScore: 70,
    recommendedUse: "소규모 산업단지 분양 또는 임대형 공장 개발",
    targetingReason:
      "양주 일대 소형 제조·물류 기업의 공장 수요가 있으나, 개발 인허가 리드타임이 길 수 있습니다.",
    riskFactors: "개발 규제, 분양 리스크",
    estimatedRevenue: "95억",
    currentFacilityType: "산업부지 보유",
    employeeCount: 15,
    companyStatus: CompanyStatus.VALIDATED,
    reviewStatus: ReviewStatus.PENDING,
  },
  {
    companyName: "양주공장중개법인 데모",
    industryGroup: "부동산·개발",
    detailedIndustry: "공장·창고 중개",
    region: "경기도 양주시",
    targetGrade: "B",
    fitScore: 74,
    financialScore: 70,
    locationScore: 88,
    facilityNeedScore: 65,
    expansionSignalScore: 72,
    decisionMakerScore: 68,
    recommendedUse: "공장 매각 중개 및 잠재 매수자 풀 확보",
    targetingReason:
      "공장 중개 전문 법인으로 매각 프로젝트와 시너지가 있으나 직접 매수 가능성은 낮습니다.",
    riskFactors: "중개 수수료 의존, 직접 인수 의사 불확실",
    estimatedRevenue: "12억",
    currentFacilityType: "중개 사무소",
    employeeCount: 8,
    companyStatus: CompanyStatus.NEW,
    reviewStatus: ReviewStatus.PENDING,
  },
  {
    companyName: "북부중고차수출 데모",
    industryGroup: "운송·물류",
    detailedIndustry: "중고차 수출",
    region: "경기도 동두천시",
    targetGrade: "C",
    fitScore: 65,
    financialScore: 68,
    locationScore: 72,
    facilityNeedScore: 70,
    expansionSignalScore: 60,
    decisionMakerScore: 55,
    recommendedUse: "중고차 야적·수출 검수장",
    targetingReason:
      "부지 면적은 충분하나, 염료 제조 이력과 중고차 업종 간 시설 전환 비용이 큽니다.",
    riskFactors: "토양 검사, 업종 전환 비용, 수출 시장 변동성",
    estimatedRevenue: "35억",
    currentFacilityType: "중고차 야드",
    employeeCount: 22,
    companyStatus: CompanyStatus.SCORED,
    reviewStatus: ReviewStatus.PENDING,
  },
  {
    companyName: "미래창고개발 데모",
    industryGroup: "운송·물류",
    detailedIndustry: "창고·냉장물류",
    region: "경기도 파주시",
    targetGrade: "A",
    fitScore: 86,
    financialScore: 84,
    locationScore: 78,
    facilityNeedScore: 91,
    expansionSignalScore: 83,
    decisionMakerScore: 76,
    recommendedUse: "온도별 창고 및 3PL 물류센터",
    targetingReason:
      "수도권 서북부 창고 부족으로 대형 부지 수요가 있으며, 공장 철거 후 신축 창고 개발이 가능합니다.",
    riskFactors: "창고 신축 CAPEX, 임대 계약 확보 필요",
    estimatedRevenue: "78억",
    currentFacilityType: "일반창고",
    employeeCount: 41,
    companyStatus: CompanyStatus.CONTACT_READY,
    reviewStatus: ReviewStatus.APPROVED,
  },
  {
    companyName: "한국산업재활용 데모",
    industryGroup: "환경·에너지",
    detailedIndustry: "산업폐기물 재활용",
    region: "경기도 양주시",
    targetGrade: "B",
    fitScore: 79,
    financialScore: 77,
    locationScore: 86,
    facilityNeedScore: 84,
    expansionSignalScore: 75,
    decisionMakerScore: 71,
    recommendedUse: "산업폐기물 분류·재활용 시설",
    targetingReason:
      "기존 공장 부지를 재활용 시설로 전환하기 적합하나 환경 인허가 심사가 필요합니다.",
    riskFactors: "환경 영향평가, 주민 설득",
    estimatedRevenue: "55억",
    currentFacilityType: "재활용 시설",
    employeeCount: 33,
    companyStatus: CompanyStatus.REVIEWED,
    reviewStatus: ReviewStatus.PENDING,
  },
  {
    companyName: "경기상용차정비 데모",
    industryGroup: "운송·물류",
    detailedIndustry: "상용차 정비",
    region: "경기도 포천시",
    targetGrade: "C",
    fitScore: 68,
    financialScore: 65,
    locationScore: 74,
    facilityNeedScore: 72,
    expansionSignalScore: 62,
    decisionMakerScore: 58,
    recommendedUse: "중형 상용차 정비 공장",
    targetingReason:
      "정비 업종 적합성은 있으나 희망가 대비 투자 회수 기간이 길어 우선순위가 낮습니다.",
    riskFactors: "정비 설비 투자, 인력 확보",
    estimatedRevenue: "28억",
    currentFacilityType: "정비공장",
    employeeCount: 18,
    companyStatus: CompanyStatus.NEW,
    reviewStatus: ReviewStatus.PENDING,
  },
  {
    companyName: "북부건축자재 데모",
    industryGroup: "건설·장비",
    detailedIndustry: "건축자재 유통",
    region: "경기도 양주시",
    targetGrade: "B",
    fitScore: 73,
    financialScore: 71,
    locationScore: 87,
    facilityNeedScore: 76,
    expansionSignalScore: 69,
    decisionMakerScore: 66,
    recommendedUse: "건축자재 야적·유통센터",
    targetingReason:
      "양주·의정부 건설 수요와 연계한 자재 유통 거점으로 활용 가능합니다.",
    riskFactors: "건설 경기 민감도, 야적 관리 비용",
    estimatedRevenue: "42억",
    currentFacilityType: "자재 야적장",
    employeeCount: 25,
    companyStatus: CompanyStatus.VALIDATED,
    reviewStatus: ReviewStatus.PENDING,
  },
  {
    companyName: "스마트물류거점 데모",
    industryGroup: "운송·물류",
    detailedIndustry: "스마트물류·풀필먼트",
    region: "경기도 양주시",
    targetGrade: "A",
    fitScore: 88,
    financialScore: 86,
    locationScore: 89,
    facilityNeedScore: 87,
    expansionSignalScore: 91,
    decisionMakerScore: 79,
    recommendedUse: "이커머스 풀필먼트·자동화 물류센터",
    targetingReason:
      "수도권 북부 이커머스 물량 증가로 자동화 물류센터 수요가 높고, 부지 규모가 적합합니다.",
    riskFactors: "자동화 설비 투자, IT 연동 비용",
    estimatedRevenue: "110억",
    currentFacilityType: "물류센터",
    employeeCount: 58,
    companyStatus: CompanyStatus.OUTREACH_STARTED,
    reviewStatus: ReviewStatus.APPROVED,
  },
];

async function main() {
  const includeDemo =
    process.argv.includes("--include-demo") ||
    process.env.INCLUDE_DEMO_DATA?.trim().toLowerCase() === "true";

  const project = await prisma.project.upsert({
    where: { id: DEMO_PROJECT_ID },
    update: {
      name: "진웅산업 양주 공장 매각",
      companyName: "진웅산업",
      projectType: "산업용 부동산·공장 매각",
      status: ProjectStatus.ACTIVE,
      location: "경기도 양주시",
      askingPrice: BigInt(5_300_000_000),
      summary:
        "기존 염료 제조시설이 있는 공장 및 토지 일괄매각 프로젝트. 염료사업 승계보다 매수자의 신규사업 목적에 맞는 산업용 부지 활용을 우선 검토한다. 기존 공장과 설비는 철거 또는 별도 활용 대상으로 본다. 금융손실 및 급매 사유는 외부 타깃에게 공개하지 않는다.",
      propertyType: "공장·토지",
      landArea: "약 8,500㎡",
      buildingArea: "약 3,200㎡",
      desiredClosingDate: new Date("2026-12-31"),
    },
    create: {
      id: DEMO_PROJECT_ID,
      name: "진웅산업 양주 공장 매각",
      companyName: "진웅산업",
      projectType: "산업용 부동산·공장 매각",
      status: ProjectStatus.ACTIVE,
      location: "경기도 양주시",
      askingPrice: BigInt(5_300_000_000),
      summary:
        "기존 염료 제조시설이 있는 공장 및 토지 일괄매각 프로젝트. 염료사업 승계보다 매수자의 신규사업 목적에 맞는 산업용 부지 활용을 우선 검토한다. 기존 공장과 설비는 철거 또는 별도 활용 대상으로 본다. 금융손실 및 급매 사유는 외부 타깃에게 공개하지 않는다.",
      propertyType: "공장·토지",
      landArea: "약 8,500㎡",
      buildingArea: "약 3,200㎡",
      desiredClosingDate: new Date("2026-12-31"),
    },
  });

  await prisma.appSetting.upsert({
    where: { key: "sender_profile" },
    update: {},
    create: {
      key: "sender_profile",
      value: {
        senderName: process.env.DEFAULT_SENDER_NAME ?? "",
        companyName: "진웅산업",
        jobTitle: "",
        phone: process.env.DEFAULT_SENDER_PHONE ?? "",
        email: process.env.DEFAULT_SENDER_EMAIL ?? "",
        introText: "",
        signature: "",
        unsubscribeNotice:
          "본 메일은 정보 제공 목적으로 발송되었습니다. 수신을 원치 않으시면 회신으로 알려주세요.",
      },
    },
  });

  await seedProjectInsights(prisma, DEMO_PROJECT_ID);

  if (!includeDemo) {
    console.log("Seed completed (operational only — demo excluded):");
    console.log(`  Projects: ${await prisma.project.count()}`);
    console.log(`  Companies: ${await prisma.company.count()}`);
    console.log(`  ProjectInsights: ${await prisma.projectInsight.count()}`);
    console.log("  Tip: 데모 업체 포함 시 npm run db:seed -- --include-demo");
    return;
  }

  console.log("데모 업체 seed 포함 (--include-demo / INCLUDE_DEMO_DATA=true)");

  const seededCompanyIds: string[] = [];

  for (const target of demoTargets) {
    const companyId = demoCompanyId(target.companyName);

    const company = await prisma.company.upsert({
      where: { id: companyId },
      update: {
        companyName: target.companyName,
        normalizedName: normalizeCompanyName(target.companyName),
        industryGroup: target.industryGroup,
        detailedIndustry: target.detailedIndustry,
        region: target.region,
        estimatedRevenue: target.estimatedRevenue,
        currentFacilityType: target.currentFacilityType,
        employeeCount: target.employeeCount,
        status: target.companyStatus,
      },
      create: {
        id: companyId,
        companyName: target.companyName,
        normalizedName: normalizeCompanyName(target.companyName),
        industryGroup: target.industryGroup,
        detailedIndustry: target.detailedIndustry,
        region: target.region,
        estimatedRevenue: target.estimatedRevenue,
        currentFacilityType: target.currentFacilityType,
        employeeCount: target.employeeCount,
        status: target.companyStatus,
        address: `${target.region} 데모 주소`,
        mainPhone: "031-000-0000",
        generalEmail: `demo@${normalizeCompanyName(target.companyName).replace(/\s/g, "")}.example.com`,
      },
    });

    seededCompanyIds.push(company.id);

    await prisma.projectCompany.upsert({
      where: { id: demoProjectCompanyId(project.id, company.id) },
      update: {
        targetGrade: target.targetGrade,
        fitScore: target.fitScore,
        financialScore: target.financialScore,
        locationScore: target.locationScore,
        facilityNeedScore: target.facilityNeedScore,
        expansionSignalScore: target.expansionSignalScore,
        decisionMakerScore: target.decisionMakerScore,
        recommendedUse: target.recommendedUse,
        targetingReason: target.targetingReason,
        riskFactors: target.riskFactors,
        reviewStatus: target.reviewStatus,
      },
      create: {
        id: demoProjectCompanyId(project.id, company.id),
        projectId: project.id,
        companyId: company.id,
        targetGrade: target.targetGrade,
        fitScore: target.fitScore,
        financialScore: target.financialScore,
        locationScore: target.locationScore,
        facilityNeedScore: target.facilityNeedScore,
        expansionSignalScore: target.expansionSignalScore,
        decisionMakerScore: target.decisionMakerScore,
        recommendedUse: target.recommendedUse,
        targetingReason: target.targetingReason,
        riskFactors: target.riskFactors,
        reviewStatus: target.reviewStatus,
      },
    });

    const existingContact = await prisma.contact.findFirst({
      where: { companyId: company.id, source: "데모 시드" },
    });
    if (!existingContact) {
      await prisma.contact.create({
        data: {
          companyId: company.id,
          contactName: "데모 담당자",
          jobTitle: "대표",
          email: `contact@${normalizeCompanyName(target.companyName).replace(/\s/g, "")}.example.com`,
          mobile: "010-0000-0000",
          source: "데모 시드",
          verified: false,
          contactPermissionStatus: ContactPermissionStatus.UNKNOWN,
        },
      });
    }

    const existingSource = await prisma.companySource.findFirst({
      where: { companyId: company.id, sourceType: "MANUAL_DEMO" },
    });
    if (!existingSource) {
      await prisma.companySource.create({
        data: {
          companyId: company.id,
          sourceType: "MANUAL_DEMO",
          searchKeyword: target.detailedIndustry,
          discoveredReason: "데모용 타깃 업체 시드 데이터",
          sourceUrl: null,
        },
      });
    }
  }

  const outreachCount = await prisma.outreach.count({
    where: { projectId: project.id },
  });
  if (outreachCount === 0) {
    const companies = await prisma.company.findMany({
      where: { id: { in: seededCompanyIds.slice(0, 3) } },
    });

    await prisma.outreach.createMany({
      data: [
        {
          projectId: project.id,
          companyId: companies[0]!.id,
          emailType: "INITIAL",
          subject: "[비공개] 양주 공장 부지 매각 기회 안내",
          emailBody: "데모 초안 본문",
          status: OutreachStatus.DRAFT,
          approvalStatus: OutreachApprovalStatus.DRAFT,
        },
        {
          projectId: project.id,
          companyId: companies[1]!.id,
          emailType: "INITIAL",
          subject: "산업용 부지 확장 기회 검토 요청",
          emailBody: "데모 승인 대기 본문",
          status: OutreachStatus.DRAFT,
          approvalStatus: OutreachApprovalStatus.PENDING,
        },
        {
          projectId: project.id,
          companyId: companies[2]!.id,
          emailType: "INITIAL",
          subject: "전략적 부지 확보 제안",
          emailBody: "데모 발송 완료 본문",
          status: OutreachStatus.SENT,
          approvalStatus: OutreachApprovalStatus.APPROVED,
          sentAt: new Date("2026-06-23T17:30:00"),
        },
      ],
    });
  }

  const activityCount = await prisma.dailyActivity.count({
    where: { projectId: project.id },
  });
  if (activityCount === 0) {
    await prisma.dailyActivity.createMany({
      data: [
        {
          projectId: project.id,
          activityDate: new Date("2026-06-24"),
          rawText: "A등급 타깃 3건 접촉, 이메일 초안 2건 작성",
          summary: "A등급 타깃 3건 접촉, 이메일 초안 2건 작성",
        },
        {
          projectId: project.id,
          activityDate: new Date("2026-06-23"),
          rawText: "신규 타깃 5건 AI 제안 검토, 승인 2건",
          summary: "신규 타깃 5건 AI 제안 검토, 승인 2건",
        },
        {
          projectId: project.id,
          activityDate: new Date("2026-06-22"),
          rawText: "주간 타깃 리스트 업데이트 및 등급 재분류",
          summary: "주간 타깃 리스트 업데이트 및 등급 재분류",
        },
      ],
    });
  }

  const suggestionCount = await prisma.targetExpansionSuggestion.count({
    where: { projectId: project.id },
  });
  if (suggestionCount === 0) {
    await prisma.targetExpansionSuggestion.createMany({
      data: [
        {
          projectId: project.id,
          segmentName: "양주·의정부 물류 확장 수요",
          reason: "북부권 3PL·창고 업체의 대형 부지 수요 증가",
          recommendationScore: 87,
          priority: "HIGH",
          status: SuggestionStatus.PENDING,
          proposedTargetCount: 15,
          proposedRegions: JSON.stringify(["경기도 양주시", "경기도 의정부시"]),
          proposedKeywords: JSON.stringify(["물류센터", "창고", "3PL"]),
        },
        {
          projectId: project.id,
          segmentName: "자원순환·재활용 산업",
          reason: "환경 규제 강화로 재활용 시설 확장 수요",
          recommendationScore: 82,
          priority: "MEDIUM",
          status: SuggestionStatus.PENDING,
          proposedTargetCount: 10,
          proposedRegions: JSON.stringify(["경기도 양주시", "경기도 포천시"]),
          proposedKeywords: JSON.stringify(["재활용", "자원순환"]),
        },
      ],
    });
  }

  console.log("Seed completed:");
  console.log(`  Projects: ${await prisma.project.count()}`);
  console.log(`  Companies: ${await prisma.company.count()}`);
  console.log(`  ProjectCompanies: ${await prisma.projectCompany.count()}`);
  console.log(`  Contacts: ${await prisma.contact.count()}`);
  console.log(`  CompanySources: ${await prisma.companySource.count()}`);
  console.log(`  Outreach: ${await prisma.outreach.count()}`);
  console.log(`  DailyActivities: ${await prisma.dailyActivity.count()}`);
  console.log(
    `  TargetExpansionSuggestions: ${await prisma.targetExpansionSuggestion.count()}`,
  );

  const { seedJinwoongMvp } = await import("../lib/jinwoong/seed");
  await seedJinwoongMvp(prisma);
  console.log(`  JinwoongTargets: ${await prisma.jinwoongTarget.count()}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
