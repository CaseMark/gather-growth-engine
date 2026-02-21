import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { decrypt } from "@/lib/encryption";
import { callAnthropic } from "@/lib/anthropic";
import { getAggregatedMemory } from "@/lib/performance-memory";

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { batchId } = body as { batchId: string };

    if (!batchId) {
      return NextResponse.json({ error: "batchId is required" }, { status: 400 });
    }

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

    let playbook: { steps: Array<{ subject: string; body: string; delayDays: number }> };
    try {
      playbook = workspace.playbookJson ? JSON.parse(workspace.playbookJson) : { steps: [] };
    } catch {
      return NextResponse.json({ error: "Invalid playbook. Generate and approve a playbook first." }, { status: 400 });
    }

    const steps = playbook.steps.slice(0, 3); // up to 3 steps
    if (steps.length === 0) {
      return NextResponse.json({ error: "Playbook has no steps." }, { status: 400 });
    }

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

    for (const lead of batch.leads) {
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

Respond with ONLY a valid JSON object with keys step1, step2, step3 (only include steps that exist in the templates above). Each step: { "subject": "...", "body": "..." }
Example: {"step1": {"subject": "...", "body": "..."}, "step2": {"subject": "...", "body": "..."}, "step3": {"subject": "...", "body": "..."}}`;

      try {
        const raw = await callAnthropic(anthropicKey, prompt, { maxTokens: 2400 });
        let jsonStr = raw.trim();
        const codeBlock = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
        if (codeBlock) jsonStr = codeBlock[1].trim();
        const parsed = JSON.parse(jsonStr) as Record<string, { subject?: string; body?: string }>;

        const update: Record<string, string | null> = {};
        if (steps[0]) {
          update.step1Subject = (parsed.step1?.subject ?? steps[0].subject) || null;
          update.step1Body = (parsed.step1?.body ?? steps[0].body) || null;
        }
        if (steps[1]) {
          update.step2Subject = (parsed.step2?.subject ?? steps[1].subject) || null;
          update.step2Body = (parsed.step2?.body ?? steps[1].body) || null;
        }
        if (steps[2]) {
          update.step3Subject = (parsed.step3?.subject ?? steps[2].subject) || null;
          update.step3Body = (parsed.step3?.body ?? steps[2].body) || null;
        }

        await prisma.lead.update({
          where: { id: lead.id },
          data: update,
        });
      } catch (err) {
        console.error(`Lead ${lead.id} personalize error:`, err);
        const fallback: Record<string, string | null> = {};
        if (steps[0]) {
          fallback.step1Subject = steps[0].subject;
          fallback.step1Body = steps[0].body;
        }
        if (steps[1]) {
          fallback.step2Subject = steps[1].subject;
          fallback.step2Body = steps[1].body;
        }
        if (steps[2]) {
          fallback.step3Subject = steps[2].subject;
          fallback.step3Body = steps[2].body;
        }
        await prisma.lead.update({
          where: { id: lead.id },
          data: fallback,
        });
      }
    }

    return NextResponse.json({
      done: true,
      count: batch.leads.length,
      message: `Personalized ${batch.leads.length} emails.`,
    });
  } catch (error: any) {
    console.error("Leads generate error:", error);
    return NextResponse.json(
      { error: error?.message ?? "Internal server error" },
      { status: 500 }
    );
  }
}
