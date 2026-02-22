import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { decrypt } from "@/lib/encryption";
import { callAnthropic } from "@/lib/anthropic";
import { getAggregatedMemory } from "@/lib/performance-memory";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const workspace = await prisma.workspace.findUnique({
      where: { userId: session.user.id },
      select: { icp: true, proofPointsJson: true, playbookJson: true, playbookApproved: true },
    });

    if (!workspace) {
      return NextResponse.json({ icp: null, proofPoints: [], playbook: null, playbookApproved: false }, { status: 200 });
    }

    let playbook = null;
    if (workspace.playbookJson) {
      try {
        playbook = JSON.parse(workspace.playbookJson);
      } catch {
        playbook = null;
      }
    }

    let proofPoints: Array<{ title?: string; text: string }> = [];
    if (workspace.proofPointsJson) {
      try {
        const parsed = JSON.parse(workspace.proofPointsJson);
        if (Array.isArray(parsed)) proofPoints = parsed.filter((p: unknown) => p && typeof (p as any).text === "string");
      } catch {
        proofPoints = [];
      }
    }

    return NextResponse.json({
      icp: workspace.icp,
      proofPoints,
      playbook,
      playbookApproved: workspace.playbookApproved ?? false,
    });
  } catch (error) {
    console.error("Playbook GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();

    // Approve playbook
    if (body.approve === true) {
      await prisma.workspace.update({
        where: { userId: session.user.id },
        data: { playbookApproved: true },
      });
      return NextResponse.json({ message: "Playbook approved", playbookApproved: true });
    }

    // Save proof points only
    if (body.proofPoints && Array.isArray(body.proofPoints)) {
      const valid = body.proofPoints.every(
        (p: unknown) => p && typeof (p as { text?: string }).text === "string"
      );
      if (!valid) {
        return NextResponse.json({ error: "Each proof point must have a text field." }, { status: 400 });
      }
      const toStore = body.proofPoints.map((p: { title?: string; text: string }) => ({
        title: typeof p.title === "string" ? p.title : undefined,
        text: String(p.text),
      }));
      await prisma.workspace.update({
        where: { userId: session.user.id },
        data: { proofPointsJson: JSON.stringify(toStore), playbookApproved: false },
      });
      return NextResponse.json({ message: "Proof points saved", proofPoints: toStore });
    }

    // Save edited playbook (no AI)
    if (body.playbook && typeof body.playbook === "object" && Array.isArray(body.playbook.steps)) {
      const steps = body.playbook.steps as Array<{ stepNumber: number; subject: string; body: string; delayDays: number }>;
      const valid = steps.every(
        (s) => typeof s.stepNumber === "number" && typeof s.subject === "string" && typeof s.body === "string" && typeof s.delayDays === "number"
      );
      if (!valid) {
        return NextResponse.json({ error: "Invalid playbook steps format." }, { status: 400 });
      }
      await prisma.workspace.update({
        where: { userId: session.user.id },
        data: { playbookJson: JSON.stringify({ steps }), playbookApproved: false },
      });
      return NextResponse.json({ message: "Playbook updated", playbook: { steps } });
    }

    // Generate playbook from ICP
    const { icp, numSteps: requestedSteps, proofPoints: bodyProofPoints } = body;
    if (!icp || typeof icp !== "string") {
      return NextResponse.json(
        { error: "ICP (Ideal Customer Profile) is required to generate playbook." },
        { status: 400 }
      );
    }
    const numSteps = [3, 4, 5].includes(Number(requestedSteps)) ? Number(requestedSteps) : 3;

    const workspace = await prisma.workspace.findUnique({
      where: { userId: session.user.id },
    });

    if (!workspace?.productSummary) {
      return NextResponse.json(
        { error: "Product summary required. Please crawl your website first." },
        { status: 400 }
      );
    }

    if (!workspace.anthropicKey) {
      return NextResponse.json({ error: "Anthropic API key not configured." }, { status: 400 });
    }

    // Resolve proof points: from body or existing workspace
    let proofPointsForPrompt: Array<{ title?: string; text: string }> = [];
    if (Array.isArray(bodyProofPoints) && bodyProofPoints.length > 0) {
      proofPointsForPrompt = bodyProofPoints
        .filter((p: unknown) => p && typeof (p as { text?: string }).text === "string")
        .map((p: { title?: string; text: string }) => ({ title: typeof p.title === "string" ? p.title : undefined, text: String(p.text) }));
    } else if (workspace.proofPointsJson) {
      try {
        const parsed = JSON.parse(workspace.proofPointsJson);
        if (Array.isArray(parsed)) proofPointsForPrompt = parsed.filter((p: unknown) => p && typeof (p as { text?: string }).text === "string");
      } catch {
        proofPointsForPrompt = [];
      }
    }

    const anthropicKey = decrypt(workspace.anthropicKey);

    const delayDaysExamples: Record<number, number[]> = {
      3: [0, 3, 5],
      4: [0, 3, 5, 7],
      5: [0, 3, 5, 7, 10],
    };
    const delays = delayDaysExamples[numSteps];
    const stepsJson = delays
      .map(
        (d, i) =>
          `    { "stepNumber": ${i + 1}, "subject": "...", "body": "...", "delayDays": ${d} }`
      )
      .join(",\n");

    const proofBlock =
      proofPointsForPrompt.length > 0
        ? `\nProof points (use where relevant in the sequence):\n${proofPointsForPrompt.map((p) => (p.title ? `- ${p.title}: ${p.text}` : `- ${p.text}`)).join("\n")}\n`
        : "";

    let strategyBlock = "";
    try {
      const memory = await getAggregatedMemory(workspace.id);
      const personaParts = Object.entries(memory.byPersona).map(([k, v]) => `${k}: open ${v.open_rate_pct_avg ?? "?"}%, positive ${v.positive_reply_count ?? 0}`).join("; ");
      const verticalParts = Object.entries(memory.byVertical).map(([k, v]) => `${k}: open ${v.open_rate_pct_avg ?? "?"}%, positive ${v.positive_reply_count ?? 0}`).join("; ");
      if (personaParts || verticalParts) {
        strategyBlock = "\n\nPerformance so far (prefer tone and structure that have worked): By persona: " + (personaParts || "none") + ". By vertical: " + (verticalParts || "none") + ".";
      }
    } catch {
      strategyBlock = "";
    }

    const prompt = `You are an expert outbound sales copywriter. Create an email playbook (sequence) for cold outreach.

Product summary:
${workspace.productSummary}

Ideal Customer Profile (ICP):
${icp}
${proofBlock}${strategyBlock}

Respond with ONLY a valid JSON object, no other text. Use this exact structure with exactly ${numSteps} steps:
{
  "steps": [
${stepsJson}
  ]
}

Rules: stepNumber 1 to ${numSteps}. delayDays for each step: ${delays.join(", ")}. Keep subjects short and intriguing. Keep bodies concise (2-4 short paragraphs), conversational, and personalized to the ICP. Use placeholders like {{firstName}}, {{company}}, {{senderName}} where appropriate.`;

    const { text: rawText } = await callAnthropic(anthropicKey, prompt, { maxTokens: 2000 });

    // Parse JSON from response (handle markdown code blocks)
    let jsonStr = rawText.trim();
    const codeBlock = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (codeBlock) jsonStr = codeBlock[1].trim();

    let playbookObj: { steps: Array<{ stepNumber: number; subject: string; body: string; delayDays: number }> };
    try {
      playbookObj = JSON.parse(jsonStr);
    } catch {
      return NextResponse.json(
        { error: "Failed to parse generated playbook. Please try again." },
        { status: 500 }
      );
    }

    if (!playbookObj?.steps || !Array.isArray(playbookObj.steps)) {
      return NextResponse.json(
        { error: "Invalid playbook format from agent." },
        { status: 500 }
      );
    }

    await prisma.workspace.update({
      where: { userId: session.user.id },
      data: {
        icp,
        ...(Array.isArray(bodyProofPoints) && bodyProofPoints.length > 0
          ? { proofPointsJson: JSON.stringify(proofPointsForPrompt) }
          : {}),
        playbookJson: JSON.stringify(playbookObj),
        playbookApproved: false,
      },
    });

    return NextResponse.json({
      message: "Playbook generated",
      playbook: playbookObj,
    });
  } catch (error: any) {
    console.error("Playbook POST error:", error);
    return NextResponse.json(
      { error: error?.message ?? "Internal server error" },
      { status: 500 }
    );
  }
}
