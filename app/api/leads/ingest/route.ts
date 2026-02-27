import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createBatchWithLeads, NormalizedLead } from "@/lib/leads";

/**
 * POST /api/leads/ingest
 * Service-to-service endpoint — authenticates via INGEST_API_KEY header, no user session needed.
 * Pushes leads into the first workspace (or a specified one).
 *
 * Headers: X-Ingest-Key: <INGEST_API_KEY>
 * Body: { leads: [{ email, name?, company?, jobTitle?, industry? }], source?: string, workspaceId?: string }
 */
export async function POST(request: Request) {
  try {
    const apiKey = process.env.INGEST_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "Ingest not configured" }, { status: 500 });
    }

    const incomingKey = request.headers.get("x-ingest-key") || request.headers.get("authorization")?.replace("Bearer ", "");
    if (!incomingKey || incomingKey !== apiKey) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { leads: rawLeads, source, workspaceId } = body as {
      leads?: unknown[];
      source?: string;
      workspaceId?: string;
    };

    if (!Array.isArray(rawLeads) || rawLeads.length === 0) {
      return NextResponse.json(
        { error: "Body must include { leads: [{ email, ... }] }" },
        { status: 400 }
      );
    }

    // Resolve workspace
    let workspace;
    if (workspaceId) {
      workspace = await prisma.workspace.findUnique({ where: { id: workspaceId } });
    } else {
      // Default: first workspace (single-tenant usage)
      workspace = await prisma.workspace.findFirst({ orderBy: { createdAt: "asc" } });
    }

    if (!workspace) {
      return NextResponse.json(
        { error: "No workspace found. Create one via the UI first." },
        { status: 400 }
      );
    }

    // Normalize leads
    const leads: NormalizedLead[] = [];
    for (const item of rawLeads) {
      if (item && typeof item === "object" && !Array.isArray(item)) {
        const r = item as Record<string, unknown>;
        const email = (r.email || r.Email || "") as string;
        if (email?.trim()) {
          leads.push({
            email: email.trim(),
            name: (r.name || r.Name || r.full_name || r.first_name || "") as string || undefined,
            company: (r.company || r.Company || r.company_name || r.organization || "") as string || undefined,
            jobTitle: (r.job_title || r.jobTitle || r.title || r.Title || "") as string || undefined,
            industry: (r.industry || r.Industry || "") as string || undefined,
          });
        }
      }
    }

    if (leads.length === 0) {
      return NextResponse.json({ error: "No valid leads with email." }, { status: 400 });
    }

    const batchName = source ? `${source} ${new Date().toISOString().slice(0, 10)}` : `Ingest ${new Date().toISOString().slice(0, 10)}`;

    const { batchId, count, skippedDuplicate } = await createBatchWithLeads(workspace.id, leads, {
      batchName,
    });

    return NextResponse.json({
      ok: true,
      batchId,
      count,
      skippedDuplicate,
    });
  } catch (error) {
    console.error("Ingest error:", error);
    const msg = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
