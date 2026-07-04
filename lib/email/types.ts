import type { IndustryTemplateKey } from "@/lib/constants/email";

export type EmailGenerationInput = {
  projectName: string;
  projectLocation?: string | null;
  companyName: string;
  industryGroup?: string | null;
  detailedIndustry?: string | null;
  region?: string | null;
  fitScore: number;
  recommendedUse?: string | null;
  targetingReason?: string | null;
  recentActivitySummary?: string | null;
  contactTitle?: string | null;
  templateKey: IndustryTemplateKey;
};

export type GeneratedEmail = {
  subject: string;
  body: string;
  templateKey: IndustryTemplateKey;
  generator: "ai" | "template";
};

export type SendEmailPayload = {
  outreachId: string;
  to: string;
  subject: string;
  body: string;
  companyName: string;
};

export type SendEmailResult = {
  success: boolean;
  provider: string;
  messageId?: string;
  error?: string;
};

export interface EmailProvider {
  readonly name: string;
  send(payload: SendEmailPayload): Promise<SendEmailResult>;
}
