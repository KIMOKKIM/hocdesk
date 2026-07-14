import { requireAdmin } from "@/lib/api/auth";
import { jsonError, jsonOk } from "@/lib/api/response";
import { analyzeDailyActivity } from "@/lib/activities/analyze-service";

type RouteParams = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: RouteParams) {
  try {
    await requireAdmin(request);
    const { id } = await params;
    const analysis = await analyzeDailyActivity(id);
    return jsonOk({ analysis });
  } catch (error) {
    return jsonError(error);
  }
}
