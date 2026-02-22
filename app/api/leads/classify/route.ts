import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { decrypt } from "@/lib/encryption";
import { callAnthropic } from "@/lib/anthropic";

const CLASSIFY_CHUNK_SIZE = 30;

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { batchId, offset: offsetParam, limit: limitParam } = body as { batchId?: string; offset?: number; limit?: number };

    if (!batchId || typeof batchId !== "string") {
      return NextResponse.json({ error: "batchId is required" }, { status: 400 });
    }
    const offset = Math.max(0, Number(offsetParam) || 0);
    const limit = Math.min(300, Math.max(CLASSIFY_CHUNK_SIZE, Number(limitParam) || 300));

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

    const icp = workspace.icp ?? "";
    if (!icp.trim()) {
      return NextResponse.json({ error: "ICP not set. Set your Ideal Customer Profile in the playbook first." }, { status: 400 });
    }

    const anthropicKey = decrypt(workspace.anthropicKey);
    const model = workspace.anthropicModel?.trim() || undefined;
    // Only process leads not yet classified (resume without redoing)
    const needsWork = batch.leads.filter((l) => !l.persona || !l.vertical);
    const total = needsWork.length;
    const leads = needsWork.slice(offset, offset + limit);
    if (leads.length === 0) {
      return NextResponse.json({ done: 0, total, classified: 0, message: total === 0 ? "All leads already classified." : "No leads in range." });
    }

    let classified = 0;
    let totalInputTokens = 0;
    let totalOutputTokens = 0;

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

      const { text: raw, usage: chunkUsage } = await callAnthropic(anthropicKey, prompt, { maxTokens: 2000, model });
      if (chunkUsage) {
        totalInputTokens += chunkUsage.input_tokens;
        totalOutputTokens += chunkUsage.output_tokens;
      }
      let jsonStr = raw.trim();
      const codeBlock = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (codeBlock) jsonStr = codeBlock[1].trim();

      let results: Array<{ email: string; persona?: string; vertical?: string }>;
      try {
        results = JSON.parse(jsonStr);
      } catch {
        continue; // skip chunk on parse error
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

    return NextResponse.json({
      done: leads.length,
      total,
      classified,
      usage:
        totalInputTokens + totalOutputTokens > 0
          ? { input_tokens: totalInputTokens, output_tokens: totalOutputTokens }
          : undefined,
      message: `Classified ${classified} leads with persona and vertical.`,
    });
  } catch (error) {
    console.error("Leads classify error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
