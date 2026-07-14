import { requireAdmin } from "@/lib/api/auth";
import { jsonError, jsonOk } from "@/lib/api/response";
import { checkRateLimit } from "@/lib/api/rate-limit";
import { updateAllProjectInsights } from "@/lib/project-insights/service";

type RouteParams = { params: Promise<{ projectId: string }> };

export async function POST(request: Request, { params }: RouteParams) {
  try {
    await requireAdmin(request);
    checkRateLimit(request, "insights:POST");
    const { projectId } = await params;
    const result = await updateAllProjectInsights(projectId);
    return jsonOk({
      success: true,
      updatedCategories: result.updatedCategories,
      insights: result.insights,
    });
  } catch (error) {
    return jsonError(error);
  }
}
