import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function isAdmin(email: string | null | undefined): boolean {
  const list = process.env.ADMIN_EMAILS ?? process.env.ADMIN_EMAIL ?? "";
  const emails = list.split(",").map((e) => e.trim().toLowerCase()).filter(Boolean);
  return email ? emails.includes(email.toLowerCase()) : false;
}

/**
 * GET: Admin-only analytics (user counts, campaign stats, recent activity).
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email || !isAdmin(session.user.email)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const [
      totalUsers,
      signupsLast7Days,
      signupsLast30Days,
      totalCampaigns,
      totalLeads,
      workspacesWithDomain,
      recentUsers,
      recentCampaigns,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { createdAt: { gte: sevenDaysAgo } } }),
      prisma.user.count({ where: { createdAt: { gte: thirtyDaysAgo } } }),
      prisma.sentCampaign.count(),
      prisma.lead.count(),
      prisma.workspace.count({ where: { domain: { not: null } } }),
      prisma.user.findMany({
        take: 20,
        orderBy: { createdAt: "desc" },
        select: { id: true, email: true, name: true, createdAt: true, emailVerified: true },
      }),
      prisma.sentCampaign.findMany({
        take: 20,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          name: true,
          variant: true,
          abGroupId: true,
          createdAt: true,
          workspace: { select: { user: { select: { email: true } }, domain: true } },
        },
      }),
    ]);

    return NextResponse.json({
      totalUsers,
      signupsLast7Days,
      signupsLast30Days,
      totalCampaigns,
      totalLeads,
      workspacesWithDomain,
      recentUsers: recentUsers.map((u) => ({
        id: u.id,
        email: u.email,
        name: u.name,
        createdAt: u.createdAt.toISOString(),
        emailVerified: !!u.emailVerified,
      })),
      recentCampaigns: recentCampaigns.map((c) => ({
        name: c.name,
        variant: c.variant,
        abGroupId: c.abGroupId,
        userEmail: c.workspace?.user?.email ?? null,
        domain: c.workspace?.domain ?? null,
        createdAt: c.createdAt.toISOString(),
      })),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to load analytics";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
