import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getInstantlyClientForUserId } from "@/lib/instantly";
import { prisma } from "@/lib/prisma";

/**
 * Create campaign(s), apply ramp, add leads, activate.
 * Body: { batchId: string, abTest?: boolean, subjectLineA?: string, subjectLineB?: string }
 * When abTest is true, subjectLineA and subjectLineB are required; creates two campaigns (A/B) and assigns leads 50/50.
 */
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const { batchId, abTest, subjectLineA, subjectLineB, campaignName: campaignNameInput, accountEmails } = body as {
      batchId?: string;
      abTest?: boolean;
      subjectLineA?: string;
      subjectLineB?: string;
      campaignName?: string;
      accountEmails?: string[];
    };
    if (!batchId) {
      return NextResponse.json({ error: "batchId is required" }, { status: 400 });
    }
    const campaignNameTrimmed = campaignNameInput?.trim();
    if (!campaignNameTrimmed) {
      return NextResponse.json({ error: "Campaign name is required" }, { status: 400 });
    }
    if (abTest && (!subjectLineA?.trim() || !subjectLineB?.trim())) {
      return NextResponse.json(
        { error: "A/B test requires subjectLineA and subjectLineB" },
        { status: 400 }
      );
    }
    const selectedEmails = Array.isArray(accountEmails) ? accountEmails.filter((e): e is string => typeof e === "string" && e.trim().length > 0).map((e) => e.trim()) : undefined;

    const workspace = await prisma.workspace.findUnique({
      where: { userId: session.user.id },
      select: { id: true, playbookApproved: true, playbookJson: true },
    });
    if (!workspace) {
      return NextResponse.json({ error: "Workspace not found" }, { status: 404 });
    }
    if (!workspace.playbookApproved) {
      return NextResponse.json({ error: "Approve your playbook before sending." }, { status: 400 });
    }

    const batch = await prisma.leadBatch.findFirst({
      where: { id: batchId, workspaceId: workspace.id },
      include: { leads: true },
    });
    if (!batch) {
      return NextResponse.json({ error: "Batch not found" }, { status: 404 });
    }
    if (batch.leads.length === 0) {
      return NextResponse.json({ error: "Batch has no leads" }, { status: 400 });
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
      unwarmedDailyLimit: 15,
      ...(selectedEmails != null && selectedEmails.length > 0 && { accountEmails: selectedEmails }),
    });

    const baseName = campaignNameTrimmed;

    if (abTest) {
      // A/B: assign leads 50/50, create two campaigns, record with abGroupId
      const abGroupId = `ab-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
      const leadsA: typeof batch.leads = [];
      const leadsB: typeof batch.leads = [];
      batch.leads.forEach((l, i) => {
        if (i % 2 === 0) leadsA.push(l);
        else leadsB.push(l);
      });

      await prisma.lead.updateMany({
        where: { id: { in: leadsA.map((l) => l.id) } },
        data: { abVariant: "A" },
      });
      await prisma.lead.updateMany({
        where: { id: { in: leadsB.map((l) => l.id) } },
        data: { abVariant: "B" },
      });

      const toPayload = (
        list: typeof batch.leads,
        subject: string
      ) =>
        list.map((l) => ({
          email: l.email,
          first_name: l.name?.split(/\s+/)[0] ?? null,
          last_name: l.name?.split(/\s+/).slice(1).join(" ") || null,
          company_name: l.company ?? null,
          personalization: l.step1Body ?? undefined,
          custom_variables: { subject_line: subject },
        }));

      const nameA = `${baseName} (A)`;
      const nameB = `${baseName} (B)`;
      const campaignOptions = selectedEmails != null && selectedEmails.length > 0 ? { email_list: selectedEmails } : undefined;
      const createdA = await client.createCampaign(nameA, campaignOptions);
      const createdB = await client.createCampaign(nameB, campaignOptions);
      const idA = createdA.id;
      const idB = createdB.id;
      if (!idA || !idB) {
        return NextResponse.json({ error: "Instantly did not return campaign ids" }, { status: 500 });
      }

      const [resA, resB] = await Promise.all([
        client.bulkAddLeadsToCampaign(idA, toPayload(leadsA, subjectLineA!.trim()), {
          skip_if_in_workspace: true,
          verify_leads_on_import: false,
        }),
        client.bulkAddLeadsToCampaign(idB, toPayload(leadsB, subjectLineB!.trim()), {
          skip_if_in_workspace: true,
          verify_leads_on_import: false,
        }),
      ]);

      await client.activateCampaign(idA);
      await client.activateCampaign(idB);

      await prisma.sentCampaign.createMany({
        data: [
          {
            workspaceId: workspace.id,
            leadBatchId: batch.id,
            instantlyCampaignId: idA,
            name: nameA,
            abGroupId,
            variant: "A",
          },
          {
            workspaceId: workspace.id,
            leadBatchId: batch.id,
            instantlyCampaignId: idB,
            name: nameB,
            abGroupId,
            variant: "B",
          },
        ],
      });

      const totalUploaded = resA.leads_uploaded + resB.leads_uploaded;
      return NextResponse.json({
        success: true,
        abTest: true,
        campaignId: idA,
        campaignIdB: idB,
        campaignName: nameA,
        campaignNameB: nameB,
        abGroupId,
        leads_uploaded: totalUploaded,
        duplicated_leads: resA.duplicated_leads + resB.duplicated_leads,
        in_blocklist: resA.in_blocklist + resB.in_blocklist,
        message: `A/B campaigns "${nameA}" and "${nameB}" created and activated (${leadsA.length} vs ${leadsB.length} leads).`,
      });
    }

    // Single campaign
    const campaignName = baseName;
    const campaignOptions = selectedEmails != null && selectedEmails.length > 0 ? { email_list: selectedEmails } : undefined;
    const created = await client.createCampaign(campaignName, campaignOptions);
    const campaignId = created.id;
    if (!campaignId) {
      return NextResponse.json({ error: "Instantly did not return campaign id" }, { status: 500 });
    }

    const leadsPayload = batch.leads.map((l) => ({
      email: l.email,
      first_name: l.name?.split(/\s+/)[0] ?? null,
      last_name: l.name?.split(/\s+/).slice(1).join(" ") || null,
      company_name: l.company ?? null,
      personalization: l.step1Body ?? undefined,
      custom_variables: l.step1Subject ? { subject_line: l.step1Subject } : undefined,
    }));

    const addResult = await client.bulkAddLeadsToCampaign(campaignId, leadsPayload, {
      skip_if_in_workspace: true,
      verify_leads_on_import: false,
    });

    await client.activateCampaign(campaignId);

    await prisma.sentCampaign.create({
      data: {
        workspaceId: workspace.id,
        leadBatchId: batch.id,
        instantlyCampaignId: campaignId,
        name: campaignName,
      },
    });

    return NextResponse.json({
      success: true,
      campaignId,
      campaignName,
      leads_uploaded: addResult.leads_uploaded,
      duplicated_leads: addResult.duplicated_leads,
      in_blocklist: addResult.in_blocklist,
      message: `Campaign "${campaignName}" created and activated. Unwarmed mailboxes ramped slowly (15/day); warmed mailboxes 80/day.`,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to send to Instantly";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
