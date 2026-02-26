import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { sendErrorNotificationEmail } from "@/lib/email";

/**
 * POST: Report an error (e.g. generation failure). Sends email to mayank@gatherhq.com.
 * Body: { context: string, error: string, extra?: object }
 */
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const context = typeof body.context === "string" ? body.context.trim() : "Unknown";
    const error = typeof body.error === "string" ? body.error : String(body.error ?? "Unknown error");
    const extra = body.extra && typeof body.extra === "object" ? body.extra : undefined;

    await sendErrorNotificationEmail(context, error, {
      ...extra,
      userEmail: session.user?.email,
      userId: session.user?.id,
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Error report failed:", err);
    return NextResponse.json({ error: "Failed to report" }, { status: 500 });
  }
}
