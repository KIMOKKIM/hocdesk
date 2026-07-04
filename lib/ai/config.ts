export type AiProvider = "rules" | "openai";

export function getAiProvider(): AiProvider {
  const provider = (process.env.AI_PROVIDER ?? "rules").toLowerCase();
  if (provider === "openai") return "openai";
  return "rules";
}

export function getOpenAiApiKey(): string | undefined {
  return process.env.OPENAI_API_KEY ?? process.env.AI_API_KEY ?? undefined;
}

export function isAiEnabled(): boolean {
  return getAiProvider() === "openai" && Boolean(getOpenAiApiKey());
}
