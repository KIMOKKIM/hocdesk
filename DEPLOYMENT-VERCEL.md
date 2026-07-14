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
| `ADMIN_USERNAME` | `<관리자 아이디>` | 로그인 ID |
| `ADMIN_PASSWORD` | `<관리자 비밀번호>` | 로그인 PW (`$` 포함 시 로컬 `.env`는 따옴표로 감쌈) |
| `SESSION_SECRET` | *(긴 랜덤 문자열)* | 세션 HMAC 서명 |
| `TARGET_SEARCH_PROVIDER` | `kakao` | Kakao 검색 |
| `KAKAO_REST_API_KEY` | *(Kakao REST API 키)* | 비밀. **Production**에 설정 후 Redeploy |

> Kakao 키 관련 주의
> - 변수명은 반드시 `KAKAO_REST_API_KEY`입니다. (`KAKAO_API_KEY`, `NEXT_PUBLIC_KAKAO_*` 사용 금지)
> - Preview에만 넣으면 운영(`hocdesk.pe.kr`)에서 `apiKeyPresent: false`로 보입니다.
> - 저장 후 **Redeploy**가 필요합니다.
> - Settings(`/Jinwoong/settings`)와 `/Jinwoong/api/collection/providers/status`에서 설정 여부만 확인합니다. 키 원문은 절대 표시되지 않습니다.
| `AI_PROVIDER` | `rules` | 규칙 기반 분석 |
| `EMAIL_PROVIDER` | `console` | 실발송 없음 |
| `INCLUDE_DEMO_DATA` | `false` | 운영 데모 데이터 제외 |
| `ALLOW_DEMO_PROVIDER_IN_PRODUCTION` | `false` | 운영에서 데모 검색 차단 |
| `NODE_ENV` | `production` | Vercel 기본값 |

```
APP_URL=https://hocdesk.pe.kr/Jinwoong
NEXT_PUBLIC_BASE_PATH=/Jinwoong
DATABASE_PROVIDER=turso
TURSO_DATABASE_URL=
TURSO_AUTH_TOKEN=
ADMIN_USERNAME=
ADMIN_PASSWORD=
SESSION_SECRET=
TARGET_SEARCH_PROVIDER=kakao
KAKAO_REST_API_KEY=
AI_PROVIDER=rules
EMAIL_PROVIDER=console
INCLUDE_DEMO_DATA=false
ALLOW_DEMO_PROVIDER_IN_PRODUCTION=false
```

### Kakao REST API 키 설정 절차

1. [Kakao Developers](https://developers.kakao.com/)에서 애플리케이션의 **REST API 키**를 복사합니다.
2. Vercel Dashboard → **hocdesk** 프로젝트 → **Settings** → **Environment Variables**
3. 다음을 **Production**에 추가합니다.

```
TARGET_SEARCH_PROVIDER=kakao
KAKAO_REST_API_KEY=<카카오 REST API 키>
```

4. 저장 후 **Redeploy**합니다.
5. 확인:
   - https://hocdesk.pe.kr/Jinwoong/settings → “Kakao API 키 설정됨”
   - https://hocdesk.pe.kr/Jinwoong/api/collection/providers/status → `apiKeyPresent: true`

주의:
- Production 환경에 추가해야 합니다.
- Preview에만 추가하면 운영 사이트에서 인식되지 않습니다.
- `NEXT_PUBLIC_` 접두사를 붙이면 안 됩니다 (클라이언트 노출 위험).
- API 키 원문은 화면에 표시되지 않습니다 (마스킹 `****abcd`만 표시).
- Vercel 값에는 **따옴표 없이** 순수 REST API 키만 입력하세요.
- JavaScript 키 / Native 앱 키 / Admin 키는 사용하지 마세요.
- Kakao Developers 앱에서 **카카오맵/로컬(OPEN_MAP_AND_LOCAL)** 서비스를 활성화해야 합니다.
  비활성 시 Settings 연결 테스트가 `PERMISSION_DENIED` / `LOCAL_API_NOT_ALLOWED`로 실패합니다.

로컬 재현 (키는 직접 넣지 않음):

```bash
curl -H "Authorization: KakaoAK <REST_API_KEY>" \
  "https://dapi.kakao.com/v2/local/search/keyword.json?query=%EC%96%91%EC%A3%BC%20%ED%8F%90%EC%B0%A8%EC%9E%A5"
```

- `TURSO_*`, `ADMIN_USERNAME`, `ADMIN_PASSWORD`, `SESSION_SECRET`, `KAKAO_REST_API_KEY`는 **런타임**에 검증됩니다. 빌드 단계에서 미설정이어도 `next build`는 통과합니다.
- 비밀키에 `NEXT_PUBLIC_` 접두사를 붙이지 마세요.
- `.env`, `dev.db`, 실제 키는 Git에 포함하지 마세요.
- `ADMIN_ACCESS_KEY`는 **deprecated**입니다. 로그인 UI에서는 사용하지 않습니다. (선택) 자동화 Bearer용으로만 남을 수 있습니다.
- Vercel Environment Variables UI에서는 비밀번호 값을 따옴표·백슬래시 없이 그대로 입력합니다.
- 로컬 `.env`에서 비밀번호에 `$`가 포함되면 Next.js 환경변수 확장을 피하기 위해 각 `$`를 `\$`로 이스케이프하세요.
  예: `ADMIN_PASSWORD="prefix\$\$suffix"`

---

## 3. 운영 DB 최초 초기화 (Turso)

Vercel 배포 후 `/api/health`가 `setup_required`이면 아래 중 하나를 따릅니다.

### 3-A. 대시보드에서 초기화 (권장)

1. `https://hocdesk.pe.kr/Jinwoong/login` 에서 관리자 ID/PW로 로그인
2. 대시보드의 **운영 DB 초기화 실행** 버튼 클릭
3. 확인 체크 후 초기화 실행
4. `/api/health`가 `status: "ok"`인지 확인

### 3-B. 로컬 CLI

로컬 `.env`의 Turso URL/토큰이 **Vercel과 동일한 DB**를 가리켜야 합니다.

```bash
npm run turso:test
npm run turso:schema:apply
npm run turso:seed:apply
npm run turso:check
```

한 번에 실행:

```bash
npm run turso:setup
```

### 확인

```
https://hocdesk.pe.kr/Jinwoong/api/health
https://hocdesk.pe.kr/Jinwoong/projects
https://hocdesk.pe.kr/Jinwoong/dashboard
```

`/api/health` 기대값 (준비 완료):

```json
{
  "status": "ok",
  "database": "connected",
  "schemaReady": true,
  "seedReady": true,
  "checks": { "jinwoongProject": true }
}
```

### 주의

- Turso seed는 **반복 실행 가능** (upsert, 중복 생성 없음)
- 데모 업체는 운영 기본 seed에 넣지 않음
- 비밀키는 Git에 커밋하지 않음
- 초기화 API(`POST /api/admin/turso/setup`)는 로그인한 관리자만 실행 가능

---

## 4. Turso 스크립트 요약

| 명령 | 설명 |
|------|------|
| `npm run turso:test` | 연결 + readiness + row count |
| `npm run turso:schema` | schema dry-run |
| `npm run turso:schema:apply` | schema 적용 (idempotent DDL) |
| `npm run turso:seed` | seed dry-run |
| `npm run turso:seed:apply` | 진웅산업 + AppSetting seed |
| `npm run turso:check` | 테이블/seed 점검 |
| `npm run turso:setup` | schema + seed + check 일괄 |

키가 없으면 `turso:test` / `turso:check`는 SKIP으로 종료합니다.

---

## 5. 관리자 보호

운영 환경에서 `ADMIN_USERNAME` / `ADMIN_PASSWORD` / `SESSION_SECRET` 미설정 시 **로그인·쓰기 API가 비활성화**됩니다.

- 로그인: `/Jinwoong/login` (아이디/비밀번호)
- 쿠키: `tb_admin_session` (HttpOnly, Secure in production, SameSite=Lax, 8시간)
- URL query/localStorage에 비밀번호 저장하지 않음
- 로그아웃: 상단 사용자 메뉴 → 로그아웃

---

## 6. 도메인 시나리오

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

## 7. 로컬 개발

```bash
cp .env.example .env
# ADMIN_USERNAME / ADMIN_PASSWORD / SESSION_SECRET 설정
npm install
npm run db:push
npm run db:seed
npm run dev
```

접속: http://localhost:3000/Jinwoong

---

## 8. 빌드 검증

```bash
npm run lint
npm run build
npm run check:secrets
BASE_URL=http://localhost:3000/Jinwoong npm run verify:deployment
```

---

## 9. Vercel에서 사용자가 설정할 항목

1. Git 연결 및 Deploy
2. 환경변수 (섹션 2) — 특히 `ADMIN_USERNAME`, `ADMIN_PASSWORD`, `SESSION_SECRET`
3. Turso DB 생성 후 대시보드 초기화 또는 `turso:setup`
4. 도메인 시나리오 A 또는 B 선택
5. (선택) Kakao API 키 설정 후 Settings 연결 테스트

---

## 10. 제한

- Cron 자동 활성화 없음
- Gmail 실발송 미구현 (`EMAIL_PROVIDER=console`)
- Turso 실연결은 키 설정 후에만 검증 가능
- 실제 Vercel 배포 성공 여부는 배포 후 URL로 확인 필요
- **타깃 수집:** `POST /collection/initial`은 job 생성 후 `after()`로 실행하고, UI는 2초 polling으로 진행상태를 표시한다. Vercel serverless 실행 시간 한도가 있으므로 `requestedCount`는 30 이하, `maxQueriesPerJob` 제한을 유지한다. 장기적으로는 전용 큐/백그라운드 워커가 필요하다.
