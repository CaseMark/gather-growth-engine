import type { Skill } from "./types";
import linkedInManifest from "./linkedin-engagement/manifest.json";
import { run as linkedInRun } from "./linkedin-engagement/run";

/**
 * Registry of all pluggable skills. To add a new skill:
 * 1. Create skills/<id>/ with manifest.json and run.ts
 * 2. Import and add to this array
 */
const skills: Skill[] = [
  {
    manifest: linkedInManifest as Skill["manifest"],
    run: linkedInRun,
  },
];

export function getSkillsRegistry(): Skill[] {
  return skills;
}

export function getSkillById(id: string): Skill | undefined {
  return skills.find((s) => s.manifest.id === id);
}
