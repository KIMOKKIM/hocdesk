import { requireAdmin } from "@/lib/api/auth";
import { jsonError, jsonOk } from "@/lib/api/response";
import { createActivitySchema, parseJsonBody } from "@/lib/api/validation";
import { createActivity } from "@/lib/db/activities";
import { analyzeDailyActivity } from "@/lib/activities/analyze-service";

export async function POST(request: Request) {
  try {
    await requireAdmin(request);
    const body = await parseJsonBody(request, createActivitySchema);
    const activity = await createActivity(body);

    let analysis = null;
    if (body.analyze !== false) {
      analysis = await analyzeDailyActivity(activity.id);
    }

    return jsonOk({ activity, analysis });
  } catch (error) {
    return jsonError(error);
  }
}
