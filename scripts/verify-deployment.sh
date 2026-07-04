#!/usr/bin/env bash
set -euo pipefail
BASE="${BASE_URL:-http://localhost:3000/Jinwoong}"
echo "Verify deployment: ${BASE}"
curl -fsS "${BASE}/api/health" | tee /tmp/targetbridge-health.json
echo
curl -fsS "${BASE}" >/tmp/targetbridge-home.html
asset=$(grep -o '/Jinwoong/_next/static/[^"]*' /tmp/targetbridge-home.html | head -1 || true)
echo "Landing asset: ${asset:-none}"
echo "✓ verify-deployment passed"
