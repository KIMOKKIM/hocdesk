#!/usr/bin/env bash
# TargetBridge AI 배포 스크립트 (A안: 자체 서버)
# 사용: ./deploy/deploy.sh
# 주의: db push만 실행하며 reset/seed는 실행하지 않습니다.

set -euo pipefail

APP_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$APP_DIR"

RELEASE_TAG="${RELEASE_TAG:-$(date +%Y%m%d-%H%M%S)}"
echo "==> TargetBridge AI deploy ${RELEASE_TAG}"

if [[ ! -f .env ]]; then
  echo "ERROR: .env 파일이 없습니다. .env.example을 참고해 생성하세요."
  exit 1
fi

echo "==> Install dependencies"
npm ci

echo "==> Prisma generate"
npx prisma generate

echo "==> DB schema sync (SQLite db push)"
npx prisma db push

echo "==> Build"
npm run build

echo "==> PM2 restart"
mkdir -p logs
pm2 startOrReload deploy/ecosystem.config.cjs --update-env

echo "==> Health check"
sleep 3
curl -fsS "http://127.0.0.1:3001/targetbridge/api/health" | tee /tmp/targetbridge-health.json

echo "==> Deploy complete: ${RELEASE_TAG}"
echo "    Public URL: https://teomokdesk.pe.kr/targetbridge/api/health"
