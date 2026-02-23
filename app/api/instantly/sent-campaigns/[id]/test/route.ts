import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getInstantlyClientForUserId } from "@/lib/instantly";
import { prisma } from "@/lib/prisma";

/**
 * POST /api/instantly/sent-campaigns/[id]/test
 * Body: { testEmail: string }
 * Adds one lead (test email) to the existing Instantly campaign using a lead that has step content.
 * The test recipient will get the same multi-step sequence as the original campaign.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: sentId } = await params;
    if (!sentId) {
      return NextResponse.json({ error: "Sent campaign id required" }, { status: 400 });
    }

    const body = await request.json().catch(() => ({}));
    const testEmail = typeof body.testEmail === "string" ? body.testEmail.trim() : "";
    if (!testEmail || !testEmail.includes("@")) {
      return NextResponse.json({ error: "Valid testEmail is required" }, { status: 400 });
    }

    const workspace = await prisma.workspace.findUnique({
      where: { userId: session.user.id },
      select: { id: true },
    });
    if (!workspace) {
      return NextResponse.json({ error: "Workspace not found" }, { status: 404 });
    }

    const sent = await prisma.sentCampaign.findFirst({
      where: { id: sentId, workspaceId: workspace.id },
      include: {
        leadBatch: {
          include: {
            leads: {
              select: {
                id: true,
                email: true,
                step1Subject: true,
                step1Body: true,
                step2Subject: true,
                step2Body: true,
                step3Subject: true,
                step3Body: true,
                stepsJson: true,
              },
              orderBy: { createdAt: "asc" },
              take: 500,
            },
          },
        },
      },
    });

    if (!sent) {
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
    }
    if (!sent.instantlyCampaignId) {
      return NextResponse.json({ error: "This campaign has no Instantly campaign ID" }, { status: 400 });
    }
    const leads = sent.leadBatch?.leads ?? [];
    if (leads.length === 0) {
      return NextResponse.json({ error: "No leads in this campaign" }, { status: 400 });
    }

    const ctx = await getInstantlyClientForUserId(session.user.id);
    if (!ctx) {
      return NextResponse.json(
        { error: "Instantly API key not configured. Add it in Settings." },
        { status: 400 }
      );
    }

    type LeadRow = (typeof leads)[0];
    const getSteps = (lead: LeadRow): Array<{ subject: string; body: string }> => {
      if (lead.stepsJson) {
        try {
          const arr = JSON.parse(lead.stepsJson) as Array<{ subject?: string; body?: string }>;
          if (Array.isArray(arr) && arr.length > 0) {
            return arr.map((s) => ({ subject: s.subject ?? "", body: s.body ?? "" }));
          }
        } catch {
          //
        }
      }
      return [
        { subject: lead.step1Subject ?? "", body: lead.step1Body ?? "" },
        { subject: lead.step2Subject ?? "", body: lead.step2Body ?? "" },
        { subject: lead.step3Subject ?? "", body: lead.step3Body ?? "" },
      ].filter((s) => (s.subject ?? "").trim() || (s.body ?? "").trim());
    };

    const templateLead = leads.find((l) => getSteps(l).length > 0);
    if (!templateLead) {
      return NextResponse.json(
        { error: "No leads in this campaign have email content (all have blank subject/body). There’s nothing to send as a test." },
        { status: 400 }
      );
    }

    const steps = getSteps(templateLead);

    const bodyWithLineBreaks = (text: string) =>
      (text ?? "").replace(/\r\n/g, "\n").replace(/\n/g, "<br>\n");

    const custom_variables: Record<string, string> = {};
    steps.forEach((s, i) => {
      custom_variables[`step${i + 1}_subject`] = s.subject ?? "";
      custom_variables[`step${i + 1}_body`] = bodyWithLineBreaks(s.body ?? "").trim();
    });

    await ctx.client.bulkAddLeadsToCampaign(
      sent.instantlyCampaignId,
      [
        {
          email: testEmail,
          first_name: "Test",
          last_name: "Lead",
          company_name: "Test",
          custom_variables,
        },
      ],
      { verify_leads_on_import: false }
    );

    return NextResponse.json({
      success: true,
      testEmail,
      message: `Test lead added to campaign. You will receive ${steps.length} emails at ${testEmail} (step 1 soon, then follow-ups over the next days).`,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to add test lead";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
