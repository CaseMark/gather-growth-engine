import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// Page context for casemark.com pages — what each page offers
const PAGE_CONTEXT: Record<string, string> = {
  "/partners/court-reporting":
    "CaseMark's court reporting partnership program — AI-powered transcript summaries, free portal for court reporters, revenue sharing model. Appeals to court reporting firms looking to offer AI deposition summaries.",
  "/partners/medical-records":
    "CaseMark's medical records partnership — AI summarization of medical records for legal cases. Appeals to medical records retrieval companies and legal nurse consultants.",
  "/platform":
    "CaseMark's AI platform overview — document summarization, chat with documents, workflow automation for legal professionals. General legal AI capabilities.",
  "/workflows":
    "CaseMark's workflow automation — automated document processing pipelines, batch summarization, integrations. Appeals to firms handling high document volumes.",
  "/pricing":
    "CaseMark's pricing page — indicates active buying intent. The visitor was evaluating cost and likely comparing solutions.",
  "/":
    "CaseMark homepage — general awareness visit. Visitor is exploring what CaseMark does at a high level.",
  "/about":
    "CaseMark's about page — learning about the company, team, and mission. Early-stage research.",
};

function getPageContext(pageUrl: string | null): string {
  if (!pageUrl) return "Unknown page — no URL captured.";
  try {
    const url = new URL(pageUrl);
    const path = url.pathname.replace(/\/$/, "") || "/";
    // Try exact match first, then prefix match
    if (PAGE_CONTEXT[path]) return PAGE_CONTEXT[path];
    for (const [key, val] of Object.entries(PAGE_CONTEXT)) {
      if (path.startsWith(key) && key !== "/") return val;
    }
    return `Visited ${pageUrl} — a page on casemark.com. Review this URL to understand what they were looking at.`;
  } catch {
    return `Visited: ${pageUrl}`;
  }
}

/** POST /api/leads/draft — generate a personalized email draft for a lead */
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { leadId } = (await request.json()) as { leadId?: string };
    if (!leadId) {
      return NextResponse.json({ error: "leadId required" }, { status: 400 });
    }

    const workspace = await prisma.workspace.findUnique({
      where: { userId: session.user.id },
      select: { id: true },
    });
    if (!workspace) {
      return NextResponse.json({ error: "No workspace" }, { status: 400 });
    }

    const lead = await prisma.lead.findFirst({
      where: { id: leadId, leadBatch: { workspaceId: workspace.id } },
    });
    if (!lead) {
      return NextResponse.json({ error: "Lead not found" }, { status: 404 });
    }

    // Build context
    const pageContext = getPageContext(lead.pageVisited);
    let benchAnalysis = "";
    try {
      const meta = lead.metadataJson ? JSON.parse(lead.metadataJson) : null;
      if (meta?.benchAnalysis) benchAnalysis = meta.benchAnalysis;
    } catch { /* */ }

    const firstName = lead.name?.split(" ")[0] || "there";
    const company = lead.company || "your company";
    const role = lead.jobTitle || "";

    // Generate a contextual draft
    let subject = "";
    let body = "";

    // Determine the best angle based on page visited
    const pageUrl = lead.pageVisited || "";
    const path = (() => { try { return new URL(pageUrl).pathname; } catch { return ""; } })();

    if (path.includes("court-reporting")) {
      subject = `AI summaries for ${company}`;
      body = `Hi ${firstName},\n\nI noticed you were checking out our court reporting partnership program. We work with firms like yours to offer AI-powered deposition and transcript summaries — it's a free portal with a revenue share model, so there's no upfront cost.\n\nWould love to give you a quick walkthrough if you're interested. What does your calendar look like this week?\n\nBest,\nScott`;
    } else if (path.includes("medical-records")) {
      subject = `Medical records AI for ${company}`;
      body = `Hi ${firstName},\n\nI saw you were looking at our medical records summarization tools. We help firms process medical records significantly faster with AI — typically cutting review time by 80%+.\n\nWould it be helpful to see a demo with some sample records? Happy to set something up.\n\nBest,\nScott`;
    } else if (path.includes("workflow")) {
      subject = `Automating document workflows at ${company}`;
      body = `Hi ${firstName},\n\nI noticed you were exploring our workflow automation features. We help legal teams automate document processing pipelines — batch summarization, extraction, and more.\n\nWould love to learn more about what ${company} is working on and see if there's a fit. Quick call this week?\n\nBest,\nScott`;
    } else if (path.includes("pricing")) {
      subject = `CaseMark pricing for ${company}`;
      body = `Hi ${firstName},\n\nI saw you were checking out our pricing — happy to walk you through the options and figure out what makes sense for ${company}.\n\nWe have plans that scale from solo practitioners to enterprise teams. Would a quick call be helpful?\n\nBest,\nScott`;
    } else if (path.includes("platform")) {
      subject = `AI for legal documents at ${company}`;
      body = `Hi ${firstName},\n\nI noticed you were exploring CaseMark's platform. We help legal professionals summarize, analyze, and chat with their documents using AI — saving hours of manual review.\n\n${role ? `Given your role${role ? ` as ${role}` : ""}, ` : ""}I think you'd find it interesting to see how other teams like yours are using it. Quick demo this week?\n\nBest,\nScott`;
    } else {
      // Generic but still personalized
      subject = `Quick question for ${firstName} at ${company}`;
      body = `Hi ${firstName},\n\nI noticed you visited casemark.com recently${pageUrl ? ` (${pageUrl.replace(/^https?:\/\//, "")})` : ""}. We're an AI platform that helps legal professionals process documents faster — summaries, analysis, and workflow automation.\n\n${benchAnalysis ? `Based on what I know about ${company}, I think there could be a great fit. ` : ""}Would you be open to a quick conversation about how we might help ${company}?\n\nBest,\nScott`;
    }

    return NextResponse.json({
      draft: {
        to: lead.email,
        subject,
        body,
      },
      context: {
        pageVisited: lead.pageVisited,
        pageContext,
        benchAnalysis: benchAnalysis || null,
        referrer: lead.referrer,
        company: lead.company,
        jobTitle: lead.jobTitle,
        location: [lead.city, lead.state].filter(Boolean).join(", ") || null,
      },
    });
  } catch (error) {
    console.error("Draft error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
