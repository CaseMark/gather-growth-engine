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

    const [campaigns, legacySentCampaigns, allSentForWorkspace, replyCountResult, totalLeadsResult] = await Promise.all([
      prisma.campaign.findMany({
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
      }),
      // Sent campaigns created before the campaign flow (no campaignId) — show so existing campaigns aren't "gone"
      prisma.sentCampaign.findMany({
        where: { workspaceId: workspace.id, campaignId: null },
        orderBy: { createdAt: "desc" },
        include: {
          leadBatch: { select: { _count: { select: { leads: true } } } },
        },
      }),
      prisma.sentCampaign.findMany({
        where: { workspaceId: workspace.id },
        select: { id: true },
      }),
      prisma.campaignReply.count({
        where: { sentCampaign: { workspaceId: workspace.id } },
      }),
      prisma.lead.count({
        where: { leadBatch: { workspaceId: workspace.id } },
      }),
    ]);

    return NextResponse.json({
      campaigns,
      legacySentCampaigns: legacySentCampaigns.map((s) => ({
        id: s.id,
        name: s.name,
        status: "launched",
        createdAt: s.createdAt,
        leadCount: s.leadBatch?._count?.leads ?? 0,
        isLegacy: true,
      })),
      aggregate: {
        totalCampaigns: campaigns.length + legacySentCampaigns.length,
        launchedCampaigns: campaigns.filter((c) => c.status === "launched").length + legacySentCampaigns.length,
        totalSentCampaigns: allSentForWorkspace.length,
        totalLeads: totalLeadsResult,
        totalReplies: replyCountResult,
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
