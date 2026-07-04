import { requireAdminAccess } from "@/lib/api/auth";
import { jsonError, jsonOk } from "@/lib/api/response";
import {
  senderProfileSchema,
  suppressionSchema,
  parseJsonBody,
} from "@/lib/api/validation";
import {
  getSenderProfile,
  getSuppressionList,
  removeFromSuppressionList,
  saveSenderProfile,
} from "@/lib/db/settings";
import { addToSuppressionList } from "@/lib/email/suppression";

export async function GET() {
  try {
    const [senderProfile, suppressionList] = await Promise.all([
      getSenderProfile(),
      getSuppressionList(),
    ]);
    return jsonOk({ senderProfile, suppressionList });
  } catch (error) {
    return jsonError(error);
  }
}

export async function PATCH(request: Request) {
  try {
    requireAdminAccess(request);
    const body = await parseJsonBody(request, senderProfileSchema);
    await saveSenderProfile(body);
    return jsonOk({ senderProfile: body });
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: Request) {
  try {
    requireAdminAccess(request);
    const body = await parseJsonBody(request, suppressionSchema);
    const entry = await addToSuppressionList({
      email: body.email,
      companyName: body.companyName,
      reason: body.reason,
      source: "settings",
    });
    return jsonOk({ entry });
  } catch (error) {
    return jsonError(error);
  }
}

export async function DELETE(request: Request) {
  try {
    requireAdminAccess(request);
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) throw new Error("id가 필요합니다.");
    await removeFromSuppressionList(id);
    return jsonOk({});
  } catch (error) {
    return jsonError(error);
  }
}
