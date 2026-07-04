/**
 * BASE_URL=http://localhost:3000/Jinwoong npx tsx scripts/verify-deployment.ts
 */
const BASE = process.env.BASE_URL ?? "http://localhost:3000/Jinwoong";

async function main() {
  console.log(`Verify deployment: ${BASE}`);

  const healthRes = await fetch(`${BASE}/api/health`);
  const health = await healthRes.json();
  console.log("Health:", health);

  if (health.basePath !== "/Jinwoong") {
    throw new Error(`basePath mismatch: ${health.basePath}`);
  }

  const htmlRes = await fetch(`${BASE}`);
  const html = await htmlRes.text();
  const assetMatch = html.match(/\/Jinwoong\/_next\/static\/[^"]+/);
  console.log("Landing asset:", assetMatch?.[0] ?? "(none — dev mode may differ)");

  console.log("✓ verify-deployment passed");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
