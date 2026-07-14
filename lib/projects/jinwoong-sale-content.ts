/** 진웅산업 매각 프로젝트 핵심 안내 (외부 제안서/이메일에는 민감 사유 미포함) */
export const JINWOONG_SALE_HIGHLIGHTS = [
  "기존 염료산업은 사양산업으로 판단합니다.",
  "신규사업 목적 매수자 타깃팅이 필요합니다.",
  "최종 매각 희망금액은 53억원입니다.",
  "기존 공장·설비는 철거 또는 별도 활용 대상으로 검토합니다.",
  "금융 손실비용 등 민감한 내부 사유는 외부 제안서·이메일에 노출하지 않습니다.",
  "공업사·폐차장 등 관심 사례가 있었으나 가격 차이로 불발된 이력이 있습니다.",
] as const;

export const KAKAO_PERMISSION_CHECKLIST = [
  "Kakao Developers → 내 애플리케이션 → 앱 키에서 REST API 키를 복사했는지 확인",
  "JavaScript 키, Native 앱 키, Admin 키를 넣지 않았는지 확인",
  "Vercel Environment Variables의 Production에 KAKAO_REST_API_KEY를 넣었는지 확인",
  "값 앞뒤에 공백이나 따옴표가 들어가지 않았는지 확인",
  "저장 후 Redeploy했는지 확인",
  "Kakao Local API 요청 URL이 dapi.kakao.com/v2/local/search/keyword.json인지 확인",
  "Authorization 헤더가 KakaoAK 형식인지 확인",
  "Kakao Developers 앱에서 카카오맵/로컬(OPEN_MAP_AND_LOCAL) 서비스가 활성화되어 있는지 확인",
] as const;

export const KAKAO_LOCAL_ENDPOINT =
  "https://dapi.kakao.com/v2/local/search/keyword.json";
