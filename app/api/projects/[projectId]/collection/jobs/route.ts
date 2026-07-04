import { NextResponse } from "next/server";
import { getCollectionJobsByProject } from "@/lib/db/collection-jobs";

type RouteParams = { params: Promise<{ projectId: string }> };

export async function GET(_request: Request, { params }: RouteParams) {
  const { projectId } = await params;
  const jobs = await getCollectionJobsByProject(projectId);
  return NextResponse.json({ ok: true, jobs });
}
