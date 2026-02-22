/**
 * Types for pluggable skills/modules.
 * Add a new skill in skills/<id>/ and register it in skills/registry.ts.
 */

export type SkillSchedule = {
  /** Cron expression (e.g. "0 9,18 * * *" for 9am and 6pm daily). */
  cron: string;
  /** Timezone (e.g. "America/New_York"). */
  timezone?: string;
};

export type SkillManifest = {
  id: string;
  name: string;
  description: string;
  /** Optional: run on a schedule via Vercel Cron. */
  schedule?: SkillSchedule;
  /** Optional: JSON schema for config (for validation only). */
  configSchema?: Record<string, unknown>;
};

export type SkillRunContext = {
  /** User ID when run from dashboard; undefined when run from cron/MCP with API key. */
  userId?: string;
  /** Arbitrary config passed to run (e.g. from stored skill config or request body). */
  config?: Record<string, unknown>;
};

export type SkillRunResult = {
  ok: boolean;
  message: string;
  data?: Record<string, unknown>;
  error?: string;
};

export type Skill = {
  manifest: SkillManifest;
  /** Run the skill. Throw or return { ok: false } on failure. */
  run: (context: SkillRunContext) => Promise<SkillRunResult>;
};
