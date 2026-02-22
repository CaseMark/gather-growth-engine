import { NextResponse } from "next/server";
import { getSkillsRegistry } from "@/skills/registry";

/**
 * GET /api/skills — List all registered skills (id, name, description, schedule).
 * No auth required so MCP and UI can discover available skills.
 */
export async function GET() {
  try {
    const skills = getSkillsRegistry();
    const list = skills.map((s) => ({
      id: s.manifest.id,
      name: s.manifest.name,
      description: s.manifest.description,
      schedule: s.manifest.schedule ?? null,
    }));
    return NextResponse.json({ skills: list });
  } catch (e) {
    console.error("Skills list error:", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
