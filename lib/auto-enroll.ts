/**
 * Auto-enroll: fully automated pipeline for new leads arriving via ingest.
 *
 * When a lead is auto-assigned to a campaign batch, this module:
 *   1. Verifies the email (syntax + MX record)
 *   2. Generates a personalized email sequence via Claude
 *   3. Quality-checks the generated content
 *   4. Adds the lead to the campaign's running Instantly campaign (drip add)
 *
 * Designed to be called fire-and-forget from the ingest endpoint.
 * If any step fails, the lead stays in the batch with whatever progress was made
 * and can be manually processed via the UI.
 */

import { prisma } from "@/lib/prisma";
import { decrypt } from "@/lib/encryption";
import { callAnthropic } from "@/lib/anthropic";
import { parsePlaybook, getSequenceSteps } from "@/lib/playbook";
import { getInstantlyClient } from "@/lib/instantly";
import dns from "dns/promises";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type AutoEnrollResult = {
  leadId: string;
  email: string;
  status: "enrolled" | "skipped_verification" | "skipped_no_playbook" | "skipped_generate_failed" | "skipped_quality_failed" | "skipped_no_instantly" | "skipped_no_running_campaign" | "error";
  detail?: string;
};

type AutoEnrollOptions = {
  /** Workspace ID to operate within */
  workspaceId: string;
  /** Campaign ID (must have a playbook) */
  campaignId: string;
  /** Lead IDs to auto-enroll */
  leadIds: string[];
};

// ---------------------------------------------------------------------------
// Email verification (inline — same logic as /api/leads/verify)
// ---------------------------------------------------------------------------

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

async function verifyEmail(email: string): Promise<boolean> {
  if (!EMAIL_REGEX.test(email?.trim() ?? "")) return false;
  const domain = email.trim().split("@")[1];
  if (!domain) return false;
  try {
    const records = await dns.resolveMx(domain);
    return Array.isArray(records) && records.length > 0;
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// Sequence generation (extracted from /api/leads/generate logic)
// ---------------------------------------------------------------------------

async function generateSequenceForLead(
  lead: { id: string; email: string; name: string | null; jobTitle: string | null; company: string | null; website: string | null; industry: string | null; persona: string | null; vertical: string | null },
  workspace: { anthropicKey: string; anthropicModel: string | null; productSummary: string | null; icp: string | null; proofPointsJson: string | null; socialProofJson: string | null; senderName: string | null },
  campaign: { playbookJson: string | null; icp: string | null; proofPointsJson: string | null },
): Promise<Array<{ subject: string; body: string }> | null> {
  const playbookSource = campaign.playbookJson ?? null;
  const parsed = parsePlaybook(playbookSource);
  if (!parsed) return null;

  const { numSteps, guidelines, legacySteps } = parsed;
  const stepKeys = Array.from({ length: numSteps }, (_, i) => `step${i + 1}`).join(", ");
  const stepExample = Array.from({ length: numSteps }, (_, i) => `"step${i + 1}": {"subject": "...", "body": "..."}`).join(", ");

  const structureBlock = guidelines?.structure
    ? `\nPlaybook structure (follow this flow, but write completely custom content for this lead):\n${guidelines.structure}\nTone: ${guidelines.tone}`
    : legacySteps?.length
      ? `\nRough flow (adapt freely, write custom content): ${legacySteps.map((s, i) => `Step ${i + 1}: ${(s.subject || "").slice(0, 50)}`).join(" → ")}`
      : "";

  const anthropicKey = decrypt(workspace.anthropicKey);
  const model = "claude-haiku-4-5"; // always use fast model for auto-enroll
  const productSummary = workspace.productSummary ?? "";
  const icp = (campaign.icp ?? workspace.icp) ?? "";

  const proofPointsJsonSource = campaign.proofPointsJson ?? workspace.proofPointsJson;
  let proofPointsText = "";
  if (proofPointsJsonSource) {
    try {
      const arr = JSON.parse(proofPointsJsonSource) as Array<{ title?: string; text: string }>;
      if (Array.isArray(arr) && arr.length > 0) {
        proofPointsText = "\nProof points (weave in where relevant): " + arr.map((p) => (p.title ? `${p.title}: ${p.text}` : p.text)).join("; ");
      }
    } catch { /* ignore */ }
  }

  let socialProofText = "";
  if (workspace.socialProofJson) {
    try {
      const sp = JSON.parse(workspace.socialProofJson) as { similarCompanies?: string; referralPhrase?: string };
      const parts: string[] = [];
      if (sp.similarCompanies?.trim()) parts.push(`Similar companies using us: ${sp.similarCompanies.trim()}`);
      if (sp.referralPhrase?.trim()) parts.push(`Referral phrase (use when relevant): "${sp.referralPhrase.trim()}"`);
      if (parts.length > 0) socialProofText = "\nSocial proof (weave in naturally): " + parts.join(". ");
    } catch { /* ignore */ }
  }

  const prompt = `You are writing a HYPER-PERSONALIZED cold outreach sequence for ONE specific lead. Write COMPLETELY custom emails for this person — not templates. Each email should feel like it was written specifically for them based on their role, company, industry, and how your product helps people like them.

Product summary: ${productSummary}
ICP: ${icp}${proofPointsText}${socialProofText}${structureBlock}

THIS LEAD:
- Email: ${lead.email}
- Name: ${lead.name ?? "unknown"}
- Job title: ${lead.jobTitle ?? "unknown"}
- Company: ${lead.company ?? "unknown"}
- Industry: ${lead.industry ?? "unknown"}${lead.website ? `\n- Company website: ${lead.website}` : ""}${lead.persona || lead.vertical ? `\n- Persona: ${lead.persona ?? ""}\n- Vertical: ${lead.vertical ?? ""}` : ""}

SUBJECT LINES: Write HIGHLY PERSONALIZED subject lines for each email. Use their name, company, or a contextual hook. Avoid generic subjects like "Quick question" or "Following up".

Write ${numSteps} emails. JSON keys: ${stepKeys}. Use their real name, company, and context throughout. Do NOT use placeholders like {{firstName}} — write "Hey, ${(lead.name ?? "there").split(/\s+/)[0] || "there"}," etc. Tailor each email to their specific situation. Make it feel 1:1.${socialProofText ? " Weave in social proof (similar companies, referral) where it fits naturally." : ""}

CRITICAL: Sign off as the SENDER, never as the recipient. Use their name only in the greeting (e.g. "Hey Bo,"). For the signature, use: ${workspace.senderName?.trim() ? workspace.senderName.trim() : "Best, [Your name]"}. Never use the recipient's name in the sign-off.

Respond with ONLY a valid JSON object with keys ${stepKeys}. Each step: { "subject": "...", "body": "..." }. Example: {${stepExample}}`;

  try {
    const { text: raw } = await callAnthropic(anthropicKey, prompt, { maxTokens: 2400, model });
    let jsonStr = raw.trim();
    const codeBlock = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (codeBlock) jsonStr = codeBlock[1].trim();
    const parsedSteps = JSON.parse(jsonStr) as Record<string, { subject?: string; body?: string }>;

    return Array.from({ length: numSteps }, (_, i) => {
      const key = `step${i + 1}`;
      const step = parsedSteps[key];
      const s = typeof step === "object" && step ? step : {};
      return {
        subject: (s.subject ?? "").trim(),
        body: (s.body ?? "").trim(),
      };
    });
  } catch (err) {
    console.error(`[auto-enroll] Sequence generation failed for lead ${lead.id}:`, err);
    return null;
  }
}

// ---------------------------------------------------------------------------
// Quality check (same gate as /api/instantly/send)
// ---------------------------------------------------------------------------

function passesQualityGate(steps: Array<{ subject: string; body: string }>): boolean {
  return steps.every(
    (s) => (s.subject?.length ?? 0) >= 10 && (s.body?.length ?? 0) >= 50
  );
}

// ---------------------------------------------------------------------------
// Find running Instantly campaign for a Growth Engine campaign
// ---------------------------------------------------------------------------

async function findRunningInstantlyCampaign(campaignId: string): Promise<{
  sentCampaignId: string;
  instantlyCampaignId: string;
  numSteps: number;
} | null> {
  // Find the most recent SentCampaign linked to this campaign (this is the "running" campaign in Instantly)
  const sent = await prisma.sentCampaign.findFirst({
    where: { campaignId },
    orderBy: { createdAt: "desc" },
    select: { id: true, instantlyCampaignId: true, campaign: { select: { playbookJson: true } } },
  });
  if (!sent) return null;

  const parsed = parsePlaybook(sent.campaign?.playbookJson ?? null);
  const numSteps = parsed?.numSteps ?? 3;

  return {
    sentCampaignId: sent.id,
    instantlyCampaignId: sent.instantlyCampaignId,
    numSteps,
  };
}

// ---------------------------------------------------------------------------
// Main auto-enroll function
// ---------------------------------------------------------------------------

export async function autoEnrollLeads(options: AutoEnrollOptions): Promise<AutoEnrollResult[]> {
  const { workspaceId, campaignId, leadIds } = options;
  const results: AutoEnrollResult[] = [];

  // Load workspace for keys
  const workspace = await prisma.workspace.findUnique({
    where: { id: workspaceId },
    select: {
      id: true,
      anthropicKey: true,
      anthropicModel: true,
      productSummary: true,
      icp: true,
      proofPointsJson: true,
      socialProofJson: true,
      senderName: true,
      instantlyKey: true,
      userId: true,
    },
  });

  if (!workspace?.anthropicKey || !workspace?.instantlyKey) {
    return leadIds.map((id) => ({
      leadId: id,
      email: "",
      status: "skipped_no_instantly" as const,
      detail: !workspace?.anthropicKey ? "No Anthropic API key" : "No Instantly API key",
    }));
  }

  // Load campaign
  const campaign = await prisma.campaign.findFirst({
    where: { id: campaignId, workspaceId },
    select: { id: true, playbookJson: true, icp: true, proofPointsJson: true, name: true },
  });

  if (!campaign?.playbookJson) {
    return leadIds.map((id) => ({
      leadId: id,
      email: "",
      status: "skipped_no_playbook" as const,
      detail: "Campaign has no playbook configured",
    }));
  }

  // Find running Instantly campaign to drip into
  const running = await findRunningInstantlyCampaign(campaignId);
  if (!running) {
    return leadIds.map((id) => ({
      leadId: id,
      email: "",
      status: "skipped_no_running_campaign" as const,
      detail: `No launched Instantly campaign found for "${campaign.name}". Launch the campaign from the UI first, then new leads will be auto-added.`,
    }));
  }

  // Get Instantly client
  const instantlyApiKey = decrypt(workspace.instantlyKey);
  const client = getInstantlyClient(instantlyApiKey);

  // Load leads
  const leads = await prisma.lead.findMany({
    where: { id: { in: leadIds } },
    select: {
      id: true, email: true, name: true, jobTitle: true, company: true,
      website: true, industry: true, persona: true, vertical: true,
      emailVerified: true, stepsJson: true, lastContactedAt: true,
    },
  });

  // Helper: convert \n to <br> for Instantly HTML rendering
  const bodyWithLineBreaks = (text: string) =>
    (text ?? "").replace(/\r\n/g, "\n").replace(/\n/g, "<br>\n");

  for (const lead of leads) {
    try {
      // Skip already-contacted leads
      if (lead.lastContactedAt) {
        results.push({ leadId: lead.id, email: lead.email, status: "skipped_verification", detail: "Already contacted" });
        continue;
      }

      // Step 1: Verify email (if not already verified)
      if (lead.emailVerified === null) {
        const verified = await verifyEmail(lead.email);
        await prisma.lead.update({ where: { id: lead.id }, data: { emailVerified: verified } });
        if (!verified) {
          results.push({ leadId: lead.id, email: lead.email, status: "skipped_verification", detail: "Email failed MX verification" });
          continue;
        }
      } else if (lead.emailVerified === false) {
        results.push({ leadId: lead.id, email: lead.email, status: "skipped_verification", detail: "Email previously failed verification" });
        continue;
      }

      // Step 2: Generate personalized sequence (if not already done)
      let steps: Array<{ subject: string; body: string }>;
      const existingSteps = lead.stepsJson ? (() => { try { const p = JSON.parse(lead.stepsJson); return Array.isArray(p) && p.length > 0 && p[0]?.subject ? p : null; } catch { return null; } })() : null;

      if (existingSteps) {
        steps = existingSteps;
      } else {
        const generated = await generateSequenceForLead(lead, { ...workspace, anthropicKey: workspace.anthropicKey! }, campaign);
        if (!generated) {
          results.push({ leadId: lead.id, email: lead.email, status: "skipped_generate_failed", detail: "Claude sequence generation failed" });
          continue;
        }
        steps = generated;

        // Persist the generated sequence
        const update: Record<string, string | null> = {
          stepsJson: JSON.stringify(steps),
        };
        if (steps[0]) { update.step1Subject = steps[0].subject || null; update.step1Body = steps[0].body || null; }
        if (steps[1]) { update.step2Subject = steps[1].subject || null; update.step2Body = steps[1].body || null; }
        if (steps[2]) { update.step3Subject = steps[2].subject || null; update.step3Body = steps[2].body || null; }
        await prisma.lead.update({ where: { id: lead.id }, data: update });
      }

      // Step 3: Quality gate
      if (!passesQualityGate(steps)) {
        results.push({ leadId: lead.id, email: lead.email, status: "skipped_quality_failed", detail: "Generated content did not pass quality gate (subject <10 chars or body <50 chars)" });
        continue;
      }

      // Step 4: Add to running Instantly campaign
      const numSteps = running.numSteps;
      const custom_variables: Record<string, string> = {};
      for (let i = 0; i < numSteps; i++) {
        const step = steps[i] ?? { subject: "", body: "" };
        custom_variables[`step${i + 1}_subject`] = step.subject ?? "";
        custom_variables[`step${i + 1}_body`] = bodyWithLineBreaks(step.body ?? "").trim();
      }

      const addResult = await client.bulkAddLeadsToCampaign(
        running.instantlyCampaignId,
        [{
          email: lead.email,
          first_name: lead.name?.split(/\s+/)[0] ?? null,
          last_name: lead.name?.split(/\s+/).slice(1).join(" ") || null,
          company_name: lead.company ?? null,
          custom_variables,
        }],
        { skip_if_in_campaign: true, verify_leads_on_import: false },
      );

      // Mark as contacted
      await prisma.lead.update({
        where: { id: lead.id },
        data: { lastContactedAt: new Date() },
      });

      results.push({
        leadId: lead.id,
        email: lead.email,
        status: "enrolled",
        detail: `Added to Instantly campaign ${running.instantlyCampaignId} (uploaded: ${addResult.leads_uploaded}, dup: ${addResult.duplicated_leads})`,
      });
    } catch (err) {
      console.error(`[auto-enroll] Error processing lead ${lead.id}:`, err);
      results.push({
        leadId: lead.id,
        email: lead.email,
        status: "error",
        detail: err instanceof Error ? err.message : "Unknown error",
      });
    }
  }

  return results;
}

// ---------------------------------------------------------------------------
// Fire-and-forget wrapper (for use from ingest endpoint)
// ---------------------------------------------------------------------------

export function autoEnrollAsync(options: AutoEnrollOptions): void {
  autoEnrollLeads(options).then((results) => {
    const enrolled = results.filter((r) => r.status === "enrolled").length;
    const skipped = results.filter((r) => r.status.startsWith("skipped_")).length;
    const errors = results.filter((r) => r.status === "error").length;
    console.log(`[auto-enroll] Campaign ${options.campaignId}: ${enrolled} enrolled, ${skipped} skipped, ${errors} errors`);
    if (errors > 0) {
      console.error("[auto-enroll] Errors:", results.filter((r) => r.status === "error"));
    }
  }).catch((err) => {
    console.error("[auto-enroll] Fatal error:", err);
  });
}
