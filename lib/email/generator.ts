import {
  EMAIL_DISCLAIMER,
  EXTERNAL_PROJECT_EXPRESSION,
} from "@/lib/constants/email";
import type { EmailGenerationInput, GeneratedEmail } from "@/lib/email/types";
import { getOpenAiApiKey, isAiEnabled } from "@/lib/ai/config";
import { generateTemplateEmail } from "@/lib/email/templates/industry-templates";

export async function generateEmailWithAi(
  input: EmailGenerationInput,
): Promise<GeneratedEmail> {
  const apiKey = getOpenAiApiKey();
  if (!apiKey || !isAiEnabled()) {
    return generateTemplateEmail(input);
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
            content: `한국어 B2B M&A 1차 아웃리치 이메일 작성. 500~800자. 과장 금지. 양주 경마장 유치 확정 표현 금지. 금융압박·급매 공개 금지. 토양오염/인허가 단정 금지. 상세주소·민감자료는 관심 확인 전 미공개. 첨부 없음. 반드시 포함: "${EXTERNAL_PROJECT_EXPRESSION}" 및 수신거부 안내. JSON: {subject, body}`,
          },
          { role: "user", content: JSON.stringify(input) },
        ],
      }),
    });

    if (!response.ok) throw new Error("AI failed");

    const payload = (await response.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const content = payload.choices?.[0]?.message?.content;
    if (!content) throw new Error("empty");

    const parsed = JSON.parse(content) as { subject: string; body: string };
    const body = parsed.body.includes(EMAIL_DISCLAIMER)
      ? parsed.body
      : `${parsed.body}\n\n${EMAIL_DISCLAIMER}`;

    return {
      subject: parsed.subject,
      body,
      templateKey: input.templateKey,
      generator: "ai",
    };
  } catch {
    return generateTemplateEmail(input);
  }
}

export async function generateOutreachEmail(
  input: EmailGenerationInput,
): Promise<GeneratedEmail> {
  if (isAiEnabled()) {
    return generateEmailWithAi(input);
  }
  return generateTemplateEmail(input);
}
