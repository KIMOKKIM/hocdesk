# TargetBridge AI — Vercel 배포 가이드

운영 URL: **https://hocdesk.pe.kr/Jinwoong**

로컬 URL: **http://localhost:3000/Jinwoong**

> 이전 운영 주소 `https://teomokdesk.pe.kr/targetbridge`는 더 이상 사용하지 않습니다.
> `/targetbridge` 접속 시 middleware가 `/Jinwoong`으로 redirect합니다.

---

## 1. DB 구조

| 환경 | Provider | 설정 |
|------|----------|------|
| 로컬 개발 | `sqlite` | `DATABASE_URL=file:./dev.db` |
| Vercel 운영 | `turso` | `TURSO_DATABASE_URL` + `TURSO_AUTH_TOKEN` |

- Prisma schema provider는 `sqlite` 유지 (Turso/libSQL 호환)
- Vercel에서 `dev.db` 파일을 생성·수정하지 않음
- production + `DATABASE_PROVIDER=sqlite` → `/api/health`가 `503 invalid-production-provider` 반환

---

## 2. Vercel 환경변수 (운영, 필수)

Vercel Dashboard → Project → Settings → Environment Variables

| 변수 | 값 | 비고 |
|------|-----|------|
| `APP_URL` | `https://hocdesk.pe.kr/Jinwoong` | 운영 canonical URL |
| `NEXT_PUBLIC_BASE_PATH` | `/Jinwoong` | basePath (대소문자 유지) |
| `DATABASE_PROVIDER` | `turso` | 운영 필수 |
| `TURSO_DATABASE_URL` | *(Turso libsql URL)* | 비밀 |
| `TURSO_AUTH_TOKEN` | *(Turso auth token)* | 비밀 |
| `ADMIN_ACCESS_KEY` | *(강력한 랜덤 문자열)* | 쓰기 API·로그인 |
| `TARGET_SEARCH_PROVIDER` | `kakao` | Kakao 검색 |
| `KAKAO_REST_API_KEY` | *(Kakao REST API 키)* | 비밀 |
| `AI_PROVIDER` | `rules` | 규칙 기반 분석 |
| `EMAIL_PROVIDER` | `console` | 실발송 없음 |
| `INCLUDE_DEMO_DATA` | `false` | 운영 데모 데이터 제외 |
| `NODE_ENV` | `production` | Vercel 기본값 |

```
APP_URL=https://hocdesk.pe.kr/Jinwoong
NEXT_PUBLIC_BASE_PATH=/Jinwoong
DATABASE_PROVIDER=turso
TURSO_DATABASE_URL=
TURSO_AUTH_TOKEN=
ADMIN_ACCESS_KEY=
TARGET_SEARCH_PROVIDER=kakao
KAKAO_REST_API_KEY=
AI_PROVIDER=rules
EMAIL_PROVIDER=console
INCLUDE_DEMO_DATA=false
```

- `TURSO_*`, `ADMIN_ACCESS_KEY`, `KAKAO_REST_API_KEY`는 **런타임**에 검증됩니다. 빌드 단계에서 미설정이어도 `next build`는 통과합니다.
- 비밀키에 `NEXT_PUBLIC_` 접두사를 붙이지 마세요.
- `.env`, `dev.db`, 실제 키는 Git에 포함하지 마세요.

---

## 3. Turso 초기화

```bash
# schema push (dry-run)
npx tsx scripts/push-schema-to-turso.ts

# schema push (적용)
npx tsx scripts/push-schema-to-turso.ts --apply

# 최소 운영 seed (데모 제외)
npx tsx scripts/seed-turso.ts --apply

# 연결 테스트
npm run turso:test
```

키가 없으면 `turso:test`는 SKIP으로 종료합니다.

---

## 4. 관리자 보호

운영 환경에서 `ADMIN_ACCESS_KEY` 미설정 시 **쓰기 API가 비활성화**됩니다.

- 로그인: `/Jinwoong/login`
- HttpOnly 쿠키 세션 (Secure/SameSite=Lax)
- URL query/localStorage에 키 저장하지 않음

---

## 5. 도메인 시나리오

### 시나리오 A — hocdesk.pe.kr 전체가 TargetBridge

1. Vercel TargetBridge 프로젝트에 `hocdesk.pe.kr` 도메인 연결
2. DNS 설정
3. 도메인 루트(`/`) 접속 시 middleware가 `/Jinwoong`으로 1회 redirect (raw URL 기준, 루프 없음)
4. 최종 접속: `https://hocdesk.pe.kr/Jinwoong`

### 시나리오 B — hocdesk.pe.kr에 기존 서비스가 있는 경우

1. TargetBridge AI를 **별도 Vercel 프로젝트**로 배포
2. 기존 루트 프로젝트의 `vercel.json`에 rewrite 추가 (배포 URL 확정 후):

```json
{
  "rewrites": [
    {
      "source": "/Jinwoong/:path*",
      "destination": "https://<targetbridge-vercel-url>/Jinwoong/:path*"
    }
  ]
}
```

- 동일 도메인을 두 프로젝트에 중복 연결하지 않음
- 재귀 rewrite가 발생하지 않도록 destination은 TargetBridge 전용 URL 사용

---

## 6. 로컬 개발

```bash
cp .env.example .env
npm install
npm run db:push
npm run db:seed
npm run dev
```

접속: http://localhost:3000/Jinwoong

---

## 7. 빌드 검증

```bash
npm run lint
npm run build
npm run check:secrets
BASE_URL=http://localhost:3000/Jinwoong npm run verify:deployment
```

---

## 8. Vercel에서 사용자가 설정할 항목

1. Git 연결 및 Deploy
2. 환경변수 (섹션 2)
3. Turso DB 생성 및 schema/seed
4. `ADMIN_ACCESS_KEY` 설정
5. 도메인 시나리오 A 또는 B 선택
6. (선택) Kakao API 키 설정 후 Settings 연결 테스트

---

## 9. 제한

- Cron 자동 활성화 없음
- Gmail 실발송 미구현 (`EMAIL_PROVIDER=console`)
- Turso 실연결은 키 설정 후에만 검증 가능
- 실제 Vercel 배포 성공 여부는 배포 후 URL로 확인 필요
