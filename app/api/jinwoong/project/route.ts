import { requireAdmin } from "@/lib/api/auth";
import { jsonError, jsonOk } from "@/lib/api/response";
import { getJinwoongOverviewStats } from "@/lib/jinwoong/data";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    await requireAdmin(request);
    const data = await getJinwoongOverviewStats();
    return jsonOk({
      project: {
        id: data.project.id,
        projectName: data.project.projectName,
        companyName: data.project.companyName,
        description: data.project.description,
        status: data.project.status,
        progressSteps: data.project.progressSteps,
        lastUpdatedAt: data.project.lastUpdatedAt,
      },
      stats: data.stats,
    });
  } catch (error) {
    return jsonError(error);
  }
}
