import { NextResponse } from "next/server";
import { requireAdminAccess } from "@/lib/api/auth";
import { jsonError, jsonOk } from "@/lib/api/response";
import { checkRateLimit } from "@/lib/api/rate-limit";
import {
  getOutreachPreview,
  sendOutreach,
} from "@/lib/email/outreach-service";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const preview = await getOutreachPreview(id);
    return NextResponse.json(preview);
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: Request, context: RouteContext) {
  try {
    requireAdminAccess(request);
    checkRateLimit(request, "outreach-send:POST");
    const { id } = await context.params;
    const outreach = await sendOutreach(id);
    return jsonOk({ outreach });
  } catch (error) {
    return jsonError(error);
  }
}
