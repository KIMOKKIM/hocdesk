import { prisma } from "@/lib/prisma";
import { EMAIL_DISCLAIMER } from "@/lib/constants/email";

export const SENDER_PROFILE_KEY = "sender_profile";

export type SenderProfile = {
  senderName: string;
  companyName: string;
  jobTitle: string;
  phone: string;
  email: string;
  introText: string;
  signature: string;
  unsubscribeNotice: string;
};

export const DEFAULT_SENDER_PROFILE: SenderProfile = {
  senderName: process.env.DEFAULT_SENDER_NAME || "김종웅",
  companyName: process.env.DEFAULT_SENDER_COMPANY || "TargetBridge AI",
  jobTitle: "매각 업무 담당",
  phone: process.env.DEFAULT_SENDER_PHONE || "",
  email: process.env.DEFAULT_SENDER_EMAIL || "",
  introText:
    "산업용 부동산 및 기업 매각 관련 자문 업무를 진행하고 있습니다.",
  signature: "",
  unsubscribeNotice: EMAIL_DISCLAIMER,
};

export async function getSenderProfile(): Promise<SenderProfile> {
  const row = await prisma.appSetting.findUnique({
    where: { key: SENDER_PROFILE_KEY },
  });

  if (!row || typeof row.value !== "object" || row.value === null) {
    return { ...DEFAULT_SENDER_PROFILE };
  }

  return {
    ...DEFAULT_SENDER_PROFILE,
    ...(row.value as Partial<SenderProfile>),
  };
}

export async function saveSenderProfile(profile: SenderProfile) {
  return prisma.appSetting.upsert({
    where: { key: SENDER_PROFILE_KEY },
    create: { key: SENDER_PROFILE_KEY, value: profile },
    update: { value: profile },
  });
}

export async function getSuppressionList() {
  return prisma.suppressionList.findMany({
    orderBy: { optedOutAt: "desc" },
  });
}

export async function removeFromSuppressionList(id: string) {
  return prisma.suppressionList.delete({ where: { id } });
}
