import type { EmailProvider, SendEmailPayload, SendEmailResult } from "@/lib/email/types";

/** Gmail 초안 생성 — OAuth 연동은 다음 단계에서 구현 */
export class GmailDraftProvider implements EmailProvider {
  readonly name = "gmail-draft";

  async send(payload: SendEmailPayload): Promise<SendEmailResult> {
    void payload;
    return {
      success: false,
      provider: this.name,
      error: "Gmail OAuth 연동이 아직 구현되지 않았습니다.",
    };
  }
}

/** Gmail 발송 — OAuth 연동은 다음 단계에서 구현 */
export class GmailSendProvider implements EmailProvider {
  readonly name = "gmail-send";

  async send(payload: SendEmailPayload): Promise<SendEmailResult> {
    void payload;
    return {
      success: false,
      provider: this.name,
      error: "Gmail OAuth 연동이 아직 구현되지 않았습니다.",
    };
  }
}
