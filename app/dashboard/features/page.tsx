"use client";

import { useState } from "react";
import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useAuthGuard } from "@/hooks/useAuthGuard";
import { APP_DISPLAY_NAME } from "@/lib/app-config";
import { RELEASE_NOTES } from "@/lib/release-notes";

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default function FeatureRequestPage() {
  const router = useRouter();
  const { ready, loading: guardLoading, session } = useAuthGuard();
  const { data: sessionData, status } = useSession();
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const signedIn = status === "authenticated" && !!sessionData?.user;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || message.trim().length < 10) {
      setFeedback({ type: "error", text: "Please describe your idea (at least 10 characters)." });
      return;
    }
    setSubmitting(true);
    setFeedback(null);
    try {
      const res = await fetch("/api/feedback/feature-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: message.trim() }),
      });
      const data = await res.json();
      if (res.ok) {
        setMessage("");
        setFeedback({ type: "success", text: data.message ?? "Thanks! Your idea has been sent." });
      } else {
        setFeedback({ type: "error", text: data.error ?? "Failed to submit." });
      }
    } catch {
      setFeedback({ type: "error", text: "Failed to submit." });
    } finally {
      setSubmitting(false);
    }
  };

  if (guardLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-zinc-400">Loading...</p>
      </div>
    );
  }
  if (!session) {
    router.push("/login");
    return null;
  }
  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-zinc-400">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-zinc-800/80 bg-zinc-950/95 flex-shrink-0">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/dashboard" className="text-lg font-semibold text-zinc-100 tracking-tight">
            {APP_DISPLAY_NAME}
          </Link>
          <nav className="flex items-center gap-6 text-sm">
            <Link href="/dashboard" className="text-zinc-500 hover:text-zinc-200">
              Dashboard
            </Link>
            <Link href="/dashboard/features" className="font-medium text-zinc-200">
              Feature Request
            </Link>
            <Link href="/onboarding" className="text-zinc-500 hover:text-zinc-200">
              Settings
            </Link>
            <span className="text-zinc-500">{session.user?.email}</span>
            <button
              onClick={() => signOut({ callbackUrl: "/" })}
              className="text-zinc-500 hover:text-zinc-200"
            >
              Log out
            </button>
          </nav>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto">
        <div className="max-w-6xl mx-auto px-6 py-12">
          <h1 className="text-2xl font-semibold text-zinc-100">Feature Request</h1>
          <p className="mt-1 text-sm text-zinc-500">
            Suggest ideas and see what&apos;s new.
          </p>

          <div className="mt-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left: Form */}
            <div className="lg:col-span-1">
              <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
                <h2 className="text-lg font-medium text-zinc-200">Suggest a feature</h2>
                <p className="mt-1 text-sm text-zinc-500">
                  Have an idea? We&apos;ll email it to the team.
                </p>
                {signedIn ? (
                  <form onSubmit={handleSubmit} className="mt-4 space-y-3">
                    <textarea
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder="Describe your idea…"
                      rows={4}
                      className="w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-200 placeholder-zinc-500 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      disabled={submitting}
                    />
                    <button
                      type="submit"
                      disabled={submitting || message.trim().length < 10}
                      className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-50"
                    >
                      {submitting ? "Sending…" : "Submit idea"}
                    </button>
                    {feedback && (
                      <p className={`text-sm ${feedback.type === "success" ? "text-emerald-400" : "text-amber-400"}`}>
                        {feedback.text}
                      </p>
                    )}
                  </form>
                ) : (
                  <p className="mt-4 text-sm text-zinc-500">
                    Sign in to submit feature requests.
                  </p>
                )}
              </div>
            </div>

            {/* Right: Release notes table */}
            <div className="lg:col-span-2">
              <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 overflow-hidden">
                <h2 className="px-6 py-4 text-lg font-medium text-zinc-200 border-b border-zinc-800">
                  What&apos;s new
                </h2>
                <p className="px-6 py-2 text-sm text-zinc-500 border-b border-zinc-800">
                  Latest features and bug fixes.
                </p>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-zinc-800 bg-zinc-900/80 text-left text-xs text-zinc-500">
                        <th className="px-6 py-3 font-medium">Feature / Fix</th>
                        <th className="px-6 py-3 font-medium">By</th>
                        <th className="px-6 py-3 font-medium">Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-800">
                      {RELEASE_NOTES.slice(0, 15).map((note, i) => (
                        <tr key={i} className="hover:bg-zinc-800/30">
                          <td className="px-6 py-3">
                            <span className="font-medium text-zinc-200">{note.title}</span>
                            <p className="mt-0.5 text-zinc-500">{note.description}</p>
                          </td>
                          <td className="px-6 py-3 text-zinc-500">{note.author}</td>
                          <td className="px-6 py-3 text-zinc-500">{formatDate(note.date)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      <footer className="border-t border-zinc-800 px-6 py-3">
        <div className="mx-auto max-w-5xl text-center">
          <a href="https://gatherhq.com" target="_blank" rel="noopener noreferrer" className="text-sm text-zinc-500 hover:text-zinc-400">
            Visit gatherhq.com
          </a>
        </div>
      </footer>
    </div>
  );
}
