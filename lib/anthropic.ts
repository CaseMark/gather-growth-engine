/** Model ids for API + display labels for UI dropdown */
export const ANTHROPIC_MODELS = [
  { id: "claude-3-5-haiku-20241022", label: "Haiku" },
  { id: "claude-3-5-sonnet-20241022", label: "Sonnet" },
  { id: "claude-3-5-sonnet-20240620", label: "Sonnet (Jun 2024)" },
  { id: "claude-3-opus-20240229", label: "Opus" },
] as const;

export type AnthropicUsage = { input_tokens: number; output_tokens: number };

export async function callAnthropic(
  apiKey: string,
  userMessage: string,
  options?: { maxTokens?: number; model?: string }
): Promise<{ text: string; usage?: AnthropicUsage }> {
  const maxTokens = options?.maxTokens ?? 2000;
  const model = options?.model ?? ANTHROPIC_MODELS[0].id;
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
