/**
 * Shared lead classification logic.
 * Used by both the classify API route and the generate route (auto-classify).
 */

import { prisma } from "@/lib/prisma";
import { callAnthropic } from "@/lib/anthropic";

const CLASSIFY_CHUNK_SIZE = 30;

export type ClassifyOptions = {
  workspaceId: string;
  batchId: string;
  icp: string;
  anthropicKey: string;
  model?: string;
  offset?: number;
  limit?: number;
};

export type ClassifyResult = {
  classified: number;
  total: number;
  usage: { input_tokens: number; output_tokens: number };
};

/**
 * Classify leads in a batch (persona + vertical).
 * Only processes leads that don't have persona or vertical yet.
 */
export async function classifyLeads(opts: ClassifyOptions): Promise<ClassifyResult> {
  const { workspaceId, batchId, icp, anthropicKey, model, offset = 0, limit = 300 } = opts;

  const batch = await prisma.leadBatch.findFirst({
    where: { id: batchId, workspaceId },
    include: { leads: true },
  });

  if (!batch) {
    throw new Error("Batch not found");
  }

  const needsWork = batch.leads.filter((l) => !l.persona || !l.vertical);
  const total = needsWork.length;
  const leads = needsWork.slice(offset, offset + limit);

  if (leads.length === 0) {
    return { classified: 0, total, usage: { input_tokens: 0, output_tokens: 0 } };
  }

  let classified = 0;
  let usageTotal = { input_tokens: 0, output_tokens: 0 };

  for (let i = 0; i < leads.length; i += CLASSIFY_CHUNK_SIZE) {
    const chunk = leads.slice(i, i + CLASSIFY_CHUNK_SIZE);
    const leadList = chunk
      .map(
        (l) =>
          `- ${l.email} | name: ${l.name ?? ""} | job: ${l.jobTitle ?? ""} | company: ${l.company ?? ""} | industry: ${l.industry ?? ""}`
      )
      .join("\n");

    const prompt = `You are classifying leads for outbound sales. Given the Ideal Customer Profile (ICP) and a list of leads, assign each lead a short "persona" label (e.g. VP Sales, Marketing Lead, SMB Owner) and a "vertical" label (e.g. SaaS, Healthcare, Fintech) that best match the ICP. Use concise labels (1-3 words each).

ICP:
${icp}

Leads (email | name | job | company | industry):
${leadList}

Respond with ONLY a valid JSON array, no other text. One object per lead in the same order as above. Each object: { "email": "...", "persona": "...", "vertical": "..." }
Example: [{"email":"a@b.com","persona":"VP Sales","vertical":"SaaS"},...]`;

    const { text: raw, usage } = await callAnthropic(anthropicKey, prompt, { maxTokens: 2000, model });
    if (usage) {
      usageTotal.input_tokens += usage.input_tokens;
      usageTotal.output_tokens += usage.output_tokens;
    }

    let jsonStr = raw.trim();
    const codeBlock = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (codeBlock) jsonStr = codeBlock[1].trim();

    let results: Array<{ email: string; persona?: string; vertical?: string }>;
    try {
      results = JSON.parse(jsonStr);
    } catch {
      continue;
    }

    if (!Array.isArray(results)) continue;

    const byEmail = new Map(chunk.map((l) => [l.email.trim().toLowerCase(), l]));
    for (const r of results) {
      if (!r || typeof r.email !== "string") continue;
      const lead = byEmail.get(r.email.trim().toLowerCase());
      if (!lead) continue;
      await prisma.lead.update({
        where: { id: lead.id },
        data: {
          persona: typeof r.persona === "string" ? r.persona.trim() || null : null,
          vertical: typeof r.vertical === "string" ? r.vertical.trim() || null : null,
        },
      });
      classified++;
    }
  }

  return { classified, total, usage: usageTotal };
}
