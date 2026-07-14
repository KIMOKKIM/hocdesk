import { InfoGrid, SectionCard } from "@/components/jinwoong/ui";
import { getJinwoongCompanyProfile } from "@/lib/jinwoong/data";

function asRecord(value: unknown): Record<string, string> {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, string>;
  }
  return {};
}

function toItems(
  data: Record<string, string>,
  labels: Record<string, string>,
) {
  return Object.entries(labels).map(([key, label]) => ({
    label,
    value: data[key] ?? "-",
  }));
}

const BASIC_LABELS: Record<string, string> = {
  companyName: "회사명",
  representative: "대표자",
  foundedYear: "설립연도",
  headquarters: "본사 소재지",
  businessNumber: "사업자등록번호",
  mainBusiness: "주요 사업",
  mainProducts: "주요 제품",
  mainCustomers: "주요 고객",
  employeeCount: "임직원 수",
  capital: "자본금",
  recentRevenue: "최근 매출",
  operatingProfit: "영업이익",
  ebitda: "EBITDA",
  majorAssets: "주요 자산",
  majorLiabilities: "주요 부채",
  ownershipStructure: "지분 구조",
  askingPrice: "희망 매각가",
  saleEquity: "매각 대상 지분",
  desiredTiming: "매각 희망 시기",
};

const BUSINESS_LABELS: Record<string, string> = {
  overview: "회사 개요",
  coreBusiness: "핵심 사업",
  productsServices: "주요 제품 및 서비스",
  revenueStructure: "매출 구조",
  keyClients: "주요 거래처",
  marketPosition: "시장 내 위치",
  competitiveness: "경쟁력",
  technology: "기술력",
  facilities: "생산시설",
  salesOrg: "영업 조직",
  workforce: "인력 구조",
  ownerDependency: "대표자 의존도",
  growthPotential: "성장 가능성",
  risks: "위험 요소",
};

const FINANCIAL_LABELS: Record<string, string> = {
  revenue3y: "최근 3개년 매출",
  operatingProfit3y: "최근 3개년 영업이익",
  ebitda3y: "최근 3개년 EBITDA",
  debtRatio: "부채비율",
  cashFlow: "현금흐름",
  majorAssets: "주요 자산",
  nonOperatingAssets: "비영업용 자산",
  normalizedEarnings: "정상화 이익",
  estimatedEnterpriseValue: "예상 기업가치",
  fairSaleRange: "적정 매각가 범위",
};

const SALE_LABELS: Record<string, string> = {
  buyerInterest: "인수기업 관심 요소",
  expectedSynergy: "인수 후 기대 시너지",
  marketEntry: "시장 진입 효과",
  customerBase: "고객 기반 확보 효과",
  techFacility: "기술·생산시설 확보 효과",
  competitorShare: "경쟁사 제거·점유율 효과",
  realEstateValue: "부동산 및 자산 가치",
  successionIssue: "후계·승계 이슈",
  improvementPotential: "인수 후 개선 가능 요소",
};

export default async function JinwoongCompanyPage() {
  const project = await getJinwoongCompanyProfile();
  const profile = project.companyProfile;
  const basic = asRecord(profile?.basicInfo);
  const business = asRecord(profile?.businessAnalysis);
  const financial = asRecord(profile?.financialAnalysis);
  const sale = asRecord(profile?.salePoints);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-[#0b1f3a]">진웅산업 분석</h1>
        <p className="mt-1 text-sm text-slate-600">
          기본 기업정보 · 사업 분석 · 재무 분석 · 매각 포인트를 한 화면에서
          확인합니다. (1차 MVP는 조회 중심, 수정 API는 다음 단계)
        </p>
      </header>

      <SectionCard title="4.1 기본 기업정보">
        <InfoGrid items={toItems(basic, BASIC_LABELS)} />
      </SectionCard>

      <SectionCard title="4.2 사업 분석">
        <InfoGrid items={toItems(business, BUSINESS_LABELS)} />
      </SectionCard>

      <SectionCard title="4.3 재무 분석">
        <InfoGrid items={toItems(financial, FINANCIAL_LABELS)} />
      </SectionCard>

      <SectionCard title="4.4 매각 포인트">
        <InfoGrid items={toItems(sale, SALE_LABELS)} />
      </SectionCard>
    </div>
  );
}
