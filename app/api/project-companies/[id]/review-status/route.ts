import { requireAdmin } from "@/lib/api/auth";
import { jsonError, jsonOk } from "@/lib/api/response";
import { reviewStatusSchema } from "@/lib/api/validation";
import { updateProjectCompanyReviewStatus } from "@/lib/db/target-review";

type RouteParams = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: RouteParams) {
  try {
    await requireAdmin(request);
    const { id } = await params;
    const raw = await request.json().catch(() => ({}));
    const body = reviewStatusSchema.parse(raw);

    const updated = await updateProjectCompanyReviewStatus(id, body.status);

    return jsonOk({
      id: updated.id,
      reviewStatus: updated.reviewStatus,
    });
  } catch (error) {
    return jsonError(error);
  }
}
