import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/** GET /api/leads/all — all leads across batches, with campaign assignment info */
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
      return NextResponse.json({ leads: [], campaigns: [] });
    }

    // Get all leads with their batch info
    const batches = await prisma.leadBatch.findMany({
      where: { workspaceId: workspace.id },
      include: {
        leads: {
          select: {
            id: true,
            email: true,
            name: true,
            company: true,
            jobTitle: true,
            industry: true,
            linkedinUrl: true,
            city: true,
            state: true,
            pageVisited: true,
            referrer: true,
            source: true,
            icp: true,
            employeeCount: true,
            revenue: true,
            metadataJson: true,
            createdAt: true,
            leadBatchId: true,
          },
          orderBy: { createdAt: "desc" },
        },
        campaigns: {
          select: { id: true, name: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    // Flatten leads and attach batch + campaign info
    const leads = batches.flatMap((batch) =>
      batch.leads.map((lead) => ({
        ...lead,
        batchName: batch.name,
        batchId: batch.id,
        campaigns: batch.campaigns.map((c) => ({ id: c.id, name: c.name })),
      }))
    );

    // Get all campaigns for the assign dropdown
    const campaigns = await prisma.campaign.findMany({
      where: { workspaceId: workspace.id },
      select: { id: true, name: true, status: true, leadBatchId: true },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ leads, campaigns });
  } catch (error) {
    console.error("Leads all GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
