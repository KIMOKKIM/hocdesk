import { requireAdmin } from "@/lib/api/auth";
import { jsonError, jsonOk } from "@/lib/api/response";
import { getJinwoongCompanyProfile } from "@/lib/jinwoong/data";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    await requireAdmin(request);
    const project = await getJinwoongCompanyProfile();
    return jsonOk({
      project: {
        id: project.id,
        projectName: project.projectName,
        companyName: project.companyName,
      },
      profile: project.companyProfile,
    });
  } catch (error) {
    return jsonError(error);
  }
}
