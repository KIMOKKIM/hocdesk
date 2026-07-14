import { requireAdmin } from "@/lib/api/auth";
import { jsonError, jsonOk } from "@/lib/api/response";
import { checkRateLimit } from "@/lib/api/rate-limit";
import {
  parseInsightCategory,
  updateProjectInsight,
} from "@/lib/project-insights/service";

type RouteParams = {
  params: Promise<{ projectId: string; category: string }>;
};

export async function POST(request: Request, { params }: RouteParams) {
  try {
    await requireAdmin(request);
    checkRateLimit(request, "insights:POST");
    const { projectId, category: rawCategory } = await params;
    const category = parseInsightCategory(rawCategory);
    const body = (await request.json().catch(() => ({}))) as {
      mode?: "manual" | "rules" | "web";
      content?: {
        summary?: string;
        keyIssues?: string[];
        saleImpact?: string;
        opportunities?: string[];
        risks?: string[];
        sourceNotes?: string;
        sourceUrls?: string[];
      };
    };

    const mode = body.mode ?? "rules";
    if (mode !== "manual" && mode !== "rules" && mode !== "web") {
      return jsonError(new Error("mode는 manual | rules | web 이어야 합니다."));
    }

    const insight = await updateProjectInsight({
      projectId,
      category,
      mode,
      content: body.content,
    });

    return jsonOk({ success: true, insight });
  } catch (error) {
    return jsonError(error);
  }
}
