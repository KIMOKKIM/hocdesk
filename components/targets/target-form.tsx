import Link from "next/link";
import { Button } from "@/components/ui/button";
import { createTarget, updateTarget } from "@/app/(app)/targets/actions";

type TargetFormProps = {
  mode: "create" | "edit";
  projectId?: string;
  projectCompanyId?: string;
  defaultValues?: {
    companyName?: string;
    industryGroup?: string | null;
    detailedIndustry?: string | null;
    region?: string | null;
    estimatedRevenue?: string | null;
    currentFacilityType?: string | null;
    mainPhone?: string | null;
    generalEmail?: string | null;
    targetGrade?: string;
    fitScore?: number;
    recommendedUse?: string | null;
    targetingReason?: string | null;
    riskFactors?: string | null;
  };
};

const inputClassName =
  "flex h-9 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

const textareaClassName =
  "flex min-h-24 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

export function TargetForm({
  mode,
  projectId,
  projectCompanyId,
  defaultValues = {},
}: TargetFormProps) {
  const action =
    mode === "create"
      ? createTarget
      : updateTarget.bind(null, projectCompanyId!);

  return (
    <form action={action} className="space-y-6">
      {projectId ? <input type="hidden" name="projectId" value={projectId} /> : null}

      <div className="grid gap-4 xl:grid-cols-2">
        <div className="space-y-2">
          <label htmlFor="companyName" className="text-sm font-medium">
            업체명 *
          </label>
          <input
            id="companyName"
            name="companyName"
            required
            defaultValue={defaultValues.companyName ?? ""}
            className={inputClassName}
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="targetGrade" className="text-sm font-medium">
            등급
          </label>
          <select
            id="targetGrade"
            name="targetGrade"
            defaultValue={defaultValues.targetGrade ?? "C"}
            className={inputClassName}
          >
            <option value="A">A등급</option>
            <option value="B">B등급</option>
            <option value="C">C등급</option>
          </select>
        </div>

        <div className="space-y-2">
          <label htmlFor="industryGroup" className="text-sm font-medium">
            업종군
          </label>
          <input
            id="industryGroup"
            name="industryGroup"
            defaultValue={defaultValues.industryGroup ?? ""}
            className={inputClassName}
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="detailedIndustry" className="text-sm font-medium">
            세부 업종
          </label>
          <input
            id="detailedIndustry"
            name="detailedIndustry"
            defaultValue={defaultValues.detailedIndustry ?? ""}
            className={inputClassName}
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="region" className="text-sm font-medium">
            지역
          </label>
          <input
            id="region"
            name="region"
            defaultValue={defaultValues.region ?? ""}
            className={inputClassName}
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="fitScore" className="text-sm font-medium">
            적합도 점수
          </label>
          <input
            id="fitScore"
            name="fitScore"
            type="number"
            min={0}
            max={100}
            defaultValue={defaultValues.fitScore ?? 0}
            className={inputClassName}
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="estimatedRevenue" className="text-sm font-medium">
            추정 매출
          </label>
          <input
            id="estimatedRevenue"
            name="estimatedRevenue"
            defaultValue={defaultValues.estimatedRevenue ?? ""}
            className={inputClassName}
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="currentFacilityType" className="text-sm font-medium">
            현재 시설 유형
          </label>
          <input
            id="currentFacilityType"
            name="currentFacilityType"
            defaultValue={defaultValues.currentFacilityType ?? ""}
            className={inputClassName}
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="mainPhone" className="text-sm font-medium">
            대표 전화
          </label>
          <input
            id="mainPhone"
            name="mainPhone"
            defaultValue={defaultValues.mainPhone ?? ""}
            className={inputClassName}
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="generalEmail" className="text-sm font-medium">
            대표 이메일
          </label>
          <input
            id="generalEmail"
            name="generalEmail"
            type="email"
            defaultValue={defaultValues.generalEmail ?? ""}
            className={inputClassName}
          />
        </div>
      </div>

      <div className="space-y-2">
        <label htmlFor="recommendedUse" className="text-sm font-medium">
          추천 활용방안
        </label>
        <textarea
          id="recommendedUse"
          name="recommendedUse"
          defaultValue={defaultValues.recommendedUse ?? ""}
          className={textareaClassName}
        />
      </div>

      <div className="space-y-2">
        <label htmlFor="targetingReason" className="text-sm font-medium">
          타깃 선정사유
        </label>
        <textarea
          id="targetingReason"
          name="targetingReason"
          defaultValue={defaultValues.targetingReason ?? ""}
          className={textareaClassName}
        />
      </div>

      <div className="space-y-2">
        <label htmlFor="riskFactors" className="text-sm font-medium">
          위험요소
        </label>
        <textarea
          id="riskFactors"
          name="riskFactors"
          defaultValue={defaultValues.riskFactors ?? ""}
          className={textareaClassName}
        />
      </div>

      <div className="flex gap-2">
        <Button type="submit">
          {mode === "create" ? "타깃 등록" : "변경 저장"}
        </Button>
        <Button variant="outline" render={<Link href="/targets" />}>
          취소
        </Button>
      </div>
    </form>
  );
}
