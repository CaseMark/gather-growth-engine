import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/** PATCH: update workspace settings (e.g. anthropicModel). */
export async function PATCH(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const { anthropicModel } = body as { anthropicModel?: string | null };

    await prisma.workspace.update({
      where: { userId: session.user.id },
      data: {
        anthropicModel: anthropicModel === null || anthropicModel === "" ? null : (anthropicModel as string),
      },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Workspace PATCH error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
