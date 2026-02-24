import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { decrypt } from "@/lib/encryption";
import { callAnthropic } from "@/lib/anthropic";
import { parsePlaybook } from "@/lib/playbook";

/**
 * POST /api/playbook/samples
 * Body: { campaignId?: string, guidelines?: { tone, structure, numSteps, stepDelays } }
 * Generates sample email sequences for 2–3 different ICP personas.
 * Uses guidelines from body, or from campaign/workspace playbook.
 */
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const { campaignId, guidelines: bodyGuidelines } = body as {
      campaignId?: string;
      guidelines?: { tone?: string; structure?: string; numSteps?: number; stepDelays?: number[] };
    };

    const workspace = await prisma.workspace.findUnique({
      where: { userId: session.user.id },
      select: {
        id: true,
        anthropicKey: true,
        anthropicModel: true,
        productSummary: true,
        icp: true,
        proofPointsJson: true,
        playbookJson: true,
      },
    });

    if (!workspace?.anthropicKey) {
      return NextResponse.json({ error: "Anthropic API key not configured." }, { status: 400 });
    }

    let parsed: ReturnType<typeof parsePlaybook>;
    if (bodyGuidelines?.structure) {
      const numSteps = Math.min(10, Math.max(1, bodyGuidelines.numSteps ?? 3));
      const stepDelays = Array.isArray(bodyGuidelines.stepDelays) && bodyGuidelines.stepDelays.length >= numSteps
        ? bodyGuidelines.stepDelays.slice(0, numSteps)
        : [0, 3, 5, 7, 10].slice(0, numSteps);
      parsed = { numSteps, stepDelays, guidelines: { tone: bodyGuidelines.tone ?? "", structure: bodyGuidelines.structure, numSteps, stepDelays } };
    } else {
      let playbookSource = workspace.playbookJson;
      if (campaignId) {
        const campaign = await prisma.campaign.findFirst({
          where: { id: campaignId, workspaceId: workspace.id },
          select: { playbookJson: true, icp: true },
        });
        if (campaign?.playbookJson) playbookSource = campaign.playbookJson;
      }
      parsed = parsePlaybook(playbookSource);
    }
    if (!parsed) {
      return NextResponse.json(
        { error: "No playbook found. Define guidelines first." },
        { status: 400 }
      );
    }

    const { numSteps, guidelines, legacySteps } = parsed;
    const productSummary = workspace.productSummary ?? "";
    const icp = workspace.icp ?? "";

    let proofPointsText = "";
    if (workspace.proofPointsJson) {
      try {
        const arr = JSON.parse(workspace.proofPointsJson) as Array<{ title?: string; text: string }>;
        if (Array.isArray(arr) && arr.length > 0) {
          proofPointsText = "\nProof points: " + arr.map((p) => (p.title ? `${p.title}: ${p.text}` : p.text)).join("; ");
        }
      } catch {
        //
      }
    }

    const structureBlock = guidelines?.structure
      ? `\nStructure: ${guidelines.structure}\nTone: ${guidelines.tone}`
      : legacySteps?.length
        ? `\nRough structure (adapt freely): ${legacySteps.map((s, i) => `Step ${i + 1}: ${(s.subject || "").slice(0, 60)}`).join(" | ")}`
        : "";

    const prompt = `You are an expert outbound sales copywriter. Generate SAMPLE email sequences for 3 different ICP personas. These are examples of what hyper-personalized sequences would look like for different types of leads.

Product summary:
${productSummary}

Overall ICP:
${icp}
${proofPointsText}
${structureBlock}

Create 3 sample sequences. Each sequence has ${numSteps} emails. For each persona, write COMPLETE, ready-to-send emails (subject + body) — not templates or placeholders. Use real names, companies, and specifics as if writing to a real person in that role.

Personas to use:
1. VP Sales at a mid-market SaaS company (e.g. Sarah Chen, Acme Analytics)
2. CTO at an enterprise (e.g. James Mitchell, GlobalCorp)
3. Head of Marketing at a B2B startup (e.g. Maya Patel, GrowthLabs)

Respond with ONLY a valid JSON object:
{
  "samples": [
    {
      "persona": "VP Sales at mid-market SaaS",
      "exampleLead": { "name": "Sarah Chen", "company": "Acme Analytics", "jobTitle": "VP Sales", "industry": "SaaS" },
      "steps": [ { "subject": "...", "body": "..." }, ... ]
    },
    {
      "persona": "CTO at enterprise",
      "exampleLead": { "name": "James Mitchell", "company": "GlobalCorp", "jobTitle": "CTO", "industry": "Enterprise" },
      "steps": [ { "subject": "...", "body": "..." }, ... ]
    },
    {
      "persona": "Head of Marketing at B2B startup",
      "exampleLead": { "name": "Maya Patel", "company": "GrowthLabs", "jobTitle": "Head of Marketing", "industry": "B2B" },
      "steps": [ { "subject": "...", "body": "..." }, ... ]
    }
  ]
}

Each steps array must have exactly ${numSteps} items. Write real, personalized content for each persona.`;

    const anthropicKey = decrypt(workspace.anthropicKey);
    const model = workspace.anthropicModel ?? undefined;
    const { text: raw } = await callAnthropic(anthropicKey, prompt, { maxTokens: 4000, model });

    let jsonStr = raw.trim();
    const codeBlock = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (codeBlock) jsonStr = codeBlock[1].trim();

    const parsedResponse = JSON.parse(jsonStr) as {
      samples?: Array<{
        persona: string;
        exampleLead?: { name: string; company: string; jobTitle: string; industry?: string };
        steps: Array<{ subject: string; body: string }>;
      }>;
    };

    const samples = parsedResponse.samples ?? [];
    if (samples.length === 0) {
      return NextResponse.json({ error: "Failed to generate samples." }, { status: 500 });
    }

    return NextResponse.json({ samples });
  } catch (err) {
    console.error("Playbook samples error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to generate samples" },
      { status: 500 }
    );
  }
}
