import { NextResponse } from "next/server";
import { getExpansionSuggestionsByProject } from "@/lib/db/expansion-suggestions";

type RouteParams = { params: Promise<{ projectId: string }> };

export async function GET(_request: Request, { params }: RouteParams) {
  const { projectId } = await params;
  const suggestions = await getExpansionSuggestionsByProject(projectId);
  return NextResponse.json({ ok: true, suggestions });
}
