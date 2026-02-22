import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getInstantlyClientForUserId } from "@/lib/instantly";
import { prisma } from "@/lib/prisma";

/**
 * Add a chunk of leads to an existing Instantly campaign (e.g. after each personalize chunk).
 * Body: { campaignId: string, batchId: string, leadIds: string[] }
 */
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const { campaignId, batchId, leadIds } = body as { campaignId?: string; batchId?: string; leadIds?: string[] };
    if (!campaignId || !batchId || !Array.isArray(leadIds) || leadIds.length === 0) {
      return NextResponse.json({ error: "campaignId, batchId, and non-empty leadIds are required" }, { status: 400 });
    }

    const workspace = await prisma.workspace.findUnique({
      where: { userId: session.user.id },
      select: { id: true, playbookJson: true },
    });
    if (!workspace) {
      return NextResponse.json({ error: "Workspace not found" }, { status: 404 });
    }

    const batch = await prisma.leadBatch.findFirst({
      where: { id: batchId, workspaceId: workspace.id },
      include: { leads: { where: { id: { in: leadIds } } } },
    });
    if (!batch) {
      return NextResponse.json({ error: "Batch not found" }, { status: 404 });
    }
    const leads = batch.leads;
    if (leads.length === 0) {
      return NextResponse.json({ leads_uploaded: 0, duplicated_leads: 0, in_blocklist: 0, message: "No matching leads in batch." });
    }

    const ctx = await getInstantlyClientForUserId(session.user.id);
    if (!ctx) {
      return NextResponse.json({ error: "Instantly API key not configured." }, { status: 400 });
    }

    const bodyWithLineBreaks = (text: string) =>
      (text ?? "").replace(/\r\n/g, "\n").replace(/\n/g, "<br>\n");

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
    const numSteps = playbookSteps.length;

    type LeadRow = (typeof leads)[0];
    const getLeadSteps = (lead: LeadRow, n: number): Array<{ subject: string; body: string }> => {
      let arr: Array<{ subject?: string; body?: string }>;
      try {
        if (lead.stepsJson) {
          const parsed = JSON.parse(lead.stepsJson) as unknown;
          arr = Array.isArray(parsed) ? parsed : [];
        } else {
          arr = [];
        }
      } catch {
        arr = [];
      }
      const legacy = [
        { subject: lead.step1Subject ?? "", body: lead.step1Body ?? "" },
        { subject: lead.step2Subject ?? "", body: lead.step2Body ?? "" },
        { subject: lead.step3Subject ?? "", body: lead.step3Body ?? "" },
      ];
      const steps: Array<{ subject: string; body: string }> = [];
      for (let i = 0; i < n; i++) {
        const s = arr[i] ?? legacy[i] ?? { subject: "", body: "" };
        steps.push({ subject: s.subject ?? "", body: s.body ?? "" });
      }
      return steps;
    };

    const leadsPayload = leads.map((l) => {
      const steps = getLeadSteps(l, numSteps);
      const custom_variables: Record<string, string> = {};
      steps.forEach((s, i) => {
        custom_variables[`step${i + 1}_subject`] = s.subject ?? "";
        custom_variables[`step${i + 1}_body`] = bodyWithLineBreaks(s.body ?? "").trim();
      });
      return {
        email: l.email,
        first_name: l.name?.split(/\s+/)[0] ?? null,
        last_name: l.name?.split(/\s+/).slice(1).join(" ") || null,
        company_name: l.company ?? null,
        personalization: bodyWithLineBreaks(steps[0]?.body ?? "").trim() || undefined,
        custom_variables,
      };
    });

    const addResult = await ctx.client.bulkAddLeadsToCampaign(campaignId, leadsPayload, {
      verify_leads_on_import: false,
    });

    return NextResponse.json({
      success: true,
      leads_uploaded: addResult.leads_uploaded,
      duplicated_leads: addResult.duplicated_leads,
      in_blocklist: addResult.in_blocklist,
      message: `Added ${leads.length} lead(s) to campaign.`,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to add leads";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
