import type { Prisma } from "@/app/generated/prisma/client";
import { prisma } from "@/lib/prisma";

export type ActivityLogActorType = "USER" | "SYSTEM" | "PROVIDER";

export type WriteActivityLogInput = {
  eventType: string;
  summary: string;
  actorType?: ActivityLogActorType;
  actorId?: string | null;
  projectId?: string | null;
  companyId?: string | null;
  projectCompanyId?: string | null;
  outreachId?: string | null;
  collectionJobId?: string | null;
  metadata?: Record<string, unknown> | null;
};

function sanitizeMetadata(data?: Record<string, unknown> | null) {
  if (!data) return null;
  const copy = { ...data };
  for (const key of ["email", "generalEmail", "apiKey", "authorization", "body"]) {
    if (key in copy) delete copy[key];
  }
  return copy;
}

export async function writeActivityLog(input: WriteActivityLogInput) {
  try {
    return await prisma.activityLog.create({
      data: {
        eventType: input.eventType,
        summary: input.summary,
        actorType: input.actorType ?? "SYSTEM",
        actorId: input.actorId ?? null,
        projectId: input.projectId ?? null,
        companyId: input.companyId ?? null,
        projectCompanyId: input.projectCompanyId ?? null,
        outreachId: input.outreachId ?? null,
        collectionJobId: input.collectionJobId ?? null,
        metadata: sanitizeMetadata(input.metadata) as Prisma.InputJsonValue,
      },
    });
  } catch (error) {
    console.error("[activity-log] DB write failed:", input.eventType, error);
    return null;
  }
}

export async function getActivityLogs(filters: {
  projectId?: string;
  companyId?: string;
  eventType?: string;
  actorType?: string;
  from?: Date;
  to?: Date;
  limit?: number;
}) {
  return prisma.activityLog.findMany({
    where: {
      projectId: filters.projectId || undefined,
      companyId: filters.companyId || undefined,
      eventType: filters.eventType && filters.eventType !== "ALL" ? filters.eventType : undefined,
      actorType: filters.actorType && filters.actorType !== "ALL" ? filters.actorType : undefined,
      createdAt: {
        ...(filters.from ? { gte: filters.from } : {}),
        ...(filters.to ? { lte: filters.to } : {}),
      },
    },
    orderBy: { createdAt: "desc" },
    take: filters.limit ?? 100,
    include: { project: { select: { name: true } } },
  });
}
