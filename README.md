# TargetBridge AI

기업 영업 자동화 및 M&A 타깃 관리 플랫폼입니다. 매각 프로젝트 관리, 타깃 업체 등급화, AI 신규 제안, 이메일 아웃리치 워크플로를 통합하는 B2B 업무 화면을 제공합니다.

**운영 기본 주소:** `https://hocdesk.pe.kr/Jinwoong`

> Vercel 배포 가이드: [DEPLOYMENT-VERCEL.md](./DEPLOYMENT-VERCEL.md)

## 기술 스택

- Next.js 16 (App Router)
- TypeScript (strict mode)
- Tailwind CSS v4
- shadcn/ui
- Prisma ORM + SQLite
- ESLint

## 사전 요구사항

- Node.js 20+
- npm 10+
- Windows PowerShell (또는 macOS/Linux 터미널)

Docker, WSL, PostgreSQL은 **필요하지 않습니다.**

## 로컬 실행

```powershell
npm install
copy .env.example .env
npm run setup
npm run dev
```

또는 단계별:

```powershell
npm install
npx prisma generate
npx prisma db push
npx prisma db seed
npm run dev
```

접속 주소:

- 랜딩: [http://localhost:3000/Jinwoong](http://localhost:3000/Jinwoong)
- 대시보드: [http://localhost:3000/Jinwoong/dashboard](http://localhost:3000/Jinwoong/dashboard)

DB 확인:

```powershell
npm run db:studio
```

> `basePath`가 `/Jinwoong`으로 설정되어 있어 모든 경로는 `/Jinwoong` 하위에서 동작합니다.

## 빌드 및 운영 실행

```powershell
npm run lint
npm run build
npm run start
```

## 배포 설정

`next.config.ts`에 `basePath: "/Jinwoong"`가 고정 적용되어 있습니다.

- 내부 이동: `next/link` 사용 (basePath 자동 처리)
- API 호출: 클라이언트에서 `lib/paths.ts`의 `withBasePath()` 사용
- 정적 자산: Next.js가 basePath를 자동 반영

운영 서버에서도 SQLite 파일(`DATABASE_URL="file:./dev.db"`)을 사용합니다. 자세한 내용은 `DEPLOYMENT.md`를 참고하세요.

## 프로젝트 구조

```
app/
  (app)/              # 공통 사이드바 레이아웃 페이지
    dashboard/
    projects/
    targets/
    activities/
    proposals/
    outreach/
    settings/
  api/health/         # 헬스체크 API
components/
  layout/             # 사이드바, 헤더, 셸
  ui/                 # shadcn/ui 컴포넌트
lib/
  config.ts           # 앱 설정 상수
  paths.ts            # basePath 헬퍼
  prisma.ts           # Prisma 클라이언트
prisma/
  schema.prisma       # DB 스키마
  seed.ts             # 데모 데이터
dev.db                # SQLite 개발 DB (gitignore)
```

## 현재 구현 범위

- [x] 랜딩 페이지 및 업무 대시보드 UI
- [x] 공통 레이아웃 (사이드바, 헤더)
- [x] Prisma 스키마 및 SQLite 개발 DB
- [x] 데모 타깃 수집·아웃리치 MVP
- [ ] 인증/권한
- [ ] 실제 웹 수집
- [ ] AI API 연동
- [ ] 실제 이메일 발송

## 라이선스

Private
