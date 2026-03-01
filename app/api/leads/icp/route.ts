import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * POST /api/leads/icp
 * Update the ICP tag for one or more leads.
 * Body: { leadIds: string[], icp: string | null }
 *
 * Sets icpChangedAt to now() so the 2-minute grace period applies
 * before any sequence is kicked off for these leads.
 */
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { leadIds, icp } = body as { leadIds?: string[]; icp?: string | null };

    if (!Array.isArray(leadIds) || leadIds.length === 0) {
      return NextResponse.json({ error: "leadIds[] required" }, { status: 400 });
    }

    if (icp !== null && icp !== undefined && typeof icp !== "string") {
      return NextResponse.json({ error: "icp must be a string or null" }, { status: 400 });
    }

    const workspace = await prisma.workspace.findUnique({
      where: { userId: session.user.id },
      select: { id: true },
    });
    if (!workspace) {
      return NextResponse.json({ error: "No workspace" }, { status: 400 });
    }

    // Only update leads belonging to this workspace
    const result = await prisma.lead.updateMany({
      where: {
        id: { in: leadIds },
        leadBatch: { workspaceId: workspace.id },
      },
      data: {
        icp: icp?.trim() || null,
        icpChangedAt: new Date(),
      },
    });

    return NextResponse.json({ ok: true, updated: result.count });
  } catch (error) {
    console.error("Leads ICP update error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * GET /api/leads/icp
 * Returns distinct ICP values currently in use across leads and campaigns
 * for populating the dropdown.
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const workspace = await prisma.workspace.findUnique({
      where: { userId: session.user.id },
      select: { id: true, icp: true },
    });
    if (!workspace) {
      return NextResponse.json({ icpOptions: [] });
    }

    // Get distinct ICP values from leads
    const leadsWithIcp = await prisma.lead.findMany({
      where: {
        leadBatch: { workspaceId: workspace.id },
        icp: { not: null },
      },
      select: { icp: true },
      distinct: ["icp"],
    });

    // Get distinct ICP values from campaigns
    const campaignsWithIcp = await prisma.campaign.findMany({
      where: {
        workspaceId: workspace.id,
        icp: { not: null },
      },
      select: { icp: true },
      distinct: ["icp"],
    });

    const icpSet = new Set<string>();
    for (const l of leadsWithIcp) {
      if (l.icp?.trim()) icpSet.add(l.icp.trim());
    }
    for (const c of campaignsWithIcp) {
      if (c.icp?.trim()) icpSet.add(c.icp.trim());
    }

    // Sort alphabetically
    const icpOptions = Array.from(icpSet).sort((a, b) => a.localeCompare(b));

    return NextResponse.json({ icpOptions });
  } catch (error) {
    console.error("Leads ICP GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
