/** Models available for selection (cheapest first). */
export const ANTHROPIC_MODELS = [
  { id: "claude-3-5-haiku-20241022", label: "Claude 3.5 Haiku (fast, cheap)" },
  { id: "claude-3-5-sonnet-20241022", label: "Claude 3.5 Sonnet" },
  { id: "claude-3-5-sonnet-20240620", label: "Claude 3.5 Sonnet (Jun 24)" },
  { id: "claude-3-sonnet-20240229", label: "Claude 3 Sonnet" },
  { id: "claude-opus-4-6", label: "Claude Opus 4 (most capable)" },
] as const;

const FALLBACK_MODELS = ANTHROPIC_MODELS.map((m) => m.id);

export type Usage = { input_tokens: number; output_tokens: number };

export async function callAnthropic(
  apiKey: string,
  userMessage: string,
  options?: { maxTokens?: number; model?: string }
): Promise<{ text: string; usage?: Usage }> {
  const maxTokens = options?.maxTokens ?? 2000;
  const preferredModel = options?.model?.trim();
  const modelsToTry = preferredModel ? [preferredModel, ...FALLBACK_MODELS.filter((m) => m !== preferredModel)] : FALLBACK_MODELS;
  let lastError: unknown = null;

  for (const model of modelsToTry) {
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model,
          max_tokens: maxTokens,
          messages: [{ role: "user", content: userMessage }],
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        lastError = new Error(`Anthropic (${model}): ${res.status} - ${JSON.stringify(errData)}`);
        continue;
      }

      const data = (await res.json()) as {
        content?: Array<{ text?: string }>;
        usage?: { input_tokens?: number; output_tokens?: number };
      };
      const text = data.content?.[0]?.text ?? "";
      const usage: Usage | undefined =
        data.usage != null && (typeof data.usage.input_tokens === "number" || typeof data.usage.output_tokens === "number")
          ? {
              input_tokens: Number(data.usage.input_tokens) || 0,
              output_tokens: Number(data.usage.output_tokens) || 0,
            }
          : undefined;
      return { text, usage };
    } catch (err) {
      lastError = err;
      continue;
    }
  }

  throw lastError ?? new Error("Anthropic API failed");
}
