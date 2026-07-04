import { z } from "zod";
import { ApiError } from "@/lib/api/errors";

export const cuidSchema = z.string().min(1).max(64);

export const generateOutreachSchema = z.object({
  projectCompanyId: cuidSchema,
  contactId: cuidSchema.optional(),
  templateType: z.string().max(64).optional(),
  force: z.boolean().optional(),
});

export const updateOutreachSchema = z.object({
  subject: z.string().min(1).max(500).optional(),
  emailBody: z.string().min(50).max(10000).optional(),
  contactId: cuidSchema.nullable().optional(),
  nextActionDate: z.string().datetime().nullable().optional(),
  emailType: z.string().max(64).optional(),
});

export const rejectOutreachSchema = z.object({
  reason: z.string().max(500).optional(),
});

export const scheduleOutreachSchema = z.object({
  scheduledAt: z.string().datetime(),
});

export const replyOutreachSchema = z.object({
  replyType: z.enum([
    "INTERESTED",
    "REQUESTED_INFO",
    "FOLLOW_UP",
    "HOLD",
    "REJECTED",
    "UNSUBSCRIBE",
    "OTHER",
  ]),
  replySummary: z.string().min(1).max(2000),
  repliedAt: z.string().datetime().optional(),
  nextActionDate: z.string().datetime().nullable().optional(),
});

export const senderProfileSchema = z.object({
  senderName: z.string().min(1).max(100),
  companyName: z.string().min(1).max(200),
  jobTitle: z.string().max(100),
  phone: z.string().max(50),
  email: z.string().email().or(z.literal("")),
  introText: z.string().max(1000),
  signature: z.string().max(1000),
  unsubscribeNotice: z.string().max(500),
});

export const suppressionSchema = z.object({
  email: z.string().email(),
  companyName: z.string().max(200).optional(),
  reason: z.string().min(1).max(500),
});

export const initialCollectionSchema = z.object({
  confirmed: z.boolean().optional(),
  requestedCount: z.number().int().min(1).max(60).optional(),
  force: z.boolean().optional(),
  provider: z.enum(["demo", "kakao", "composite"]).optional(),
  dryRun: z.boolean().optional(),
  importMode: z.enum(["review", "fast"]).optional(),
  skipKeywords: z.array(z.string()).optional(),
  forceDuplicateSearch: z.boolean().optional(),
});

export const verifyTargetSchema = z.object({
  website: z.string().url().optional().nullable(),
  generalEmail: z.string().email().optional().nullable(),
  mainPhone: z.string().max(40).optional().nullable(),
  verificationMemo: z.string().max(5000).optional().nullable(),
  verifiedFields: z.array(z.string()).optional(),
  contactName: z.string().max(100).optional().nullable(),
  contactTitle: z.string().max(100).optional().nullable(),
  contactEmail: z.string().email().optional().nullable(),
  detailedIndustry: z.string().max(200).optional().nullable(),
  currentFacilityType: z.string().max(200).optional().nullable(),
  expansionSignal: z.string().max(500).optional().nullable(),
});

export const createActivitySchema = z.object({
  projectId: cuidSchema,
  activityDate: z.string().min(1),
  rawText: z.string().min(1).max(20000),
  activityType: z.string().min(1).max(64),
  result: z.string().max(500).optional().nullable(),
  contactedCompanyIds: z.array(cuidSchema).optional(),
  analyze: z.boolean().optional(),
  nextActionDate: z.string().optional().nullable(),
  memo: z.string().max(5000).optional().nullable(),
});

export const rejectSuggestionSchema = z.object({
  reason: z.string().max(500).optional(),
});

export const reviewStatusSchema = z.object({
  status: z.enum([
    "PENDING",
    "REVIEWED",
    "CONTACT_READY",
    "REJECTED",
    "HOLD",
    "EXCLUDED",
    "APPROVED",
  ]),
});

export const bulkReviewStatusSchema = z.object({
  ids: z.array(z.string().min(1).max(64)).min(1).max(30),
  status: reviewStatusSchema.shape.status,
});


export async function parseJsonBody<T>(
  request: Request,
  schema: z.ZodSchema<T>,
): Promise<T> {
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    throw new ApiError("JSON 본문이 올바르지 않습니다.", 400);
  }

  const result = schema.safeParse(raw);
  if (!result.success) {
    const message = result.error.issues.map((i) => i.message).join(", ");
    throw new ApiError(message || "입력값이 올바르지 않습니다.", 400);
  }

  return result.data;
}
