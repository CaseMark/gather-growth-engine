const MODEL_NAMES = [
  "claude-opus-4-6",
  "claude-3-5-sonnet-20241022",
  "claude-3-5-sonnet-20240620",
  "claude-3-sonnet-20240229",
];

export async function callAnthropic(
  apiKey: string,
  userMessage: string,
  options?: { maxTokens?: number }
): Promise<string> {
  const maxTokens = options?.maxTokens ?? 2000;
  let lastError: any = null;

  for (const model of MODEL_NAMES) {
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

      const data = await res.json();
      return data.content[0]?.text ?? "";
    } catch (err: any) {
      lastError = err;
      continue;
    }
  }

  throw lastError ?? new Error("Anthropic API failed");
}
