import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/** GET: Single campaign with lead batch and sent campaigns. */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const workspace = await prisma.workspace.findUnique({
      where: { userId: session.user.id },
      select: { id: true },
    });
    if (!workspace) {
      return NextResponse.json({ error: "Workspace not found" }, { status: 404 });
    }

    const campaign = await prisma.campaign.findFirst({
      where: { id, workspaceId: workspace.id },
      include: {
        leadBatch: {
          include: {
            leads: {
              select: {
                id: true,
                email: true,
                name: true,
                company: true,
                jobTitle: true,
                persona: true,
                vertical: true,
                step1Subject: true,
                step1Body: true,
                stepsJson: true,
              },
            },
          },
        },
        sentCampaigns: true,
      },
    });

    if (!campaign) {
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
    }

    return NextResponse.json({ campaign });
  } catch (error) {
    console.error("Campaign get error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/** PATCH: Update campaign (name, playbook, icp, proofPoints, leadBatchId, status). */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const workspace = await prisma.workspace.findUnique({
      where: { userId: session.user.id },
      select: { id: true },
    });
    if (!workspace) {
      return NextResponse.json({ error: "Workspace not found" }, { status: 404 });
    }

    const existing = await prisma.campaign.findFirst({
      where: { id, workspaceId: workspace.id },
    });
    if (!existing) {
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
    }

    const body = await request.json().catch(() => ({}));
    const updates: Record<string, unknown> = {};

    if (typeof body.name === "string" && body.name.trim()) updates.name = body.name.trim();
    if (typeof body.status === "string" && ["draft", "sequences_ready", "launched"].includes(body.status)) updates.status = body.status;
    if (body.playbookJson !== undefined) updates.playbookJson = body.playbookJson;
    if (body.icp !== undefined) updates.icp = body.icp;
    if (body.proofPointsJson !== undefined) updates.proofPointsJson = body.proofPointsJson;
    if (body.leadBatchId !== undefined) updates.leadBatchId = body.leadBatchId || null;

    const campaign = await prisma.campaign.update({
      where: { id },
      data: updates,
    });

    return NextResponse.json({ campaign });
  } catch (error) {
    console.error("Campaign update error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
