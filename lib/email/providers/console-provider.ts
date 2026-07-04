import type { EmailProvider, SendEmailPayload, SendEmailResult } from "@/lib/email/types";

function maskEmail(email: string) {
  const [local, domain] = email.split("@");
  if (!domain) return "[redacted]";
  return `${local.slice(0, 2)}***@${domain}`;
}

export class ConsoleEmailProvider implements EmailProvider {
  readonly name = "console";

  async send(payload: SendEmailPayload): Promise<SendEmailResult> {
    const messageId = `console-targetbridge-${Date.now()}-${payload.outreachId}`;

    console.info(
      JSON.stringify({
        event: "OUTREACH_SENT",
        provider: this.name,
        outreachId: payload.outreachId,
        to: maskEmail(payload.to),
        company: payload.companyName,
        subject: payload.subject,
        bodyLength: payload.body.length,
        timestamp: new Date().toISOString(),
        messageId,
      }),
    );

    return {
      success: true,
      provider: this.name,
      messageId,
    };
  }
}
