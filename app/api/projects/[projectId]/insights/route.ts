import { requireAdmin } from "@/lib/api/auth";
import { jsonError, jsonOk } from "@/lib/api/response";
import { getProjectInsights } from "@/lib/project-insights/service";

type RouteParams = { params: Promise<{ projectId: string }> };

export async function GET(request: Request, { params }: RouteParams) {
  try {
    await requireAdmin(request);
    const { projectId } = await params;
    const insights = await getProjectInsights(projectId);
    return jsonOk({ projectId, insights });
  } catch (error) {
    return jsonError(error);
  }
}
