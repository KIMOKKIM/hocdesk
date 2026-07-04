import type {
  AnalyzeActivityInput,
  ActivityAnalysisResult,
} from "@/lib/analysis/types";
import { getAiProvider, getOpenAiApiKey } from "@/lib/ai/config";
import { ApiError } from "@/lib/api/errors";
import { analyzeWithRules } from "@/lib/analysis/rule-based-analyzer";

export async function analyzeWithAi(
  input: AnalyzeActivityInput,
): Promise<ActivityAnalysisResult> {
  const apiKey = getOpenAiApiKey();
  if (!apiKey) {
    throw new ApiError(
      "AI_PROVIDER=openai 이지만 OPENAI_API_KEY가 설정되지 않았습니다.",
      400,
    );
  }

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: process.env.AI_MODEL ?? "gpt-4o-mini",
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content:
              "You analyze B2B M&A daily sales activity notes in Korean. Return JSON with keys: dailySummary, positiveSignals, negativeSignals, objections, newTargetSuggestions (array with segment, reason, evidence, recommendationScore, priority, regions, keywords, targetCount), recommendedActions, collectionRecommended (ACTIVE|REVIEW|HOLD), expansionScore.",
          },
          {
            role: "user",
            content: JSON.stringify(input),
          },
        ],
      }),
    });

    if (!response.ok) {
      throw new ApiError(`AI API 오류: ${response.status}`, 502);
    }

    const payload = (await response.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const content = payload.choices?.[0]?.message?.content;
    if (!content) throw new ApiError("AI 응답이 비어 있습니다.", 502);

    const parsed = JSON.parse(content) as Omit<
      ActivityAnalysisResult,
      "analyzer" | "analyzedAt"
    >;

    return {
      ...parsed,
      analyzer: "ai",
      analyzedAt: new Date().toISOString(),
    };
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(
      error instanceof Error ? error.message : "AI 분석 실패",
      502,
    );
  }
}

export async function analyzeActivity(
  input: AnalyzeActivityInput,
): Promise<ActivityAnalysisResult> {
  const provider = getAiProvider();

  if (provider === "rules") {
    return analyzeWithRules(input);
  }

  if (provider === "openai") {
    return analyzeWithAi(input);
  }

  throw new ApiError(
    `지원하지 않는 AI_PROVIDER: ${process.env.AI_PROVIDER ?? "(미설정)"}. rules 또는 openai를 사용하세요.`,
    400,
  );
}
