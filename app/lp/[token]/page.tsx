import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function LandingPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!token?.trim()) notFound();

  const lead = await prisma.lead.findFirst({
    where: { landingPageToken: token.trim() },
    select: { name: true, company: true, email: true },
  });

  if (!lead) notFound();

  const firstName = lead.name?.split(/\s+/)[0] || "there";

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex items-center justify-center p-6">
      <div className="max-w-xl text-center space-y-6">
        <h1 className="text-2xl font-semibold">
          Hi {firstName}{lead.company ? ` from ${lead.company}` : ""},
        </h1>
        <p className="text-zinc-400">
          This is your personalized page. The sender crafted this specifically for you — check your email for the full message and next steps.
        </p>
        <p className="text-sm text-zinc-500">
          If you have questions, reply to the email you received.
        </p>
      </div>
    </div>
  );
}
