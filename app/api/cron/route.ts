import { NextResponse } from "next/server";
import { getSkillsRegistry } from "@/skills/registry";

/**
 * GET /api/cron — Run scheduled skills. Called by Vercel Cron.
 * Secured by CRON_SECRET: set in Vercel, pass as Authorization: Bearer <CRON_SECRET>.
 */
export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  const secret = process.env.CRON_SECRET;
  if (!secret || authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const skills = getSkillsRegistry();
  const scheduled = skills.filter((s) => s.manifest.schedule);
  const results: Array<{ id: string; ok: boolean; message: string }> = [];

  for (const skill of scheduled) {
    try {
      const result = await skill.run({ config: undefined });
      results.push({ id: skill.manifest.id, ok: result.ok, message: result.message });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Skill run failed";
      results.push({ id: skill.manifest.id, ok: false, message: msg });
    }
  }

  return NextResponse.json({ ran: results.length, results });
}
