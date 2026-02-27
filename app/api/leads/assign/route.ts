import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * POST /api/leads/assign
 * Move leads to a campaign's lead batch (or create one).
 * Body: { leadIds: string[], campaignId: string }
 */
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { leadIds, campaignId } = (await request.json()) as {
      leadIds?: string[];
      campaignId?: string;
    };

    if (!Array.isArray(leadIds) || leadIds.length === 0 || !campaignId) {
      return NextResponse.json({ error: "leadIds[] and campaignId required" }, { status: 400 });
    }

    const workspace = await prisma.workspace.findUnique({
      where: { userId: session.user.id },
      select: { id: true },
    });
    if (!workspace) {
      return NextResponse.json({ error: "No workspace" }, { status: 400 });
    }

    // Verify campaign belongs to workspace
    const campaign = await prisma.campaign.findFirst({
      where: { id: campaignId, workspaceId: workspace.id },
      include: { leadBatch: true },
    });
    if (!campaign) {
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
    }

    // Get or create a lead batch for this campaign
    let batchId = campaign.leadBatchId;
    if (!batchId) {
      const batch = await prisma.leadBatch.create({
        data: {
          workspaceId: workspace.id,
          name: `${campaign.name} leads`,
        },
      });
      batchId = batch.id;
      await prisma.campaign.update({
        where: { id: campaignId },
        data: { leadBatchId: batchId },
      });
    }

    // Move leads to this batch
    const result = await prisma.lead.updateMany({
      where: {
        id: { in: leadIds },
        leadBatch: { workspaceId: workspace.id },
      },
      data: { leadBatchId: batchId },
    });

    return NextResponse.json({ ok: true, moved: result.count, batchId });
  } catch (error) {
    console.error("Leads assign error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
