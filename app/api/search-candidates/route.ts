import { requireAdmin } from "@/lib/api/auth";
import { jsonError, jsonOk } from "@/lib/api/response";
import { importDiscoveredCandidates } from "@/lib/collection/candidate-import";
import {
  getDiscoveredCandidates,
  updateDiscoveredCandidateStatus,
} from "@/lib/collection/discovered-candidate-service";
import { DiscoveredCandidateStatus } from "@/lib/constants/status";
import { z } from "zod";

const importSchema = z.object({
  candidateIds: z.array(z.string()).min(1).max(30),
  jobId: z.string().optional(),
});

export async function GET(request: Request) {
  try {
    await requireAdmin(request);
    const url = new URL(request.url);
    const items = await getDiscoveredCandidates({
      projectId: url.searchParams.get("projectId") ?? undefined,
      validationStatus: url.searchParams.get("status") ?? undefined,
      provider: url.searchParams.get("provider") ?? undefined,
      segmentName: url.searchParams.get("segment") ?? undefined,
      region: url.searchParams.get("region") ?? undefined,
      hasPhone: url.searchParams.get("hasPhone") ?? undefined,
      isDuplicate: url.searchParams.get("duplicate") ?? undefined,
      collectionJobId: url.searchParams.get("jobId") ?? undefined,
      limit: Number(url.searchParams.get("limit") ?? 100),
    });
    return jsonOk({ items });
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: Request) {
  try {
    await requireAdmin(request);
    const raw = await request.json();
    const action = raw.action as string;

    if (action === "import") {
      const body = importSchema.parse(raw);
      const result = await importDiscoveredCandidates(body.candidateIds, body.jobId);
      return jsonOk(result);
    }

    if (action === "reject") {
      const ids = z.array(z.string()).parse(raw.candidateIds);
      await updateDiscoveredCandidateStatus(
        ids,
        DiscoveredCandidateStatus.REJECTED,
        raw.reason,
      );
      return jsonOk({ updated: ids.length });
    }

    if (action === "review") {
      const ids = z.array(z.string()).parse(raw.candidateIds);
      await updateDiscoveredCandidateStatus(ids, DiscoveredCandidateStatus.REVIEW_REQUIRED);
      return jsonOk({ updated: ids.length });
    }

    throw new Error("지원하지 않는 action입니다.");
  } catch (error) {
    return jsonError(error);
  }
}
