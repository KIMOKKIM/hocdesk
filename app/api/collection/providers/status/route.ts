import { jsonOk } from "@/lib/api/response";
import { getSearchProviderStatus } from "@/lib/db/search-provider-status";

export async function GET() {
  const status = await getSearchProviderStatus();
  return jsonOk(status);
}
