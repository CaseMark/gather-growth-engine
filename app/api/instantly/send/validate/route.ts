import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const MIN_SUBJECT_LENGTH = 10;
const MIN_BODY_LENGTH = 50;
const MAX_STEPS = 10;

/**
 * GET /api/instantly/send/validate?batchId=...&campaignId=...
 * Returns per-step validation so UI can show "Email 1: ✓ Passed", "Email 2: ✗ N failed", etc.
 */
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const batchId = searchParams.get("batchId");
    const campaignIdParam = searchParams.get("campaignId");

    if (!batchId) {
      return NextResponse.json({ error: "batchId is required" }, { status: 400 });
    }

    const workspace = await prisma.workspace.findUnique({
      where: { userId: session.user.id },
      select: { id: true, playbookJson: true },
    });
    if (!workspace) {
      return NextResponse.json({ error: "Workspace not found" }, { status: 404 });
    }

    let playbookSource: string | null = workspace.playbookJson;
    if (campaignIdParam) {
      const campaign = await prisma.campaign.findFirst({
        where: { id: campaignIdParam, workspaceId: workspace.id },
        select: { playbookJson: true },
      });
      if (campaign?.playbookJson) playbookSource = campaign.playbookJson;
    }

    let playbookSteps: Array<{ subject: string; body: string; delayDays: number }> = [
      { subject: "", body: "", delayDays: 0 },
      { subject: "", body: "", delayDays: 3 },
      { subject: "", body: "", delayDays: 5 },
    ];
    try {
      const playbook = playbookSource ? (JSON.parse(playbookSource) as { steps?: Array<{ subject: string; body: string; delayDays: number }> }) : null;
      if (playbook?.steps?.length) {
        playbookSteps = playbook.steps.slice(0, MAX_STEPS).map((s) => ({
          subject: s.subject ?? "",
          body: s.body ?? "",
          delayDays: typeof s.delayDays === "number" ? s.delayDays : 0,
        }));
      }
    } catch {
      // use default
    }

    const batch = await prisma.leadBatch.findFirst({
      where: { id: batchId, workspaceId: workspace.id },
      include: { leads: true },
    });
    if (!batch) {
      return NextResponse.json({ error: "Batch not found" }, { status: 404 });
    }

    const numSteps = playbookSteps.length;

    type LeadWithSteps = (typeof batch.leads)[0] & { stepsJson?: string | null };
    const getLeadSteps = (lead: LeadWithSteps, n: number): Array<{ subject: string; body: string }> => {
      let arr: Array<{ subject?: string; body?: string }>;
      try {
        if (lead.stepsJson) {
          const parsed = JSON.parse(lead.stepsJson) as unknown;
          arr = Array.isArray(parsed) ? parsed : [];
        } else {
          arr = [];
        }
      } catch {
        arr = [];
      }
      const legacy = [
        { subject: lead.step1Subject ?? "", body: lead.step1Body ?? "" },
        { subject: lead.step2Subject ?? "", body: lead.step2Body ?? "" },
        { subject: lead.step3Subject ?? "", body: lead.step3Body ?? "" },
      ];
      const steps: Array<{ subject: string; body: string }> = [];
      for (let i = 0; i < n; i++) {
        const s = arr[i] ?? legacy[i] ?? { subject: "", body: "" };
        steps.push({ subject: s.subject ?? "", body: s.body ?? "" });
      }
      return steps;
    };

    type StepFail = { leadEmail: string; stepIndex: number; reason: string };
    const stepFails: StepFail[] = [];
    const leadsPassingAllSteps = batch.leads.filter((l) => {
      const steps = getLeadSteps(l as LeadWithSteps, numSteps);
      for (let i = 0; i < steps.length; i++) {
        const subj = (steps[i]?.subject ?? "").trim();
        const body = (steps[i]?.body ?? "").trim();
        if (subj.length < MIN_SUBJECT_LENGTH) {
          stepFails.push({ leadEmail: l.email, stepIndex: i + 1, reason: `subject too short (${subj.length} chars)` });
          return false;
        }
        if (body.length < MIN_BODY_LENGTH) {
          stepFails.push({ leadEmail: l.email, stepIndex: i + 1, reason: `body too short (${body.length} chars)` });
          return false;
        }
      }
      return true;
    });

    const failsByStep = new Map<number, StepFail[]>();
    stepFails.forEach((f) => {
      const list = failsByStep.get(f.stepIndex) ?? [];
      list.push(f);
      failsByStep.set(f.stepIndex, list);
    });

    const steps = Array.from({ length: numSteps }, (_, i) => {
      const stepNum = i + 1;
      const failures = failsByStep.get(stepNum) ?? [];
      const passed = leadsPassingAllSteps.length;
      const failed = failures.length;
      return {
        step: stepNum,
        passed,
        failed,
        passedAllLeads: failed === 0,
        sampleFailures: failures.slice(0, 5).map((f) => `${f.leadEmail}: ${f.reason}`),
      };
    });

    return NextResponse.json({
      numSteps,
      totalLeads: batch.leads.length,
      leadsPassingAllSteps: leadsPassingAllSteps.length,
      canSend: leadsPassingAllSteps.length === batch.leads.length && batch.leads.length > 0,
      steps,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Validation failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
