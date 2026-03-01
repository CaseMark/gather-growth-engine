import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/** GET /api/leads/all — paginated leads across batches, with campaign assignment info.
 *  Query params:
 *    page     (default 1)
 *    pageSize (default 50, max 200)
 *    search   (optional, filters by name/email/company/jobTitle)
 *    filter   (optional: "all" | "unassigned" | "assigned")
 */
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
    const pageSize = Math.min(200, Math.max(1, parseInt(searchParams.get("pageSize") ?? "50", 10)));
    const searchQuery = searchParams.get("search")?.trim().toLowerCase() ?? "";
    const filterParam = searchParams.get("filter") ?? "all";

    const workspace = await prisma.workspace.findUnique({
      where: { userId: session.user.id },
      select: { id: true },
    });
    if (!workspace) {
      return NextResponse.json({ leads: [], campaigns: [], totalCount: 0, page: 1, pageSize, totalPages: 0 });
    }

    // Build where clause for leads
    const batchIds = (
      await prisma.leadBatch.findMany({
        where: { workspaceId: workspace.id },
        select: { id: true },
      })
    ).map((b) => b.id);

    if (batchIds.length === 0) {
      const campaigns = await prisma.campaign.findMany({
        where: { workspaceId: workspace.id },
        select: { id: true, name: true, status: true, leadBatchId: true },
        orderBy: { createdAt: "desc" },
      });
      return NextResponse.json({ leads: [], campaigns, totalCount: 0, page: 1, pageSize, totalPages: 0 });
    }

    // Determine batch IDs with campaigns (for assigned/unassigned filter)
    const batchesWithCampaigns = new Set(
      (
        await prisma.campaign.findMany({
          where: { workspaceId: workspace.id, leadBatchId: { not: null } },
          select: { leadBatchId: true },
        })
      )
        .map((c) => c.leadBatchId)
        .filter(Boolean) as string[]
    );

    // Build lead where clause
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const leadWhere: any = {
      leadBatchId: { in: batchIds },
    };

    if (filterParam === "assigned") {
      leadWhere.leadBatchId = { in: Array.from(batchesWithCampaigns) };
    } else if (filterParam === "unassigned") {
      const assignedBatchArr = Array.from(batchesWithCampaigns);
      if (assignedBatchArr.length > 0) {
        leadWhere.leadBatchId = { in: batchIds.filter((id) => !batchesWithCampaigns.has(id)) };
      }
    }

    if (searchQuery) {
      leadWhere.OR = [
        { email: { contains: searchQuery, mode: "insensitive" } },
        { name: { contains: searchQuery, mode: "insensitive" } },
        { company: { contains: searchQuery, mode: "insensitive" } },
        { jobTitle: { contains: searchQuery, mode: "insensitive" } },
      ];
    }

    // Count total matching leads
    const totalCount = await prisma.lead.count({ where: leadWhere });
    const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
    const safePage = Math.min(page, totalPages);

    // Fetch paginated leads
    const rawLeads = await prisma.lead.findMany({
      where: leadWhere,
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
        icpChangedAt: true,
        employeeCount: true,
        revenue: true,
        metadataJson: true,
        createdAt: true,
        leadBatchId: true,
        leadBatch: {
          select: {
            id: true,
            name: true,
            campaigns: {
              select: { id: true, name: true },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
      skip: (safePage - 1) * pageSize,
      take: pageSize,
    });

    // Shape to match existing frontend type
    const leads = rawLeads.map((lead) => ({
      id: lead.id,
      email: lead.email,
      name: lead.name,
      company: lead.company,
      jobTitle: lead.jobTitle,
      industry: lead.industry,
      linkedinUrl: lead.linkedinUrl,
      city: lead.city,
      state: lead.state,
      pageVisited: lead.pageVisited,
      referrer: lead.referrer,
      source: lead.source,
      icp: lead.icp,
      icpChangedAt: lead.icpChangedAt,
      employeeCount: lead.employeeCount,
      revenue: lead.revenue,
      metadataJson: lead.metadataJson,
      createdAt: lead.createdAt,
      batchId: lead.leadBatch.id,
      batchName: lead.leadBatch.name,
      campaigns: lead.leadBatch.campaigns.map((c) => ({ id: c.id, name: c.name })),
    }));

    // Get all campaigns for the assign dropdown
    const campaigns = await prisma.campaign.findMany({
      where: { workspaceId: workspace.id },
      select: { id: true, name: true, status: true, leadBatchId: true },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({
      leads,
      campaigns,
      totalCount,
      page: safePage,
      pageSize,
      totalPages,
    });
  } catch (error) {
    console.error("Leads all GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
