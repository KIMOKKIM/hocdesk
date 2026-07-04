import { ApiError } from "@/lib/api/errors";
import { getAiProvider } from "@/lib/ai/config";
import type { EmailDraftProvider } from "@/lib/email/draft/types";
import { RuleBasedEmailDraftProvider } from "@/lib/email/draft/rule-based-provider";

export class OpenAIEmailDraftProvider implements EmailDraftProvider {
  async generateDraft(): Promise<never> {
    throw new ApiError(
      "OpenAI 이메일 초안 Provider는 아직 구현되지 않았습니다. AI_PROVIDER=rules를 사용하세요.",
      501,
    );
  }
}

export function getEmailDraftProvider(): EmailDraftProvider {
  const provider = getAiProvider();

  if (provider === "rules") {
    return new RuleBasedEmailDraftProvider();
  }

  if (provider === "openai") {
    return new OpenAIEmailDraftProvider();
  }

  throw new ApiError(
    `지원하지 않는 AI_PROVIDER: ${process.env.AI_PROVIDER ?? "(미설정)"}. rules 또는 openai를 사용하세요.`,
    400,
  );
}
