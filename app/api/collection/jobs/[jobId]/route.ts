import { NextResponse } from "next/server";
import { getCollectionJobDetail } from "@/lib/db/collection-jobs";

type RouteParams = { params: Promise<{ jobId: string }> };

export async function GET(_request: Request, { params }: RouteParams) {
  const { jobId } = await params;
  const job = await getCollectionJobDetail(jobId);

  if (!job) {
    return NextResponse.json(
      { ok: false, error: "작업을 찾을 수 없습니다." },
      { status: 404 },
    );
  }

  return NextResponse.json({ ok: true, job });
}
