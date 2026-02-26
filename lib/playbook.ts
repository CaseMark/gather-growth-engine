/**
 * Playbook format support.
 * New format: guidelines (tone, structure, numSteps, stepDelays) - AI writes fully custom emails per lead.
 * Legacy format: steps (templates with subject/body) - for backward compat.
 */

export type PlaybookGuidelines = {
  tone: string;
  structure: string;
  numSteps: number;
  stepDelays: number[];
};

export type PlaybookLegacyStep = {
  stepNumber?: number;
  subject: string;
  body: string;
  delayDays: number;
};

export type PlaybookParsed = {
  numSteps: number;
  stepDelays: number[];
  guidelines?: PlaybookGuidelines;
  legacySteps?: PlaybookLegacyStep[];
};

const DEFAULT_DELAYS = [0, 3, 5];

/**
 * Parse playbook JSON. Supports both new (guidelines) and legacy (steps) formats.
 */
export function parsePlaybook(playbookJson: string | null): PlaybookParsed | null {
  if (!playbookJson?.trim()) return null;
  try {
    const pb = JSON.parse(playbookJson) as {
      guidelines?: PlaybookGuidelines;
      steps?: PlaybookLegacyStep[];
    };

    // New format: guidelines
    if (pb?.guidelines) {
      const g = pb.guidelines;
      const numSteps = Math.min(10, Math.max(1, g.numSteps ?? 3));
      const baseDelays = [0, 3, 5, 7, 10];
      const stepDelays = Array.isArray(g.stepDelays) && g.stepDelays.length >= numSteps
        ? g.stepDelays.slice(0, numSteps)
        : baseDelays.slice(0, numSteps);
      return {
        numSteps,
        stepDelays,
        guidelines: {
          tone: g.tone ?? "direct, consultative",
          structure: g.structure ?? "",
          numSteps,
          stepDelays,
        },
      };
    }

    // Legacy format: steps
    if (pb?.steps?.length) {
      const steps = pb.steps.slice(0, 10);
      const stepDelays = steps.map((s) => (typeof s.delayDays === "number" ? s.delayDays : 0));
      return {
        numSteps: steps.length,
        stepDelays,
        legacySteps: steps,
      };
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * Get sequence steps for Instantly (subject/body placeholders + delayDays).
 * Content comes from lead's custom_variables.
 */
export function getSequenceSteps(numSteps: number, stepDelays: number[]): Array<{ subject: string; body: string; delayDays: number }> {
  const delays = stepDelays.length >= numSteps ? stepDelays : [...DEFAULT_DELAYS, 7, 10].slice(0, numSteps);
  return Array.from({ length: numSteps }, (_, i) => ({
    subject: `{{step${i + 1}_subject}}`,
    body: `{{step${i + 1}_body}}`,
    delayDays: delays[i] ?? (i === 0 ? 0 : 3),
  }));
}
