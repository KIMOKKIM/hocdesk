import { requireAdminAccess } from "@/lib/api/auth";
import { jsonError, jsonOk } from "@/lib/api/response";
import { getActivityLogs } from "@/lib/audit/activity-log-service";

export async function GET(request: Request) {
  try {
    requireAdminAccess(request);
    const url = new URL(request.url);
    const from = url.searchParams.get("from");
    const to = url.searchParams.get("to");

    const logs = await getActivityLogs({
      projectId: url.searchParams.get("projectId") ?? undefined,
      companyId: url.searchParams.get("companyId") ?? undefined,
      eventType: url.searchParams.get("eventType") ?? undefined,
      actorType: url.searchParams.get("actorType") ?? undefined,
      from: from ? new Date(from) : undefined,
      to: to ? new Date(to) : undefined,
      limit: Number(url.searchParams.get("limit") ?? 100),
    });

    return jsonOk({ logs });
  } catch (error) {
    return jsonError(error);
  }
}
