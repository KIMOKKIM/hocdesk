export const dashboardStats = [
  { label: "전체 타깃 업체", value: 128, change: "+12 이번 주" },
  { label: "A등급 업체", value: 24, change: "우선 접촉 8건" },
  { label: "검토 대기", value: 17, change: "담당자 배정 필요 3건" },
  { label: "이메일 초안", value: 9, change: "검토 요청 4건" },
  { label: "승인 대기", value: 5, change: "팀장 승인 대기" },
  { label: "발송 완료", value: 42, change: "이번 달 누적" },
  { label: "신규 타깃 제안", value: 11, change: "AI 자동 제안 6건" },
];

export const recentActivities = [
  {
    id: "1",
    time: "09:42",
    title: "A등급 타깃 '한국정밀기계' 이메일 초안 생성",
    type: "이메일",
  },
  {
    id: "2",
    time: "09:15",
    title: "프로젝트 '제조업 2차 전략' 타깃 5건 추가 검토",
    type: "검토",
  },
  {
    id: "3",
    time: "08:50",
    title: "신규 타깃 제안 '대한소재' 승인 완료",
    type: "승인",
  },
  {
    id: "4",
    time: "어제 17:30",
    title: "이메일 '글로벌케미칼 인수 제안' 발송 완료",
    type: "발송",
  },
  {
    id: "5",
    time: "어제 16:10",
    title: "일일 활동 보고서 자동 생성",
    type: "활동",
  },
];

export const projects = [
  {
    id: "p1",
    name: "제조업 2차 전략 매각",
    industry: "정밀기계·부품",
    status: "진행중",
    targetCount: 34,
    updatedAt: "2026-06-24",
  },
  {
    id: "p2",
    name: "헬스케어 플랫폼 Exit",
    industry: "디지털헬스",
    status: "검토중",
    targetCount: 18,
    updatedAt: "2026-06-23",
  },
  {
    id: "p3",
    name: "물류 IT 솔루션 매각",
    industry: "물류·SCM",
    status: "준비중",
    targetCount: 0,
    updatedAt: "2026-06-20",
  },
];

export const targets = [
  {
    id: "t1",
    name: "한국정밀기계",
    grade: "A",
    industry: "정밀기계",
    status: "이메일 초안",
    revenue: "120억",
  },
  {
    id: "t2",
    name: "글로벌케미칼",
    grade: "A",
    industry: "화학",
    status: "발송 완료",
    revenue: "450억",
  },
  {
    id: "t3",
    name: "대한소재",
    grade: "B",
    industry: "소재",
    status: "검토 대기",
    revenue: "85억",
  },
  {
    id: "t4",
    name: "스마트물류",
    grade: "B",
    industry: "물류",
    status: "신규 제안",
    revenue: "62억",
  },
];

export const activities = [
  {
    id: "a1",
    date: "2026-06-24",
    summary: "A등급 타깃 3건 접촉, 이메일 초안 2건 작성",
    author: "김영업",
    project: "제조업 2차 전략 매각",
  },
  {
    id: "a2",
    date: "2026-06-23",
    summary: "신규 타깃 5건 AI 제안 검토, 승인 2건",
    author: "이기획",
    project: "헬스케어 플랫폼 Exit",
  },
  {
    id: "a3",
    date: "2026-06-22",
    summary: "주간 타깃 리스트 업데이트 및 등급 재분류",
    author: "김영업",
    project: "제조업 2차 전략 매각",
  },
];

export const outreachEmails = [
  {
    id: "e1",
    subject: "[비공개] 정밀기계 업체 인수·매각 기회 안내",
    target: "한국정밀기계",
    status: "초안",
    updatedAt: "2026-06-24 09:42",
  },
  {
    id: "e2",
    subject: "전략적 파트너십 및 M&A 가능성 논의 요청",
    target: "글로벌케미칼",
    status: "발송 완료",
    updatedAt: "2026-06-23 17:30",
  },
  {
    id: "e3",
    subject: "기업 가치 제고 및 Exit 전략 컨설팅 제안",
    target: "대한소재",
    status: "승인 대기",
    updatedAt: "2026-06-24 08:15",
  },
];

export const proposals = [
  {
    id: "pr1",
    name: "대한소재",
    industry: "소재",
    score: 87,
    reason: "매각 프로젝트 산업군 및 매출 규모 일치",
    status: "검토 대기",
  },
  {
    id: "pr2",
    name: "스마트물류",
    industry: "물류",
    score: 82,
    reason: "최근 M&A 활동 및 재무 안정성 우수",
    status: "승인됨",
  },
  {
    id: "pr3",
    name: "바이오텍솔루션",
    industry: "바이오",
    score: 79,
    reason: "헬스케어 프로젝트 타깃 프로필 부합",
    status: "검토 대기",
  },
];

export const projectOptions = projects.map((project) => ({
  value: project.id,
  label: project.name,
}));
