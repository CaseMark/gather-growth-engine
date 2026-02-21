import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import dns from "dns/promises";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function isValidSyntax(email: string): boolean {
  return EMAIL_REGEX.test(email?.trim() ?? "");
}

async function hasMxRecords(domain: string): Promise<boolean> {
  try {
    const addresses = await dns.resolveMx(domain);
    return Array.isArray(addresses) && addresses.length > 0;
  } catch {
    return false;
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { batchId } = body as { batchId?: string };

    if (!batchId || typeof batchId !== "string") {
      return NextResponse.json({ error: "batchId is required" }, { status: 400 });
    }

    const workspace = await prisma.workspace.findUnique({
      where: { userId: session.user.id },
    });

    if (!workspace) {
      return NextResponse.json({ error: "Workspace not found." }, { status: 404 });
    }

    const batch = await prisma.leadBatch.findFirst({
      where: { id: batchId, workspaceId: workspace.id },
      include: { leads: true },
    });

    if (!batch) {
      return NextResponse.json({ error: "Batch not found" }, { status: 404 });
    }

    let verified = 0;
    let invalid = 0;

    for (const lead of batch.leads) {
      const email = lead.email.trim();
      const syntaxOk = isValidSyntax(email);
      if (!syntaxOk) {
        await prisma.lead.update({ where: { id: lead.id }, data: { emailVerified: false } });
        invalid++;
        continue;
      }
      const domain = email.split("@")[1];
      const mxOk = domain ? await hasMxRecords(domain) : false;
      const ok = mxOk;
      await prisma.lead.update({ where: { id: lead.id }, data: { emailVerified: ok } });
      if (ok) verified++;
      else invalid++;
    }

    return NextResponse.json({
      verified,
      invalid,
      message: `Verified ${batch.leads.length} leads: ${verified} valid, ${invalid} invalid or no MX.`,
    });
  } catch (error) {
    console.error("Leads verify error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
