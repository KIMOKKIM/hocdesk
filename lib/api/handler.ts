import type { z } from "zod";
import { requireAdminAccess } from "@/lib/api/auth";
import { jsonError, jsonOk } from "@/lib/api/response";
import { checkRateLimit } from "@/lib/api/rate-limit";
import { parseJsonBody } from "@/lib/api/validation";

type HandlerContext = { params: Promise<Record<string, string>> };

type ApiHandlerOptions<TBody> = {
  admin?: boolean;
  rateLimit?: "collection:POST" | "outreach-send:POST";
  bodySchema?: z.ZodSchema<TBody>;
};

export function createApiHandler<TBody = undefined, TResult = unknown>(
  handler: (
    request: Request,
    context: HandlerContext,
    body: TBody,
  ) => Promise<TResult>,
  options: ApiHandlerOptions<TBody> = {},
) {
  return async (request: Request, context: HandlerContext) => {
    try {
      if (options.admin) {
        requireAdminAccess(request);
      }
      if (options.rateLimit) {
        checkRateLimit(request, options.rateLimit);
      }

      let body = undefined as TBody;
      if (options.bodySchema) {
        body = await parseJsonBody(request, options.bodySchema);
      }

      const result = await handler(request, context, body);
      const payload =
        typeof result === "object" && result !== null
          ? (result as Record<string, unknown>)
          : { data: result };
      return jsonOk(payload);
    } catch (error) {
      return jsonError(error);
    }
  };
}
