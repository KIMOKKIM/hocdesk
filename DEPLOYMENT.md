# TargetBridge AI 배포 가이드

운영 URL: **https://teomokdesk.pe.kr/targetbridge**

> teomokdesk.pe.kr 루트(`/`)의 기존 서비스는 변경하지 않습니다.  
> TargetBridge AI만 `/targetbridge` 서브경로로 추가합니다.

---

## 배포 방식

**권장: 기존 서버에서 Next.js 직접 실행 + Nginx reverse proxy**

- SQLite 파일 DB — Docker/PostgreSQL 불필요
- PM2/systemd로 상시 실행
- Nginx `location /targetbridge` 추가만으로 기존 서비스 유지

Vercel 대안은 `vercel.json` 및 하단 B안 참고.

---

## 1. 사전조건

- Node.js **20 LTS** 이상
- Nginx (teomokdesk.pe.kr 기존 설정 유지)
- PM2 또는 systemd
- Git, `npm ci` 가능한 빌드 환경
- SSL 인증서 (기존 teomokdesk.pe.kr 인증서 재사용)

---

## 2. 환경변수

`.env.example`을 복사해 `.env` 생성 (**Git에 커밋 금지**):

```bash
cp .env.example .env
```

| 변수 | 설명 | 운영 예시 |
|------|------|-----------|
| `DATABASE_URL` | SQLite 파일 경로 | `file:./data/targetbridge.db` |
| `NEXT_PUBLIC_BASE_PATH` | Next.js basePath | `/targetbridge` |
| `AI_PROVIDER` | `rules` \| `openai` | `rules` |
| `OPENAI_API_KEY` | OpenAI 키 (선택) | *(비워두면 rules)* |
| `TARGET_SEARCH_PROVIDER` | `demo` \| `web` \| `public` | `demo` |
| `EMAIL_PROVIDER` | `console` \| `gmail-*` | `console` |
| `APP_URL` | 공개 URL | `https://teomokdesk.pe.kr/targetbridge` |
| `ADMIN_EMAIL` | 관리자 이메일 (향후 알림) | `admin@example.com` |
| `CRON_SECRET` | 관리 API·Cron Bearer 토큰 | `openssl rand -hex 32` |
| `ENCRYPTION_KEY` | 향후 민감 데이터 암호화 | `openssl rand -hex 32` |

운영 서버에서는 SQLite DB 파일이 있는 디렉터리에 쓰기 권한이 있어야 합니다.

---

## 3. DB 준비 (SQLite)

로컬·운영 모두 SQLite + `prisma db push`를 사용합니다.

```bash
npm run setup
# 또는
npx prisma generate
npx prisma db push
npx prisma db seed   # 초기 데모 데이터 (선택)
```

- `prisma migrate dev` / shadow database는 사용하지 않습니다.
- 과거 PostgreSQL migration은 `archive/postgres-migrations/`에 보관되어 있습니다.
- `prisma db push --force-reset`, `migrate reset`은 **운영에서 사용 금지**입니다.
- 운영 seed는 `npm run db:seed:prod` (명시 플래그 필요, 기본 차단).

---

## 4. 빌드

```bash
npm ci
npx prisma generate
npm run build
```

---

## 5. 실행 (PM2)

```bash
mkdir -p logs
pm2 startOrReload deploy/ecosystem.config.cjs --update-env
pm2 save
```

포트 **3001**에서 실행 (teomokdesk 기존 서비스와 충돌 방지).

### systemd 대안

```bash
sudo cp deploy/targetbridge.service.example /etc/systemd/system/targetbridge.service
# WorkingDirectory, User, EnvironmentFile 수정
sudo systemctl daemon-reload
sudo systemctl enable --now targetbridge
```

---

## 6. Nginx 설정

```bash
sudo cp deploy/nginx-targetbridge.conf /etc/nginx/snippets/targetbridge.conf
```

기존 `teomokdesk.pe.kr` server 블록 **안에** 추가:

```nginx
server {
    listen 443 ssl;
    server_name teomokdesk.pe.kr;

    # ... 기존 location / { ... } 유지 ...

    include snippets/targetbridge.conf;
}
```

적용:

```bash
sudo nginx -t
sudo systemctl reload nginx
```

---

## 7. health check

```bash
curl -s https://teomokdesk.pe.kr/targetbridge/api/health | jq
```

응답 예:

```json
{
  "status": "ok",
  "database": "connected",
  "appVersion": "0.1.0",
  "timestamp": "2026-06-24T12:00:00.000Z"
}
```

`database: "error"` 시 `DATABASE_URL`, SQLite 파일 경로·권한을 확인하세요.

---

## 8. 롤백

```bash
./deploy/rollback.sh HEAD~1
```

- 애플리케이션 코드만 이전 커밋으로 복구합니다.
- SQLite DB 파일은 별도 백업·복원 절차를 따릅니다.

---

## 9. 장애 확인

| 즹상 | 확인 |
|------|------|
| 502 Bad Gateway | PM2/systemd 프로세스, 포트 3001 |
| 404 on refresh | Nginx `proxy_pass` URI, `NEXT_PUBLIC_BASE_PATH` |
| 정적 자산 404 | `/targetbridge/_next/` location |
| API 401 | `APP_URL`과 실제 접속 URL 불일치 |
| DB degraded | `DATABASE_URL`, SQLite 파일 존재·쓰기 권한 |

---

## 10. 원클릭 배포

```bash
cd /var/www/targetbridge-ai
git pull
chmod +x deploy/deploy.sh deploy/rollback.sh
./deploy/deploy.sh
```

`deploy.sh`는 `prisma db push`로 스키마를 동기화합니다 (비파괴). seed는 자동 실행하지 않습니다.

---

## B안: Vercel (대안)

환경변수에 `DATABASE_URL=file:./dev.db` 대신 Vercel이 지원하는 SQLite/외부 DB 전략이 필요합니다.  
상시 실행·파일 DB가 필요하면 A안(자체 서버)을 권장합니다.

---

## 로컬 production 검증

```powershell
npm run setup
npm run build
npm run start:prod
$env:BASE_URL="http://localhost:3001/targetbridge"
npm run verify:deployment
```
