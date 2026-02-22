import { NextResponse } from "next/server";
import { getAuth } from "@/lib/api-auth";
import { getSkillById } from "@/skills/registry";

/**
 * POST /api/skills/[skillId]/run — Run a skill. Body: { config?: object }.
 * Auth: session (dashboard) or X-API-Key (MCP/programmatic).
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ skillId: string }> }
) {
  try {
    const auth = await getAuth(request);
    if (auth.type === "none") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { skillId } = await params;
    const skill = getSkillById(skillId);
    if (!skill) {
      return NextResponse.json({ error: "Skill not found" }, { status: 404 });
    }

    const body = await request.json().catch(() => ({}));
    const config = typeof body.config === "object" && body.config !== null ? body.config : undefined;

    const result = await skill.run({
      userId: auth.type === "session" ? auth.userId : undefined,
      config,
    });

    return NextResponse.json(result);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Skill run failed";
    return NextResponse.json({ ok: false, message, error: message }, { status: 500 });
  }
}
