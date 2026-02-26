/**
 * Pre-built playbook templates for one-click selection.
 * Each template provides guidelines (tone, structure, numSteps, stepDelays).
 */

export type PlaybookTemplate = {
  id: string;
  name: string;
  description: string;
  guidelines: {
    tone: string;
    structure: string;
    numSteps: number;
    stepDelays: number[];
  };
};

export const PLAYBOOK_TEMPLATES: PlaybookTemplate[] = [
  {
    id: "saas-cold",
    name: "SaaS cold outreach",
    description: "Direct, value-first sequence for B2B SaaS prospects",
    guidelines: {
      tone: "direct, consultative, value-focused",
      structure:
        "Step 1: Hook with a sharp question about their specific pain or goal. Step 2: Elaborate on value and proof (metrics, similar companies). Step 3: Soft CTA — offer a quick call or resource. Step 4: Break pattern with a different angle or social proof. Step 5: Last touch — concise, low-pressure close.",
      numSteps: 5,
      stepDelays: [0, 3, 5, 7, 10],
    },
  },
  {
    id: "agency-pitch",
    name: "Agency pitch",
    description: "Relationship-building sequence for agency and consulting outreach",
    guidelines: {
      tone: "friendly, consultative, partnership-oriented",
      structure:
        "Step 1: Introduce yourself and reference something specific about their work. Step 2: Share a relevant case study or outcome. Step 3: Propose a low-commitment next step (15-min call, audit). Step 4: Add social proof or a different angle. Step 5: Final touch with a clear, easy CTA.",
      numSteps: 5,
      stepDelays: [0, 3, 5, 7, 10],
    },
  },
  {
    id: "product-launch",
    name: "Product launch",
    description: "Announcement-style sequence for new product or feature",
    guidelines: {
      tone: "excited, clear, benefit-driven",
      structure:
        "Step 1: Tease the launch — what problem it solves. Step 2: Reveal the product/feature and key benefits. Step 3: Social proof or early results. Step 4: Limited-time offer or urgency. Step 5: Final reminder and CTA.",
      numSteps: 5,
      stepDelays: [0, 2, 4, 6, 8],
    },
  },
  {
    id: "short-3step",
    name: "Short 3-step",
    description: "Minimal follow-up for busy decision-makers",
    guidelines: {
      tone: "direct, concise, respectful of time",
      structure:
        "Step 1: One-line hook and value prop. Step 2: One proof point or case study. Step 3: Single CTA — call or reply.",
      numSteps: 3,
      stepDelays: [0, 3, 5],
    },
  },
];

export function getTemplateById(id: string): PlaybookTemplate | undefined {
  return PLAYBOOK_TEMPLATES.find((t) => t.id === id);
}
