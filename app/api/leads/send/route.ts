import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getInstantlyClientForUserId } from "@/lib/instantly";
import { prisma } from "@/lib/prisma";

/** POST /api/leads/send — send a one-off email via Instantly */
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { from, to, subject, body } = (await request.json()) as {
      from?: string;
      to?: string;
      subject?: string;
      body?: string;
    };

    if (!from || !to || !subject || !body) {
      return NextResponse.json({ error: "from, to, subject, and body required" }, { status: 400 });
    }

    const workspace = await prisma.workspace.findUnique({
      where: { userId: session.user.id },
      select: { id: true },
    });

    const ctx = await getInstantlyClientForUserId(session.user.id);
    if (!ctx) {
      return NextResponse.json(
        { error: "Instantly API key not configured. Go to Settings to add your Instantly key." },
        { status: 400 }
      );
    }

    const result = await ctx.client.sendEmail({ from, to, subject, body });

    // Record the one-off send as a SentCampaign so it appears in dashboard & sent campaigns list
    let sentCampaignId: string | null = null;
    if (workspace) {
      try {
        const sentCampaign = await prisma.sentCampaign.create({
          data: {
            workspaceId: workspace.id,
            instantlyCampaignId: result.campaignId,
            name: `One-off: ${to}`,
          },
        });
        sentCampaignId = sentCampaign.id;
      } catch (e) {
        // Non-fatal: email was already sent, just log the DB error
        console.error("Failed to record SentCampaign for one-off send:", e);
      }
    }

    // Mark the lead as contacted (best-effort: find lead by email across this workspace's batches)
    if (workspace) {
      try {
        // Update all leads matching this email in the workspace
        const batchIds = await prisma.leadBatch.findMany({
          where: { workspaceId: workspace.id },
          select: { id: true },
        });
        if (batchIds.length > 0) {
          await prisma.lead.updateMany({
            where: {
              email: to,
              leadBatchId: { in: batchIds.map((b) => b.id) },
            },
            data: { lastContactedAt: new Date() },
          });
        }
      } catch (e) {
        // Non-fatal: the column may not exist yet on production
        console.error("Failed to update lastContactedAt:", e);
      }
    }

    return NextResponse.json({ ok: true, result, sentCampaignId });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to send";
    console.error("Send email error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
