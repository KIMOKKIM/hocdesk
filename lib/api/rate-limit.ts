import { RateLimitError } from "@/lib/api/errors";

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

const LIMITS: Record<string, { max: number; windowMs: number }> = {
  "collection:POST": { max: 5, windowMs: 60_000 },
  "outreach-send:POST": { max: 10, windowMs: 60_000 },
};

function getClientKey(request: Request, namespace: string): string {
  const forwarded = request.headers.get("x-forwarded-for");
  const ip = forwarded?.split(",")[0]?.trim() ?? "unknown";
  return `${namespace}:${ip}`;
}

export function checkRateLimit(request: Request, namespace: keyof typeof LIMITS): void {
  const config = LIMITS[namespace];
  if (!config) return;

  const key = getClientKey(request, namespace);
  const now = Date.now();
  const existing = buckets.get(key);

  if (!existing || now >= existing.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + config.windowMs });
    return;
  }

  if (existing.count >= config.max) {
    throw new RateLimitError();
  }

  existing.count += 1;
}
