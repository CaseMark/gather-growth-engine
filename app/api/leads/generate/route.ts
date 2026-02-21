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

    const step1 = playbook.steps[0];
    if (!step1) {
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

      const prompt = `You are writing a personalized cold outreach email for one lead. Use the template below but adapt the subject and body so they feel personal to this specific lead (use their name, company, job title, industry). Keep the same structure and length. Use placeholders {{firstName}} for first name (derive from name or email), {{company}} for company, {{senderName}} for the sender (we'll fill later).

Product summary: ${productSummary}
ICP we're targeting: ${icp}${proofPointsText}${strategyBlock}

Lead:
- Email: ${lead.email}
- Name: ${lead.name ?? "unknown"}
- Job title: ${lead.jobTitle ?? "unknown"}
- Company: ${lead.company ?? "unknown"}
- Industry: ${lead.industry ?? "unknown"}${lead.persona || lead.vertical ? `\n- Persona: ${lead.persona ?? ""}\n- Vertical: ${lead.vertical ?? ""}` : ""}

Template subject: ${step1.subject}
Template body: ${step1.body}

Respond with ONLY a valid JSON object, no other text:
{"subject": "personalized subject line", "body": "personalized email body"}`;

      try {
        const raw = await callAnthropic(anthropicKey, prompt, { maxTokens: 800 });
        let jsonStr = raw.trim();
        const codeBlock = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
        if (codeBlock) jsonStr = codeBlock[1].trim();
        const parsed = JSON.parse(jsonStr) as { subject: string; body: string };

        await prisma.lead.update({
          where: { id: lead.id },
          data: {
            step1Subject: parsed.subject ?? step1.subject,
            step1Body: parsed.body ?? step1.body,
          },
        });
      } catch (err) {
        console.error(`Lead ${lead.id} personalize error:`, err);
        await prisma.lead.update({
          where: { id: lead.id },
          data: {
            step1Subject: step1.subject,
            step1Body: step1.body,
          },
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
