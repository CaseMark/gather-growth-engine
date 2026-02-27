import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * POST /api/leads/delete
 * Body: { leadIds: string[] }
 */
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { leadIds } = (await request.json()) as { leadIds?: string[] };
    if (!Array.isArray(leadIds) || leadIds.length === 0) {
      return NextResponse.json({ error: "leadIds[] required" }, { status: 400 });
    }

    const workspace = await prisma.workspace.findUnique({
      where: { userId: session.user.id },
      select: { id: true },
    });
    if (!workspace) {
      return NextResponse.json({ error: "No workspace" }, { status: 400 });
    }

    // Only delete leads belonging to this workspace
    const result = await prisma.lead.deleteMany({
      where: {
        id: { in: leadIds },
        leadBatch: { workspaceId: workspace.id },
      },
    });

    return NextResponse.json({ ok: true, deleted: result.count });
  } catch (error) {
    console.error("Leads delete error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
