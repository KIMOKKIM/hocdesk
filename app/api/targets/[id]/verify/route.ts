import { requireAdmin } from "@/lib/api/auth";
import { jsonError, jsonOk } from "@/lib/api/response";
import { verifyTargetSchema } from "@/lib/api/validation";
import { verifyTargetInformation } from "@/lib/targets/verify-service";

type RouteParams = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: RouteParams) {
  try {
    await requireAdmin(request);
    const { id } = await params;
    const raw = await request.json().catch(() => ({}));
    const body = verifyTargetSchema.parse(raw);

    const result = await verifyTargetInformation({
      projectCompanyId: id,
      ...body,
    });

    return jsonOk({ target: result });
  } catch (error) {
    return jsonError(error);
  }
}
