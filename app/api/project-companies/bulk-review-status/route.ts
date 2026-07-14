import { requireAdmin } from "@/lib/api/auth";
import { jsonError, jsonOk } from "@/lib/api/response";
import { bulkReviewStatusSchema } from "@/lib/api/validation";
import { bulkUpdateProjectCompanyReviewStatus } from "@/lib/db/target-review";

export async function PATCH(request: Request) {
  try {
    await requireAdmin(request);
    const raw = await request.json().catch(() => ({}));
    const body = bulkReviewStatusSchema.parse(raw);

    const result = await bulkUpdateProjectCompanyReviewStatus(
      body.ids,
      body.status,
    );

    return jsonOk(result);
  } catch (error) {
    return jsonError(error);
  }
}
