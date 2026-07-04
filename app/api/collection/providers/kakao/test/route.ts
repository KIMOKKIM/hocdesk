import { requireAdminAccess } from "@/lib/api/auth";
import { jsonError, jsonOk } from "@/lib/api/response";
import { runKakaoConnectionTest } from "@/lib/collection/kakao-connection-test";
import { z } from "zod";

const schema = z.object({
  query: z.string().min(1).max(100),
  segmentName: z.string().max(100).optional(),
});

export async function POST(request: Request) {
  try {
    requireAdminAccess(request);
    const body = schema.parse(await request.json().catch(() => ({})));
    const result = await runKakaoConnectionTest(body.query, body.segmentName ?? "폐차장");
    return jsonOk(result);
  } catch (error) {
    return jsonError(error);
  }
}
