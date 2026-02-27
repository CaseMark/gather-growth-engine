import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * POST /api/campaigns/seed
 * Service-to-service endpoint to create campaigns with playbooks.
 * Auth: X-Ingest-Key (same key as /api/leads/ingest)
 *
 * Body: { campaigns: [{ name, icp, steps: [{ subject, body, delayDays }] }] }
 */
export async function POST(request: Request) {
  try {
    const apiKey = process.env.INGEST_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "Not configured" }, { status: 500 });
    }

    const incomingKey =
      request.headers.get("x-ingest-key") ||
      request.headers.get("authorization")?.replace("Bearer ", "");
    if (!incomingKey || incomingKey !== apiKey) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { campaigns: campaignDefs, workspaceId } = body as {
      campaigns: Array<{
        name: string;
        icp: string;
        steps: Array<{ subject: string; subjectB?: string; body: string; delayDays: number }>;
      }>;
      workspaceId?: string;
    };

    if (!Array.isArray(campaignDefs) || campaignDefs.length === 0) {
      return NextResponse.json(
        { error: "Body must include { campaigns: [{ name, icp, steps }] }" },
        { status: 400 }
      );
    }

    // Resolve workspace
    let workspace;
    if (workspaceId) {
      workspace = await prisma.workspace.findUnique({ where: { id: workspaceId } });
    } else {
      workspace = await prisma.workspace.findFirst({ orderBy: { createdAt: "asc" } });
    }

    if (!workspace) {
      return NextResponse.json(
        { error: "No workspace found. Create one via the UI first." },
        { status: 400 }
      );
    }

    const created = [];
    for (const def of campaignDefs) {
      // Check if campaign with same name+icp already exists (idempotent)
      const existing = await prisma.campaign.findFirst({
        where: { workspaceId: workspace.id, icp: def.icp },
      });

      if (existing) {
        // Update existing
        await prisma.campaign.update({
          where: { id: existing.id },
          data: {
            name: def.name,
            playbookJson: JSON.stringify({ steps: def.steps }),
            updatedAt: new Date(),
          },
        });
        created.push({ id: existing.id, name: def.name, icp: def.icp, action: "updated" });
      } else {
        const campaign = await prisma.campaign.create({
          data: {
            workspaceId: workspace.id,
            name: def.name,
            icp: def.icp,
            status: "draft",
            playbookJson: JSON.stringify({ steps: def.steps }),
          },
        });
        created.push({ id: campaign.id, name: def.name, icp: def.icp, action: "created" });
      }
    }

    return NextResponse.json({ ok: true, campaigns: created });
  } catch (error) {
    console.error("Campaign seed error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
