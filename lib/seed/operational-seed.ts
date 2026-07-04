import type { PrismaClient } from "@/app/generated/prisma/client";
import { ProjectStatus } from "@/lib/constants/status";

export const OPERATIONAL_PROJECT_ID = "seed_jinwoong_yangju_sale";

export async function seedOperationalProject(prisma: PrismaClient) {
  await prisma.project.upsert({
    where: { id: OPERATIONAL_PROJECT_ID },
    update: {
      name: "진웅산업 양주 공장 매각",
      companyName: "진웅산업",
      projectType: "산업용 부동산·공장 매각",
      status: ProjectStatus.ACTIVE,
      location: "경기도 양주시",
      askingPrice: BigInt(5_300_000_000),
      summary:
        "기존 염료 제조시설이 있는 공장 및 토지 일괄매각 프로젝트. 염료사업 승계보다 매수자의 신규사업 목적에 맞는 산업용 부지 활용을 우선 검토한다.",
      propertyType: "공장·토지",
      landArea: "약 8,500㎡",
      buildingArea: "약 3,200㎡",
      desiredClosingDate: new Date("2026-12-31"),
    },
    create: {
      id: OPERATIONAL_PROJECT_ID,
      name: "진웅산업 양주 공장 매각",
      companyName: "진웅산업",
      projectType: "산업용 부동산·공장 매각",
      status: ProjectStatus.ACTIVE,
      location: "경기도 양주시",
      askingPrice: BigInt(5_300_000_000),
      summary:
        "기존 염료 제조시설이 있는 공장 및 토지 일괄매각 프로젝트. 염료사업 승계보다 매수자의 신규사업 목적에 맞는 산업용 부지 활용을 우선 검토한다.",
      propertyType: "공장·토지",
      landArea: "약 8,500㎡",
      buildingArea: "약 3,200㎡",
      desiredClosingDate: new Date("2026-12-31"),
    },
  });

  await prisma.appSetting.upsert({
    where: { key: "sender_profile" },
    update: {},
    create: {
      key: "sender_profile",
      value: {
        senderName: process.env.DEFAULT_SENDER_NAME ?? "",
        companyName: "진웅산업",
        jobTitle: "",
        phone: process.env.DEFAULT_SENDER_PHONE ?? "",
        email: process.env.DEFAULT_SENDER_EMAIL ?? "",
        introText: "",
        signature: "",
        unsubscribeNotice:
          "본 메일은 정보 제공 목적으로 발송되었습니다. 수신을 원치 않으시면 회신으로 알려주세요.",
      },
    },
  });
}
