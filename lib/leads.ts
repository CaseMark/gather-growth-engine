import { prisma } from "@/lib/prisma";

export type NormalizedLead = {
  email: string;
  name?: string;
  jobTitle?: string;
  company?: string;
  website?: string;
  industry?: string;
  linkedinUrl?: string;
  city?: string;
  state?: string;
  pageVisited?: string;
  referrer?: string;
  source?: string;
  icp?: string;
  employeeCount?: string;
  revenue?: string;
};

/**
 * Create a lead batch and insert leads. Returns batch id, count, and skipped duplicates.
 * When dedupe is true, skips leads whose email already exists in any batch in this workspace.
 */
export async function createBatchWithLeads(
  workspaceId: string,
  leads: NormalizedLead[],
  options?: { batchName?: string; dedupe?: boolean }
): Promise<{ batchId: string; count: number; skippedDuplicate: number }> {
  const valid = leads.filter((r) => r.email?.trim());
  if (valid.length === 0) {
    throw new Error("No valid leads with email.");
  }

  let toInsert = valid;
  let skippedDuplicate = 0;

  if (options?.dedupe !== false) {
    const existing = await prisma.lead.findMany({
      where: { leadBatch: { workspaceId } },
      select: { email: true },
    });
    const seen = new Set(existing.map((r) => r.email.toLowerCase().trim()));
    const before = toInsert.length;
    toInsert = toInsert.filter((l) => {
      const key = l.email.trim().toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key); // dedupe within same batch
      return true;
    });
    skippedDuplicate = before - toInsert.length;
  }

  if (toInsert.length === 0) {
    throw new Error(skippedDuplicate > 0 ? "All leads were duplicates (already in workspace)." : "No valid leads with email.");
  }

  const batch = await prisma.leadBatch.create({
    data: {
      workspaceId,
      name: options?.batchName ?? `Import ${new Date().toLocaleDateString()}`,
    },
  });

  await prisma.lead.createMany({
    data: toInsert.map((l) => ({
      leadBatchId: batch.id,
      email: l.email.trim(),
      name: l.name?.trim() || null,
      jobTitle: l.jobTitle?.trim() || null,
      company: l.company?.trim() || null,
      website: l.website?.trim() || null,
      industry: l.industry?.trim() || null,
      linkedinUrl: l.linkedinUrl?.trim() || null,
      city: l.city?.trim() || null,
      state: l.state?.trim() || null,
      pageVisited: l.pageVisited?.trim() || null,
      referrer: l.referrer?.trim() || null,
      source: l.source?.trim() || null,
      icp: l.icp?.trim() || null,
      employeeCount: l.employeeCount?.trim() || null,
      revenue: l.revenue?.trim() || null,
    })),
  });

  return { batchId: batch.id, count: toInsert.length, skippedDuplicate };
}
