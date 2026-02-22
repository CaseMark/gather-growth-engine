import { NextResponse } from "next/server";
import { getAuth } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  try {
    const auth = await getAuth(request);
    if (auth.type === "none" || !auth.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const batchId = searchParams.get("batchId");

    const workspace = await prisma.workspace.findUnique({
      where: { userId: auth.userId },
    });

    if (!workspace) {
      return NextResponse.json({ batches: [], batch: null, leads: [] });
    }

    if (batchId) {
      const batch = await prisma.leadBatch.findFirst({
        where: { id: batchId, workspaceId: workspace.id },
        include: { leads: true },
      });
      if (!batch) {
        return NextResponse.json({ error: "Batch not found" }, { status: 404 });
      }
      return NextResponse.json({ batch, leads: batch.leads });
    }

    const batches = await prisma.leadBatch.findMany({
      where: { workspaceId: workspace.id },
      orderBy: { createdAt: "desc" },
      include: { _count: { select: { leads: true } } },
    });

    return NextResponse.json({
      batches: batches.map((b) => ({
        id: b.id,
        name: b.name,
        createdAt: b.createdAt,
        leadCount: b._count.leads,
      })),
    });
  } catch (error) {
    console.error("Leads GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
