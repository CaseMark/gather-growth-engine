import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getInstantlyClientForUserId } from "@/lib/instantly";
import { prisma } from "@/lib/prisma";

/**
 * Create an Instantly campaign (no leads, not activated). Used for "push as we go" during Prepare.
 * Body: { batchId: string, campaignName: string, accountEmails?: string[] }
 */
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const { batchId, campaignName: campaignNameInput, accountEmails } = body as {
      batchId?: string;
      campaignName?: string;
      accountEmails?: string[];
    };
    if (!batchId || typeof batchId !== "string") {
      return NextResponse.json({ error: "batchId is required" }, { status: 400 });
    }
    const campaignNameTrimmed = (campaignNameInput ?? "").trim();
    if (!campaignNameTrimmed) {
      return NextResponse.json({ error: "Campaign name is required" }, { status: 400 });
    }
    const selectedEmails = Array.isArray(accountEmails)
      ? accountEmails.filter((e): e is string => typeof e === "string" && e.trim().length > 0).map((e) => e.trim())
      : undefined;

    const workspace = await prisma.workspace.findUnique({
      where: { userId: session.user.id },
      select: { id: true, playbookApproved: true, playbookJson: true },
    });
    if (!workspace) {
      return NextResponse.json({ error: "Workspace not found" }, { status: 404 });
    }
    if (!workspace.playbookApproved) {
      return NextResponse.json({ error: "Approve your playbook before creating a campaign." }, { status: 400 });
    }

    const batch = await prisma.leadBatch.findFirst({
      where: { id: batchId, workspaceId: workspace.id },
      select: { id: true },
    });
    if (!batch) {
      return NextResponse.json({ error: "Batch not found" }, { status: 404 });
    }

    const ctx = await getInstantlyClientForUserId(session.user.id);
    if (!ctx) {
      return NextResponse.json(
        { error: "Instantly API key not configured. Add it in onboarding." },
        { status: 400 }
      );
    }

    const { client } = ctx;
    await client.applyRampForUnwarmedAccounts({
      unwarmedDailyLimit: 5,
      warmedDailyLimit: 30,
      ...(selectedEmails != null && selectedEmails.length > 0 && { accountEmails: selectedEmails }),
    });

    const MAX_STEPS = 10;
    let playbookSteps: Array<{ subject: string; body: string; delayDays: number }> = [
      { subject: "", body: "", delayDays: 0 },
      { subject: "", body: "", delayDays: 3 },
      { subject: "", body: "", delayDays: 5 },
    ];
    try {
      const playbook = workspace.playbookJson
        ? (JSON.parse(workspace.playbookJson) as { steps?: Array<{ subject: string; body: string; delayDays: number }> })
        : null;
      if (playbook?.steps?.length) {
        playbookSteps = playbook.steps.slice(0, MAX_STEPS).map((s) => ({
          subject: s.subject ?? "",
          body: s.body ?? "",
          delayDays: typeof s.delayDays === "number" ? s.delayDays : 0,
        }));
      }
    } catch {
      // use default
    }
    const minGapDays = () => 2 + Math.floor(Math.random() * 2);
    const sequenceSteps = playbookSteps.map((s, i) => {
      const delay = i === 0 ? 0 : Math.max(s.delayDays, minGapDays());
      return {
        subject: `{{step${i + 1}_subject}}`,
        body: `{{step${i + 1}_body}}`,
        delayDays: delay,
      };
    });

    const campaignOptionsWithSequence = {
      ...(selectedEmails != null && selectedEmails.length > 0 ? { email_list: selectedEmails } : {}),
      ...(sequenceSteps.length > 0 ? { sequenceSteps } : {}),
    };

    const created = await client.createCampaign(campaignNameTrimmed, campaignOptionsWithSequence);
    const campaignId = created.id;
    if (!campaignId) {
      return NextResponse.json({ error: "Instantly did not return campaign id" }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      campaignId,
      campaignName: campaignNameTrimmed,
      message: "Campaign created. Add leads with the add-leads API; activate in Instantly when ready.",
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to create campaign";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
