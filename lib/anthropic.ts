/** Model ids for API + display labels for UI dropdown. Use -latest aliases so we don't break when Anthropic retires dated snapshots. */
export const ANTHROPIC_MODELS = [
  { id: "claude-3-5-haiku-latest", label: "Haiku" },
  { id: "claude-3-5-sonnet-latest", label: "Sonnet" },
  { id: "claude-3-5-haiku-20241022", label: "Haiku (Oct 2024 snapshot)" },
  { id: "claude-3-5-sonnet-20241022", label: "Sonnet (Oct 2024 snapshot)" },
  { id: "claude-3-opus-20240229", label: "Opus" },
] as const;

export type AnthropicUsage = { input_tokens: number; output_tokens: number };

/** If a dated snapshot returns 404, Anthropic may have retired it. Map to -latest so saved workspace preferences keep working. */
const DEPRECATED_MODEL_FALLBACK: Record<string, string> = {
  "claude-3-5-haiku-20241022": "claude-3-5-haiku-latest",
  "claude-3-5-sonnet-20241022": "claude-3-5-sonnet-latest",
  "claude-3-5-sonnet-20240620": "claude-3-5-sonnet-latest",
};

function resolveModel(model: string): string {
  return DEPRECATED_MODEL_FALLBACK[model] ?? model;
}

export async function callAnthropic(
  apiKey: string,
  userMessage: string,
  options?: { maxTokens?: number; model?: string }
): Promise<{ text: string; usage?: AnthropicUsage }> {
  const maxTokens = options?.maxTokens ?? 2000;
  const requested = options?.model ?? ANTHROPIC_MODELS[0].id;
  const model = resolveModel(requested);
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
    throw new Error(`Anthropic (${model}): ${res.status} - ${JSON.stringify(errData)}`);
  }

  const data = (await res.json()) as {
    content?: Array<{ type: string; text?: string }>;
    usage?: { input_tokens: number; output_tokens: number };
  };
  const text = data.content?.[0]?.text ?? "";
  const usage = data.usage
    ? { input_tokens: data.usage.input_tokens, output_tokens: data.usage.output_tokens }
    : undefined;
  return { text, usage };
}
