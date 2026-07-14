import { requireAdmin } from "@/lib/api/auth";
import { jsonError, jsonOk } from "@/lib/api/response";
import { getRecentSearchKeywordWarnings } from "@/lib/collection/search-keyword-warnings";
import { z } from "zod";

const schema = z.object({
  queries: z.array(z.string()).min(1).max(50),
});

export async function POST(request: Request) {
  try {
    await requireAdmin(request);
    const body = schema.parse(await request.json());
    const warnings = await getRecentSearchKeywordWarnings(body.queries);
    return jsonOk({ warnings });
  } catch (error) {
    return jsonError(error);
  }
}
