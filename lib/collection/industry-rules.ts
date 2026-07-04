export type IndustryRuleSet = {
  requiredKeywords: string[];
  optionalKeywords: string[];
  forbiddenKeywords: string[];
  categoryKeywords: string[];
  reviewKeywords: string[];
  minimumMatchScore: number;
};

export const INDUSTRY_RULES: Record<string, IndustryRuleSet> = {
  자동차해체재활용업: {
    requiredKeywords: ["폐차", "자동차해체", "해체"],
    optionalKeywords: ["재활용", "해체", "말소", "자동차"],
    forbiddenKeywords: ["세차", "렌터카", "주차장", "카센터"],
    categoryKeywords: ["폐차", "해체", "재활용", "자동차"],
    reviewKeywords: ["자원", "스크랩"],
    minimumMatchScore: 40,
  },
  폐차장: {
    requiredKeywords: ["폐차"],
    optionalKeywords: ["자동차해체", "재활용", "해체", "말소"],
    forbiddenKeywords: ["세차", "렌터카", "주차장", "카센터"],
    categoryKeywords: ["폐차", "해체", "자동차"],
    reviewKeywords: ["재활용"],
    minimumMatchScore: 40,
  },
  "대형차 정비업": {
    requiredKeywords: ["정비"],
    optionalKeywords: ["트럭", "대형차", "버스", "상용차", "건설기계", "자동차공업"],
    forbiddenKeywords: ["세차", "타이어", "주유소"],
    categoryKeywords: ["정비", "자동차", "트럭", "버스"],
    reviewKeywords: ["카센터", "공업"],
    minimumMatchScore: 40,
  },
  "건설기계 정비업": {
    requiredKeywords: ["정비", "건설기계", "중장비"],
    optionalKeywords: ["장비", "임대", "굴삭기", "크레인"],
    forbiddenKeywords: ["세차", "타이어", "주유소"],
    categoryKeywords: ["건설", "장비", "정비"],
    reviewKeywords: ["기계"],
    minimumMatchScore: 40,
  },
  "중고 상용차 매매업": {
    requiredKeywords: ["중고", "상용차"],
    optionalKeywords: ["트럭", "매매", "자동차", "판매"],
    forbiddenKeywords: ["세차", "렌터카"],
    categoryKeywords: ["중고", "자동차", "트럭"],
    reviewKeywords: ["매매", "수출"],
    minimumMatchScore: 40,
  },
  "중고차 수출업": {
    requiredKeywords: ["중고차", "수출"],
    optionalKeywords: ["자동차", "상용차", "트럭", "매매"],
    forbiddenKeywords: ["세차", "렌터카"],
    categoryKeywords: ["중고", "수출", "자동차"],
    reviewKeywords: ["매매"],
    minimumMatchScore: 40,
  },
  "고철·비철 재활용업": {
    requiredKeywords: ["고철", "비철", "재활용", "자원"],
    optionalKeywords: ["금속", "스크랩", "철", "비철금속"],
    forbiddenKeywords: ["세차", "주유소"],
    categoryKeywords: ["고철", "재활용", "금속", "자원"],
    reviewKeywords: ["폐기물"],
    minimumMatchScore: 40,
  },
  "산업폐기물 수집운반업": {
    requiredKeywords: ["폐기물", "수집", "운반"],
    optionalKeywords: ["재활용", "폐기", "산업"],
    forbiddenKeywords: ["세차", "주유소"],
    categoryKeywords: ["폐기물", "수집", "운반"],
    reviewKeywords: ["재활용"],
    minimumMatchScore: 40,
  },
  "건축자재 물류업": {
    requiredKeywords: ["물류", "창고", "건축자재"],
    optionalKeywords: ["보관", "유통", "자재", "3PL"],
    forbiddenKeywords: ["세차", "주유소"],
    categoryKeywords: ["물류", "창고", "유통"],
    reviewKeywords: ["건축"],
    minimumMatchScore: 40,
  },
  "중장비 임대업": {
    requiredKeywords: ["임대", "중장비", "건설기계"],
    optionalKeywords: ["장비", "굴삭기", "크레인"],
    forbiddenKeywords: ["세차", "주유소"],
    categoryKeywords: ["임대", "장비", "건설"],
    reviewKeywords: ["정비"],
    minimumMatchScore: 40,
  },
  "산업용 부동산 개발업": {
    requiredKeywords: ["부동산", "개발"],
    optionalKeywords: ["공장", "창고", "산업", "토지", "단지"],
    forbiddenKeywords: ["아파트", "오피스텔", "원룸", "주택"],
    categoryKeywords: ["부동산", "개발", "산업"],
    reviewKeywords: ["토지", "창고"],
    minimumMatchScore: 40,
  },
  "공장·창고 전문 중개업": {
    requiredKeywords: ["부동산", "공인중개"],
    optionalKeywords: ["공장", "창고", "산업", "토지", "중개"],
    forbiddenKeywords: ["아파트", "오피스텔", "원룸", "주택"],
    categoryKeywords: ["부동산", "중개", "공장", "창고"],
    reviewKeywords: ["토지"],
    minimumMatchScore: 40,
  },
};
