import { requireAdminAccess } from "@/lib/api/auth";
import { jsonError, jsonOk } from "@/lib/api/response";
import { generateOutreachSchema, parseJsonBody } from "@/lib/api/validation";
import { generateOutreachDraft } from "@/lib/email/outreach-service";
import type { IndustryTemplateKey } from "@/lib/constants/email";

export async function POST(request: Request) {
  try {
    requireAdminAccess(request);
    const body = await parseJsonBody(request, generateOutreachSchema);
    const result = await generateOutreachDraft({
      projectCompanyId: body.projectCompanyId,
      contactId: body.contactId,
      templateType: body.templateType as IndustryTemplateKey | "AUTO" | undefined,
      force: body.force,
    });
    return jsonOk({
      outreachId: result.outreachId,
      subject: result.subject,
      body: result.body,
      approvalStatus: result.approvalStatus,
      status: result.status,
      outreach: result.outreach,
    });
  } catch (error) {
    return jsonError(error);
  }
}
