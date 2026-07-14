import { requireAdmin } from "@/lib/api/auth";
import { jsonError, jsonOk } from "@/lib/api/response";
import { getJinwoongTarget } from "@/lib/jinwoong/data";

export const runtime = "nodejs";

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: RouteParams) {
  try {
    await requireAdmin(request);
    const { id } = await params;
    const target = await getJinwoongTarget(id);
    if (!target) {
      return jsonError(new Error("타깃 업체를 찾을 수 없습니다."), 404);
    }
    return jsonOk({ target });
  } catch (error) {
    return jsonError(error);
  }
}
