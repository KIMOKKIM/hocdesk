import { requireAdmin } from "@/lib/api/auth";
import { jsonError, jsonOk } from "@/lib/api/response";
import {
  approveExpansionSuggestion,
} from "@/lib/expansion/expansion-service";
import { holdExpansionSuggestion } from "@/lib/db/expansion-suggestions";
import { z } from "zod";

const approveSuggestionSchema = z.object({
  keywords: z.array(z.string()).optional(),
  regions: z.array(z.string()).optional(),
  targetCount: z.number().int().positive().optional(),
  provider: z.enum(["demo", "kakao", "composite"]).optional(),
  action: z.enum(["approve", "hold"]).optional(),
});

type RouteParams = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: RouteParams) {
  try {
    await requireAdmin(request);
    const { id } = await params;
    const raw = await request.json().catch(() => ({}));
    const body = approveSuggestionSchema.parse(raw);

    if (body.action === "hold") {
      await holdExpansionSuggestion(id);
      return jsonOk({ status: "PENDING" });
    }

    const result = await approveExpansionSuggestion({
      suggestionId: id,
      keywords: body.keywords,
      regions: body.regions,
      targetCount: body.targetCount,
      provider: body.provider,
    });

    return jsonOk({
      suggestionId: result.suggestionId,
      jobId: result.jobId,
      result: result.result,
    });
  } catch (error) {
    return jsonError(error);
  }
}
