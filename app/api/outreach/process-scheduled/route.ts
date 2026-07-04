import { requireAdminAccess } from "@/lib/api/auth";
import { jsonError, jsonOk } from "@/lib/api/response";
import { processScheduledOutreach } from "@/lib/email/outreach-service";

export async function POST(request: Request) {
  try {
    requireAdminAccess(request);
    const results = await processScheduledOutreach();
    return jsonOk({ processed: results.length, results });
  } catch (error) {
    return jsonError(error);
  }
}
