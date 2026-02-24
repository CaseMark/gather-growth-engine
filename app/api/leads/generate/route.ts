import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { decrypt } from "@/lib/encryption";
import { callAnthropic } from "@/lib/anthropic";
import { getAggregatedMemory } from "@/lib/performance-memory";
import { parsePlaybook } from "@/lib/playbook";

// Allow up to 60s so a few Anthropic calls can finish (Vercel Pro; Hobby may still cap at 10s)
export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { batchId, offset: offsetParam, limit: limitParam, campaignId: campaignIdParam } = body as { batchId: string; offset?: number; limit?: number; campaignId?: string };

    if (!batchId) {
      return NextResponse.json({ error: "batchId is required" }, { status: 400 });
    }
    const offset = Math.max(0, Number(offsetParam) || 0);
    // Haiku + parallel: each lead ~1–2s. 10 parallel ≈ 10–15s total per chunk.
    const CHUNK_SIZE = 10;
    const limit = Math.min(CHUNK_SIZE, Math.max(1, Number(limitParam) || CHUNK_SIZE));

    const workspace = await prisma.workspace.findUnique({
      where: { userId: session.user.id },
      select: { id: true, anthropicKey: true, anthropicModel: true, productSummary: true, icp: true, proofPointsJson: true, playbookJson: true },
    });

    if (!workspace?.anthropicKey) {
      return NextResponse.json({ error: "Anthropic API key not configured." }, { status: 400 });
    }

    // When campaignId provided, use campaign's playbook/icp/proofPoints for this campaign flow
    let campaignPlaybook: string | null = null;
    let campaignIcp: string | null = null;
    let campaignProofPoints: string | null = null;
    if (campaignIdParam) {
      const camp = await prisma.campaign.findFirst({
        where: { id: campaignIdParam, workspaceId: workspace.id },
        select: { playbookJson: true, icp: true, proofPointsJson: true },
      });
      if (camp) {
        campaignPlaybook = camp.playbookJson;
        campaignIcp = camp.icp;
        campaignProofPoints = camp.proofPointsJson;
      }
    }

    const batch = await prisma.leadBatch.findFirst({
      where: { id: batchId, workspaceId: workspace.id },
      include: { leads: true },
    });

    if (!batch) {
      return NextResponse.json({ error: "Batch not found" }, { status: 404 });
    }

    // Only process leads that don't have personalized steps yet (resume without redoing)
    const needsWork = batch.leads.filter((l) => !l.stepsJson || l.stepsJson.trim() === "" || l.stepsJson === "[]");
    const total = needsWork.length;
    const chunk = needsWork.slice(offset, offset + limit);
    if (chunk.length === 0) {
      return NextResponse.json({ done: 0, total, message: total === 0 ? "No leads to personalize." : "No leads in range." });
    }

    const playbookSource = campaignPlaybook ?? workspace.playbookJson;
    const parsed = parsePlaybook(playbookSource);
    if (!parsed) {
      return NextResponse.json({ error: "Invalid playbook. Define guidelines first." }, { status: 400 });
    }

    const { numSteps, guidelines, legacySteps } = parsed;
    const stepKeys = Array.from({ length: numSteps }, (_, i) => `step${i + 1}`).join(", ");
    const stepExample = Array.from({ length: numSteps }, (_, i) => `"step${i + 1}": {"subject": "...", "body": "..."}`).join(", ");

    const structureBlock = guidelines?.structure
      ? `\nPlaybook structure (follow this flow, but write completely custom content for this lead):\n${guidelines.structure}\nTone: ${guidelines.tone}`
      : legacySteps?.length
        ? `\nRough flow (adapt freely, write custom content): ${legacySteps.map((s, i) => `Step ${i + 1}: ${(s.subject || "").slice(0, 50)}`).join(" → ")}`
        : "";

    const anthropicKey = decrypt(workspace.anthropicKey);
    // Use Haiku for lead generation: 4-5x faster than Sonnet, still good for structured email output
    const model = "claude-haiku-4-5";
    const productSummary = workspace.productSummary ?? "";
    const icp = (campaignIcp ?? workspace.icp) ?? "";

    const proofPointsJsonSource = campaignProofPoints ?? workspace.proofPointsJson;
    let proofPointsText = "";
    if (proofPointsJsonSource) {
      try {
        const arr = JSON.parse(proofPointsJsonSource) as Array<{ title?: string; text: string }>;
        if (Array.isArray(arr) && arr.length > 0) {
          proofPointsText = "\nProof points (weave in where relevant): " + arr.map((p) => (p.title ? `${p.title}: ${p.text}` : p.text)).join("; ");
        }
      } catch {
        proofPointsText = "";
      }
    }

    let memory: Awaited<ReturnType<typeof getAggregatedMemory>> | null = null;
    try {
      memory = await getAggregatedMemory(workspace.id);
    } catch {
      memory = null;
    }

    const processLead = async (lead: (typeof chunk)[0]) => {
      let strategyBlock = "";
      if (memory && (lead.persona || lead.vertical)) {
        const parts: string[] = [];
        if (lead.persona && memory.byPersona[lead.persona]) {
          const p = memory.byPersona[lead.persona];
          parts.push(`Persona "${lead.persona}": open rate ${p.open_rate_pct_avg ?? "?"}%, click rate ${p.click_rate_pct_avg ?? "?"}%, ${p.positive_reply_count ?? 0} positive replies`);
        }
        if (lead.vertical && memory.byVertical[lead.vertical]) {
          const v = memory.byVertical[lead.vertical];
          parts.push(`Vertical "${lead.vertical}": open rate ${v.open_rate_pct_avg ?? "?"}%, click rate ${v.click_rate_pct_avg ?? "?"}%, ${v.positive_reply_count ?? 0} positive replies`);
        }
        if (parts.length > 0) {
          strategyBlock = "\n\nPerformance so far for this segment (use to tailor tone and emphasis): " + parts.join("; ");
        }
      }

      const prompt = `You are writing a HYPER-PERSONALIZED cold outreach sequence (${numSteps} emails) for ONE specific lead. Write COMPLETELY custom emails for this person — not templates. Each email should feel like it was written specifically for them based on their role, company, industry, and how your product helps people like them.

Product summary: ${productSummary}
ICP: ${icp}${proofPointsText}${structureBlock}${strategyBlock}

THIS LEAD:
- Email: ${lead.email}
- Name: ${lead.name ?? "unknown"}
- Job title: ${lead.jobTitle ?? "unknown"}
- Company: ${lead.company ?? "unknown"}
- Industry: ${lead.industry ?? "unknown"}${lead.persona || lead.vertical ? `\n- Persona: ${lead.persona ?? ""}\n- Vertical: ${lead.vertical ?? ""}` : ""}

Write ${numSteps} emails. Use their real name, company, and context throughout. Do NOT use placeholders like {{firstName}} — write "Hey, ${(lead.name ?? "there").split(/\s+/)[0] || "there"}," etc. Tailor each email to their specific situation. Make it feel 1:1.

Respond with ONLY a valid JSON object with keys ${stepKeys}. Each step: { "subject": "...", "body": "..." }
Example: {${stepExample}}`;

      let usage = { input_tokens: 0, output_tokens: 0 };
      try {
        const { text: raw, usage: u } = await callAnthropic(anthropicKey, prompt, { maxTokens: 2400, model });
        if (u) usage = u;
        let jsonStr = raw.trim();
        const codeBlock = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
        if (codeBlock) jsonStr = codeBlock[1].trim();
        const parsed = JSON.parse(jsonStr) as Record<string, { subject?: string; body?: string }>;

        const stepsArray = Array.from({ length: numSteps }, (_, i) => {
          const key = `step${i + 1}`;
          const step = parsed[key];
          return {
            subject: (step?.subject ?? "").trim(),
            body: (step?.body ?? "").trim(),
          };
        });
        const update: Record<string, string | null> = {
          stepsJson: JSON.stringify(stepsArray),
        };
        if (stepsArray[0]) {
          update.step1Subject = stepsArray[0].subject || null;
          update.step1Body = stepsArray[0].body || null;
        }
        if (stepsArray[1]) {
          update.step2Subject = stepsArray[1].subject || null;
          update.step2Body = stepsArray[1].body || null;
        }
        if (stepsArray[2]) {
          update.step3Subject = stepsArray[2].subject || null;
          update.step3Body = stepsArray[2].body || null;
        }

        await prisma.lead.update({
          where: { id: lead.id },
          data: update,
        });
        return { leadId: lead.id, usage };
      } catch (err) {
        console.error(`Lead ${lead.id} personalize error:`, err);
        const fallbackSteps = Array.from({ length: numSteps }, () => ({ subject: "", body: "" }));
        const fallback: Record<string, string | null> = {
          stepsJson: JSON.stringify(fallbackSteps),
          step1Subject: fallbackSteps[0]?.subject ?? null,
          step1Body: fallbackSteps[0]?.body ?? null,
          step2Subject: fallbackSteps[1]?.subject ?? null,
          step2Body: fallbackSteps[1]?.body ?? null,
          step3Subject: fallbackSteps[2]?.subject ?? null,
          step3Body: fallbackSteps[2]?.body ?? null,
        };
        await prisma.lead.update({
          where: { id: lead.id },
          data: fallback,
        });
        return { leadId: lead.id, usage };
      }
    };

    const results = await Promise.all(chunk.map(processLead));
    const leadIds = results.map((r) => r.leadId);
    const usageTotal = results.reduce(
      (acc, r) => ({
        input_tokens: acc.input_tokens + r.usage.input_tokens,
        output_tokens: acc.output_tokens + r.usage.output_tokens,
      }),
      { input_tokens: 0, output_tokens: 0 }
    );

    return NextResponse.json({
      done: chunk.length,
      total,
      leadIds,
      usage: usageTotal.input_tokens > 0 || usageTotal.output_tokens > 0 ? usageTotal : undefined,
      message: `Personalized ${chunk.length} lead(s), ${numSteps} steps each.`,
    });
  } catch (error: any) {
    console.error("Leads generate error:", error);
    return NextResponse.json(
      { error: error?.message ?? "Internal server error" },
      { status: 500 }
    );
  }
}
