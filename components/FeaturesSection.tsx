"use client";

import { useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { RELEASE_NOTES } from "@/lib/release-notes";

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default function FeaturesSection() {
  const { data: session, status } = useSession();
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const signedIn = status === "authenticated" && !!session?.user;

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

  return (
    <section className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-6 sm:p-8">
      <h2 className="text-xl font-semibold text-zinc-100 sm:text-2xl">Features</h2>

      {/* Feature requests */}
      <div className="mt-6">
        <h3 className="text-sm font-medium text-zinc-300">Suggest a feature</h3>
        <p className="mt-1 text-sm text-zinc-500">
          Have an idea? We&apos;ll email it to the team. Your feedback shapes the product.
        </p>
        {signedIn ? (
          <form onSubmit={handleSubmit} className="mt-3 space-y-3">
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Describe your idea…"
              rows={3}
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
          <p className="mt-3 text-sm text-zinc-500">
            <Link href="/login" className="text-emerald-400 hover:text-emerald-300">
              Sign in
            </Link>{" "}
            to submit feature requests.
          </p>
        )}
      </div>

      {/* Latest releases */}
      <div className="mt-8">
        <h3 className="text-sm font-medium text-zinc-300">What&apos;s new</h3>
        <p className="mt-1 text-sm text-zinc-500">Latest features and bug fixes.</p>
        <div className="mt-3 overflow-hidden rounded-lg border border-zinc-800">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-800 bg-zinc-900/80 text-left text-xs text-zinc-500">
                <th className="px-4 py-3 font-medium">Feature / Fix</th>
                <th className="px-4 py-3 font-medium hidden sm:table-cell">By</th>
                <th className="px-4 py-3 font-medium hidden sm:table-cell">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              {RELEASE_NOTES.slice(0, 10).map((note, i) => (
                <tr key={i} className="hover:bg-zinc-800/30">
                  <td className="px-4 py-3">
                    <span className="font-medium text-zinc-200">{note.title}</span>
                    <p className="mt-0.5 text-zinc-500">{note.description}</p>
                  </td>
                  <td className="px-4 py-3 text-zinc-500 hidden sm:table-cell">{note.author}</td>
                  <td className="px-4 py-3 text-zinc-500 hidden sm:table-cell">{formatDate(note.date)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
