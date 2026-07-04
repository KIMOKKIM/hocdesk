import { NextResponse } from "next/server";
import { getOutreachList, getOutreachStats } from "@/lib/db/outreach";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status") ?? undefined;
  const projectId = searchParams.get("projectId") ?? undefined;
  const q = searchParams.get("q") ?? undefined;

  const [items, stats] = await Promise.all([
    getOutreachList({ status, projectId, q }),
    getOutreachStats(projectId),
  ]);

  return NextResponse.json({ ok: true, items, stats });
}
