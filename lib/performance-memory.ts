import { prisma } from "@/lib/prisma";

/**
 * Record campaign-level metrics as observations per persona/vertical (from the campaign's leads).
 * Replaces any existing observations for this campaign so re-fetching doesn't duplicate.
 */
export async function recordCampaignObservations(
  workspaceId: string,
  sentCampaignId: string,
  leadBatchId: string | null,
  metrics: { open_rate_pct: number; click_rate_pct: number; reply_count: number }
): Promise<void> {
  await prisma.performanceObservation.deleteMany({
    where: { workspaceId, sourceType: "campaign", sourceId: sentCampaignId },
  });

  if (!leadBatchId) return;

  const leads = await prisma.lead.findMany({
    where: { leadBatchId },
    select: { persona: true, vertical: true },
  });

  const personas = Array.from(new Set(leads.map((l) => l.persona).filter((x): x is string => Boolean(x))));
  const verticals = Array.from(new Set(leads.map((l) => l.vertical).filter((x): x is string => Boolean(x))));

  if (personas.length === 0 && verticals.length === 0) return;

  const toCreate: Array<{
    workspaceId: string;
    dimensionType: string;
    dimensionValue: string;
    metric: string;
    value: number;
    sourceType: string;
    sourceId: string;
  }> = [];

  for (const p of personas) {
    toCreate.push({ workspaceId, dimensionType: "persona", dimensionValue: p, metric: "open_rate_pct", value: metrics.open_rate_pct, sourceType: "campaign", sourceId: sentCampaignId });
    toCreate.push({ workspaceId, dimensionType: "persona", dimensionValue: p, metric: "click_rate_pct", value: metrics.click_rate_pct, sourceType: "campaign", sourceId: sentCampaignId });
    toCreate.push({ workspaceId, dimensionType: "persona", dimensionValue: p, metric: "reply_count", value: metrics.reply_count, sourceType: "campaign", sourceId: sentCampaignId });
  }
  for (const v of verticals) {
    toCreate.push({ workspaceId, dimensionType: "vertical", dimensionValue: v, metric: "open_rate_pct", value: metrics.open_rate_pct, sourceType: "campaign", sourceId: sentCampaignId });
    toCreate.push({ workspaceId, dimensionType: "vertical", dimensionValue: v, metric: "click_rate_pct", value: metrics.click_rate_pct, sourceType: "campaign", sourceId: sentCampaignId });
    toCreate.push({ workspaceId, dimensionType: "vertical", dimensionValue: v, metric: "reply_count", value: metrics.reply_count, sourceType: "campaign", sourceId: sentCampaignId });
  }

  if (toCreate.length > 0) {
    await prisma.performanceObservation.createMany({ data: toCreate });
  }
}

/**
 * Record a reply classification as observations (persona/vertical from matching lead by email).
 */
export async function recordReplyObservation(
  workspaceId: string,
  campaignReplyId: string,
  fromEmail: string,
  classification: string | null
): Promise<void> {
  if (!classification) return;

  const lead = await prisma.lead.findFirst({
    where: {
      leadBatch: { workspaceId },
      email: fromEmail.trim(),
    },
    select: { persona: true, vertical: true },
  });

  const metric =
    classification === "positive" ? "positive_reply_count"
    : classification === "objection" ? "objection_count"
    : classification === "ooo" ? "ooo_count"
    : classification === "not_interested" ? "not_interested_count"
    : "other_reply_count";

  const toCreate: Array<{
    workspaceId: string;
    dimensionType: string;
    dimensionValue: string;
    metric: string;
    value: number;
    sourceType: string;
    sourceId: string;
  }> = [];

  if (lead?.persona) {
    toCreate.push({ workspaceId, dimensionType: "persona", dimensionValue: lead.persona, metric, value: 1, sourceType: "reply", sourceId: campaignReplyId });
  }
  if (lead?.vertical) {
    toCreate.push({ workspaceId, dimensionType: "vertical", dimensionValue: lead.vertical, metric, value: 1, sourceType: "reply", sourceId: campaignReplyId });
  }
  if (toCreate.length === 0) {
    toCreate.push({ workspaceId, dimensionType: "persona", dimensionValue: "unknown", metric, value: 1, sourceType: "reply", sourceId: campaignReplyId });
  }

  await prisma.performanceObservation.createMany({ data: toCreate });
}

/**
 * Get aggregated performance memory for the workspace (averages for rates, sums for counts).
 */
export async function getAggregatedMemory(workspaceId: string): Promise<{
  byPersona: Record<string, { open_rate_pct_avg?: number; click_rate_pct_avg?: number; reply_count_total?: number; positive_reply_count?: number; objection_count?: number; ooo_count?: number; not_interested_count?: number }>;
  byVertical: Record<string, { open_rate_pct_avg?: number; click_rate_pct_avg?: number; reply_count_total?: number; positive_reply_count?: number; objection_count?: number; ooo_count?: number; not_interested_count?: number }>;
}> {
  const observations = await prisma.performanceObservation.findMany({
    where: { workspaceId },
    select: { dimensionType: true, dimensionValue: true, metric: true, value: true },
  });

  const rateMetrics = ["open_rate_pct", "click_rate_pct"];
  const countMetrics = ["reply_count", "positive_reply_count", "objection_count", "ooo_count", "not_interested_count", "other_reply_count"];

  const byPersona: Record<string, Record<string, number[]>> = {};
  const byVertical: Record<string, Record<string, number[]>> = {};

  for (const o of observations) {
    const bucket = o.dimensionType === "persona" ? byPersona : byVertical;
    const key = o.dimensionValue || "unknown";
    if (!bucket[key]) bucket[key] = {};
    if (!bucket[key][o.metric]) bucket[key][o.metric] = [];
    bucket[key][o.metric].push(o.value);
  }

  const aggregate = (m: Record<string, number[]>) => {
    const out: Record<string, number> = {};
    for (const [metric, values] of Object.entries(m)) {
      if (rateMetrics.includes(metric)) {
        out[metric.replace("_pct", "_pct_avg")] = values.length ? Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 10) / 10 : 0;
      } else if (countMetrics.includes(metric)) {
        const sum = values.reduce((a, b) => a + b, 0);
        out[metric === "reply_count" ? "reply_count_total" : metric] = sum;
      }
    }
    return out;
  };

  const byPersonaOut: Record<string, Record<string, number>> = {};
  for (const [k, v] of Object.entries(byPersona)) byPersonaOut[k] = aggregate(v);
  const byVerticalOut: Record<string, Record<string, number>> = {};
  for (const [k, v] of Object.entries(byVertical)) byVerticalOut[k] = aggregate(v);

  return { byPersona: byPersonaOut as any, byVertical: byVerticalOut as any };
}

type Memory = Awaited<ReturnType<typeof getAggregatedMemory>>;

/**
 * Generate one short actionable suggestion from performance memory for the strategy engine.
 */
export function getStrategySuggestion(memory: Memory): string | null {
  const personas = Object.entries(memory.byPersona).filter(
    ([_, m]) => (m.open_rate_pct_avg ?? 0) > 0 || (m.positive_reply_count ?? 0) > 0
  );
  const verticals = Object.entries(memory.byVertical).filter(
    ([_, m]) => (m.open_rate_pct_avg ?? 0) > 0 || (m.positive_reply_count ?? 0) > 0
  );

  if (personas.length >= 2) {
    const sorted = [...personas].sort(
      (a, b) => (b[1].open_rate_pct_avg ?? 0) - (a[1].open_rate_pct_avg ?? 0)
    );
    const [best, next] = sorted;
    const bestRate = best[1].open_rate_pct_avg ?? 0;
    const nextRate = next[1].open_rate_pct_avg ?? 0;
    if (bestRate >= 5 && bestRate - nextRate >= 5) {
      return `"${best[0]}" has higher open rate (${bestRate}%) than "${next[0]}" (${nextRate}%). Try more direct or curiosity-driven subject lines for ${next[0]} in future campaigns.`;
    }
  }

  if (verticals.length >= 2) {
    const sorted = [...verticals].sort(
      (a, b) => (b[1].positive_reply_count ?? 0) - (a[1].positive_reply_count ?? 0)
    );
    const [best, next] = sorted;
    const bestPos = best[1].positive_reply_count ?? 0;
    if (bestPos > 0) {
      return `Vertical "${best[0]}" has the most positive replies (${bestPos}). Double down on messaging that resonates with ${best[0]} and test similar angles for other verticals.`;
    }
  }

  if (personas.length === 1 && (personas[0][1].open_rate_pct_avg ?? 0) < 15) {
    return `Open rate for "${personas[0][0]}" is ${personas[0][1].open_rate_pct_avg}%. Try shorter subject lines or stronger hooks to improve.`;
  }

  if (personas.length > 0 || verticals.length > 0) {
    return "Keep logging replies and viewing campaign analytics to get more specific suggestions.";
  }

  return null;
}
