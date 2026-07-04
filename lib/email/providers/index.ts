import { ApiError } from "@/lib/api/errors";
import { ConsoleEmailProvider } from "@/lib/email/providers/console-provider";
import {
  GmailDraftProvider,
  GmailSendProvider,
} from "@/lib/email/providers/gmail-provider";
import type { EmailProvider } from "@/lib/email/types";

export function getEmailProvider(): EmailProvider {
  const provider = (process.env.EMAIL_PROVIDER ?? "console").toLowerCase();

  switch (provider) {
    case "console":
      return new ConsoleEmailProvider();
    case "gmail-draft":
      return new GmailDraftProvider();
    case "gmail-send":
      return new GmailSendProvider();
    default:
      throw new ApiError(
        `지원하지 않는 EMAIL_PROVIDER: ${process.env.EMAIL_PROVIDER}. console을 사용하세요.`,
        400,
      );
  }
}
