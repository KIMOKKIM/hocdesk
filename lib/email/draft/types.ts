import type { IndustryTemplateKey } from "@/lib/constants/email";
import type { SenderProfile } from "@/lib/db/settings";

export type EmailDraftProject = {
  id: string;
  name: string;
  location?: string | null;
  askingPrice?: bigint | null;
  summary?: string | null;
};

export type EmailDraftCompany = {
  id: string;
  companyName: string;
  industryGroup?: string | null;
  detailedIndustry?: string | null;
  region?: string | null;
  generalEmail?: string | null;
};

export type EmailDraftProjectCompany = {
  id: string;
  fitScore: number;
  recommendedUse?: string | null;
  targetingReason?: string | null;
  reviewStatus: string;
};

export type EmailDraftContact = {
  id: string;
  contactName?: string | null;
  jobTitle?: string | null;
  email?: string | null;
} | null;

export type EmailDraftActivity = {
  summary?: string | null;
  rawText: string;
  activityDate: Date;
};

export type EmailDraftInput = {
  project: EmailDraftProject;
  company: EmailDraftCompany;
  projectCompany: EmailDraftProjectCompany;
  contact: EmailDraftContact;
  recentActivities: EmailDraftActivity[];
  senderProfile: SenderProfile;
  templateType: IndustryTemplateKey | "AUTO";
};

export type EmailDraftResult = {
  subject: string;
  body: string;
  personalizationPoints: string[];
  warnings: string[];
  templateType: IndustryTemplateKey;
  generationMethod: "rules" | "openai";
};

export interface EmailDraftProvider {
  generateDraft(input: EmailDraftInput): Promise<EmailDraftResult>;
}
