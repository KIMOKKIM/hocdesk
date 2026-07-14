import { requireAdmin } from "@/lib/api/auth";
import { jsonError, jsonOk } from "@/lib/api/response";
import { listJinwoongTargets } from "@/lib/jinwoong/data";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    await requireAdmin(request);
    const url = new URL(request.url);
    const stageParam = url.searchParams.get("stage");
    const stage = stageParam ? Number(stageParam) : undefined;

    const targets = await listJinwoongTargets({
      stage: Number.isFinite(stage) ? stage : undefined,
      country: url.searchParams.get("country") ?? undefined,
      status: url.searchParams.get("status") ?? undefined,
      q: url.searchParams.get("q") ?? undefined,
      hasContact:
        url.searchParams.get("hasContact") === "true"
          ? true
          : url.searchParams.get("hasContact") === "false"
            ? false
            : undefined,
      priorityOnly: url.searchParams.get("priorityOnly") === "true",
      newOnly: url.searchParams.get("newOnly") === "true",
    });

    return jsonOk({ targets, count: targets.length });
  } catch (error) {
    return jsonError(error);
  }
}
