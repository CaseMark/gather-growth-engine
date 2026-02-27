import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * POST /api/leads/enrich
 * Attach analysis/enrichment data to an existing lead by email.
 * Called by Bench (via GTM callback) or any trusted service.
 * Auth: X-Ingest-Key (same as ingest endpoint)
 */
export async function POST(request: Request) {
  try {
    const ingestKey = process.env.INGEST_API_KEY;
    const providedKey = request.headers.get("X-Ingest-Key");

    if (!ingestKey || providedKey !== ingestKey) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { email, analysis, enrichmentData } = body as {
      email?: string;
      analysis?: string;
      enrichmentData?: Record<string, unknown>;
    };

    if (!email) {
      return NextResponse.json({ error: "email required" }, { status: 400 });
    }

    // Find the lead by email (most recent first)
    const lead = await prisma.lead.findFirst({
      where: { email: email.toLowerCase().trim() },
      orderBy: { createdAt: "desc" },
    });

    if (!lead) {
      return NextResponse.json({ error: "Lead not found", email }, { status: 404 });
    }

    // Build the update — store analysis in metadataJson
    const existingMeta = lead.metadataJson ? JSON.parse(lead.metadataJson) : {};
    const updatedMeta = {
      ...existingMeta,
      ...(enrichmentData || {}),
      benchAnalysis: analysis || existingMeta.benchAnalysis,
      enrichedAt: new Date().toISOString(),
    };

    await prisma.lead.update({
      where: { id: lead.id },
      data: { metadataJson: JSON.stringify(updatedMeta) },
    });

    return NextResponse.json({ ok: true, leadId: lead.id });
  } catch (error) {
    console.error("Leads enrich error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
