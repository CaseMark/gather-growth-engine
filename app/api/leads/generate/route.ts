import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { decrypt } from "@/lib/encryption";
import { callAnthropic } from "@/lib/anthropic";
import { getAggregatedMemory } from "@/lib/performance-memory";

// Allow up to 60s so a few Anthropic calls can finish (Vercel Pro; Hobby may still cap at 10s)
export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { batchId, offset: offsetParam, limit: limitParam } = body as { batchId: string; offset?: number; limit?: number };

    if (!batchId) {
      return NextResponse.json({ error: "batchId is required" }, { status: 400 });
    }
    const offset = Math.max(0, Number(offsetParam) || 0);
    // Tiny chunks: each lead = 1 Anthropic call (~3–5s). 2 leads ≈ 6–10s to stay under Vercel timeout.
    const CHUNK_SIZE = 2;
    const limit = Math.min(CHUNK_SIZE, Math.max(1, Number(limitParam) || CHUNK_SIZE));

    const workspace = await prisma.workspace.findUnique({
      where: { userId: session.user.id },
    });

    if (!workspace?.anthropicKey) {
      return NextResponse.json({ error: "Anthropic API key not configured." }, { status: 400 });
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

    let playbook: { steps: Array<{ subject: string; body: string; delayDays: number }> };
    try {
      playbook = workspace.playbookJson ? JSON.parse(workspace.playbookJson) : { steps: [] };
    } catch {
      return NextResponse.json({ error: "Invalid playbook. Generate and approve a playbook first." }, { status: 400 });
    }

    const MAX_STEPS = 10;
    const steps = playbook.steps.slice(0, MAX_STEPS);
    if (steps.length === 0) {
      return NextResponse.json({ error: "Playbook has no steps." }, { status: 400 });
    }
    const stepKeys = steps.map((_, i) => `step${i + 1}`).join(", ");
    const stepExample = steps.map((_, i) => `"step${i + 1}": {"subject": "...", "body": "..."}`).join(", ");

    const anthropicKey = decrypt(workspace.anthropicKey);
    const productSummary = workspace.productSummary ?? "";
    const icp = workspace.icp ?? "";

    let proofPointsText = "";
    if (workspace.proofPointsJson) {
      try {
        const arr = JSON.parse(workspace.proofPointsJson) as Array<{ title?: string; text: string }>;
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

    const templatesJson = steps
      .map((s, i) => `Step ${i + 1} subject: ${s.subject}\nStep ${i + 1} body: ${s.body}`)
      .join("\n\n");

    for (const lead of chunk) {
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

      const prompt = `You are writing a personalized cold outreach SEQUENCE (${steps.length} emails) for one lead. Personalize each step for this lead (use their name, company, job title, industry). Keep structure and length. Use placeholders {{firstName}}, {{company}}, {{senderName}} where needed.

Product summary: ${productSummary}
ICP: ${icp}${proofPointsText}${strategyBlock}

Lead:
- Email: ${lead.email}
- Name: ${lead.name ?? "unknown"}
- Job title: ${lead.jobTitle ?? "unknown"}
- Company: ${lead.company ?? "unknown"}
- Industry: ${lead.industry ?? "unknown"}${lead.persona || lead.vertical ? `\n- Persona: ${lead.persona ?? ""}\n- Vertical: ${lead.vertical ?? ""}` : ""}

Templates (personalize each for this lead):
${templatesJson}

Respond with ONLY a valid JSON object with keys ${stepKeys} (only include steps that exist in the templates above). Each step: { "subject": "...", "body": "..." }
Example: {${stepExample}}`;

      try {
        const raw = await callAnthropic(anthropicKey, prompt, { maxTokens: 2400 });
        let jsonStr = raw.trim();
        const codeBlock = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
        if (codeBlock) jsonStr = codeBlock[1].trim();
        const parsed = JSON.parse(jsonStr) as Record<string, { subject?: string; body?: string }>;

        const stepsArray = steps.map((s, i) => {
          const key = `step${i + 1}`;
          const step = parsed[key];
          return {
            subject: (step?.subject ?? s.subject) || "",
            body: (step?.body ?? s.body) || "",
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
      } catch (err) {
        console.error(`Lead ${lead.id} personalize error:`, err);
        const fallbackSteps = steps.map((s) => ({ subject: s.subject, body: s.body }));
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
      }
    }

    return NextResponse.json({
      done: chunk.length,
      total,
      message: `Personalized ${chunk.length} lead(s), ${steps.length} steps each.`,
    });
  } catch (error: any) {
    console.error("Leads generate error:", error);
    return NextResponse.json(
      { error: error?.message ?? "Internal server error" },
      { status: 500 }
    );
  }
}
