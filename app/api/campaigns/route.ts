import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/** GET: List campaigns for the current workspace, with basic stats for launched ones. */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const workspace = await prisma.workspace.findUnique({
      where: { userId: session.user.id },
      select: { id: true },
    });
    if (!workspace) {
      return NextResponse.json({ campaigns: [], aggregate: null }, { status: 200 });
    }

    const campaigns = await prisma.campaign.findMany({
      where: { workspaceId: workspace.id },
      orderBy: { createdAt: "desc" },
      include: {
        leadBatch: { select: { id: true, name: true, _count: { select: { leads: true } } } },
        sentCampaigns: {
          select: {
            id: true,
            name: true,
            instantlyCampaignId: true,
            variant: true,
            createdAt: true,
          },
        },
      },
    });

    // Aggregate stats across all sent campaigns for this workspace (launched campaigns)
    const sentIds = campaigns.flatMap((c) => c.sentCampaigns.map((s) => s.id));
    const [sentCampaignsForStats, replyCount] = await Promise.all([
      sentIds.length > 0
        ? prisma.sentCampaign.findMany({
            where: { id: { in: sentIds } },
            select: { id: true },
          })
        : [],
      sentIds.length > 0
        ? prisma.campaignReply.count({ where: { sentCampaignId: { in: sentIds } } })
        : 0,
    ]);
    const totalSent = sentCampaignsForStats.length;
    const totalLeads = campaigns.reduce((sum, c) => sum + (c.leadBatch?._count?.leads ?? 0), 0);

    return NextResponse.json({
      campaigns,
      aggregate: {
        totalCampaigns: campaigns.length,
        launchedCampaigns: campaigns.filter((c) => c.status === "launched").length,
        totalSentCampaigns: totalSent,
        totalLeads,
        totalReplies: replyCount,
      },
    });
  } catch (error) {
    console.error("Campaigns list error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/** POST: Create a new campaign (draft), copying playbook/ICP from workspace. */
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const name = typeof body.name === "string" ? body.name.trim() || "New campaign" : "New campaign";

    const workspace = await prisma.workspace.findUnique({
      where: { userId: session.user.id },
      select: { id: true, playbookJson: true, icp: true, proofPointsJson: true },
    });
    if (!workspace) {
      return NextResponse.json({ error: "Workspace not found" }, { status: 404 });
    }

    const campaign = await prisma.campaign.create({
      data: {
        workspaceId: workspace.id,
        name,
        status: "draft",
        playbookJson: workspace.playbookJson,
        icp: workspace.icp,
        proofPointsJson: workspace.proofPointsJson,
      },
    });

    return NextResponse.json({ campaign }, { status: 201 });
  } catch (error) {
    console.error("Campaign create error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
