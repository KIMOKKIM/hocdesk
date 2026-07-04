#!/usr/bin/env bash
# TargetBridge AI 롤백 스크립트
# 사용: ./deploy/rollback.sh <git-ref>
# 예:   ./deploy/rollback.sh HEAD~1

set -euo pipefail

APP_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$APP_DIR"

GIT_REF="${1:-}"
if [[ -z "$GIT_REF" ]]; then
  echo "Usage: $0 <git-ref>"
  exit 1
fi

echo "==> Rollback to ${GIT_REF}"
git fetch --all
git checkout "$GIT_REF"

npm ci
npx prisma generate
npx prisma migrate deploy
npm run build

mkdir -p logs
pm2 startOrReload deploy/ecosystem.config.cjs --update-env

sleep 3
curl -fsS "http://127.0.0.1:3001/targetbridge/api/health"

echo "==> Rollback complete (DB schema는 migrate deploy 상태 유지 — down migration 없음)"
