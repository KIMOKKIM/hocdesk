# TargetBridge AI — 레거시 VPS 배포 가이드 (Deprecated)

> **현재 운영 배포는 Vercel + Turso를 사용합니다.**  
> 최신 가이드: **[DEPLOYMENT-VERCEL.md](./DEPLOYMENT-VERCEL.md)**
>
> - 운영 URL: **https://hocdesk.pe.kr/Jinwoong**
> - basePath: **`/Jinwoong`**
> - 이 문서의 `teomokdesk.pe.kr/targetbridge` 안내는 **구버전**입니다.

---

## 구버전 참고 (자체 서버 + Nginx)

과거에는 teomokdesk.pe.kr 서브경로 `/targetbridge`로 Nginx reverse proxy 배포를 사용했습니다.  
신규 배포·운영에는 **DEPLOYMENT-VERCEL.md**를 따르세요.

`deploy/nginx-targetbridge.conf`, `deploy/deploy.sh` 등은 Vercel 배포에서 **사용하지 않습니다.**

---

## 환경변수 (구버전 → 현재)

| 항목 | 구버전 | 현재 (Vercel/로컬) |
|------|--------|-------------------|
| APP_URL | `https://teomokdesk.pe.kr/targetbridge` | `https://hocdesk.pe.kr/Jinwoong` |
| NEXT_PUBLIC_BASE_PATH | `/targetbridge` | `/Jinwoong` |
| DB (로컬) | SQLite `file:./dev.db` | 동일 |
| DB (운영) | SQLite 파일 | Turso/libSQL (`DATABASE_PROVIDER=turso`) |

자세한 설정은 `.env.example` 및 `DEPLOYMENT-VERCEL.md`를 참고하세요.
