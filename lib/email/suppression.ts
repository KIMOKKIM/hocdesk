import { prisma } from "@/lib/prisma";

export function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export async function isEmailSuppressed(email: string) {
  const normalized = normalizeEmail(email);
  if (!normalized) return false;
  const entry = await prisma.suppressionList.findUnique({
    where: { email: normalized },
  });
  return Boolean(entry);
}

export async function addToSuppressionList(input: {
  email: string;
  companyName?: string | null;
  reason: string;
  source?: string;
}) {
  const email = normalizeEmail(input.email);
  return prisma.suppressionList.upsert({
    where: { email },
    create: {
      email,
      companyName: input.companyName ?? null,
      reason: input.reason,
      source: input.source ?? "manual",
    },
    update: {
      reason: input.reason,
      companyName: input.companyName ?? null,
      source: input.source ?? "manual",
    },
  });
}
