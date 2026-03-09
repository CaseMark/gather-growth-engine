import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { autoEnrollLeads } from "@/lib/auto-enroll";

/**
 * POST /api/leads/auto-enroll
 *
 * Service-to-service endpoint — authenticates via INGEST_API_KEY header.
 * Manually trigger auto-enrollment for leads already in a campaign batch.
 *
 * Body: { campaignId: string, leadIds?: string[], workspaceId?: string }
 *
 * If leadIds is omitted, enrolls ALL uncontacted leads in the campaign's batch.
 */
export async function POST(request: Request) {
  try {
    const apiKey = process.env.INGEST_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "Ingest not configured" }, { status: 500 });
    }

    const incomingKey =
      request.headers.get("x-ingest-key") ||
      request.headers.get("authorization")?.replace("Bearer ", "");
    if (!incomingKey || incomingKey !== apiKey) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { campaignId, leadIds: explicitLeadIds, workspaceId } = body as {
      campaignId?: string;
      leadIds?: string[];
      workspaceId?: string;
    };

    if (!campaignId) {
      return NextResponse.json({ error: "campaignId is required" }, { status: 400 });
    }

    // Resolve workspace
    let workspace;
    if (workspaceId) {
      workspace = await prisma.workspace.findUnique({ where: { id: workspaceId } });
    } else {
      workspace = await prisma.workspace.findFirst({ orderBy: { createdAt: "asc" } });
    }
    if (!workspace) {
      return NextResponse.json({ error: "No workspace found." }, { status: 400 });
    }

    // Resolve lead IDs
    let leadIds: string[];
    if (explicitLeadIds && explicitLeadIds.length > 0) {
      leadIds = explicitLeadIds;
    } else {
      // Get all uncontacted leads in the campaign's batch
      const campaign = await prisma.campaign.findFirst({
        where: { id: campaignId, workspaceId: workspace.id },
        select: { leadBatchId: true },
      });
      if (!campaign?.leadBatchId) {
        return NextResponse.json({ error: "Campaign has no lead batch" }, { status: 400 });
      }
      const leads = await prisma.lead.findMany({
        where: {
          leadBatchId: campaign.leadBatchId,
          lastContactedAt: null,
        },
        select: { id: true },
      });
      leadIds = leads.map((l) => l.id);
    }

    if (leadIds.length === 0) {
      return NextResponse.json({ ok: true, message: "No leads to enroll", results: [] });
    }

    const results = await autoEnrollLeads({
      workspaceId: workspace.id,
      campaignId,
      leadIds,
    });

    const enrolled = results.filter((r) => r.status === "enrolled").length;
    const skipped = results.filter((r) => r.status.startsWith("skipped_")).length;
    const errors = results.filter((r) => r.status === "error").length;

    return NextResponse.json({
      ok: true,
      enrolled,
      skipped,
      errors,
      total: results.length,
      results,
    });
  } catch (error) {
    console.error("Auto-enroll error:", error);
    const msg = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
