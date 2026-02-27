import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getInstantlyClientForUserId } from "@/lib/instantly";

/** POST /api/leads/send — send a one-off email via Instantly */
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { from, to, subject, body } = (await request.json()) as {
      from?: string;
      to?: string;
      subject?: string;
      body?: string;
    };

    if (!from || !to || !subject || !body) {
      return NextResponse.json({ error: "from, to, subject, and body required" }, { status: 400 });
    }

    const ctx = await getInstantlyClientForUserId(session.user.id);
    if (!ctx) {
      return NextResponse.json(
        { error: "Instantly API key not configured. Go to Settings to add your Instantly key." },
        { status: 400 }
      );
    }

    const result = await ctx.client.sendEmail({ from, to, subject, body });
    return NextResponse.json({ ok: true, result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to send";
    console.error("Send email error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
