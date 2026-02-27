"use client";

import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, useEffect, Suspense } from "react";
import { useAuthGuard } from "@/hooks/useAuthGuard";
import { APP_DISPLAY_NAME } from "@/lib/app-config";

function ComposeInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const leadId = searchParams.get("leadId");
  const { ready, loading: guardLoading, session } = useAuthGuard();

  const [loading, setLoading] = useState(true);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [to, setTo] = useState("");
  const [context, setContext] = useState<Record<string, string | null>>({});
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");
  const [accounts, setAccounts] = useState<Array<{ email: string; warmup_status: number }>>([]);
  const [selectedFrom, setSelectedFrom] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  useEffect(() => {
    if (!session?.user?.id || !leadId) return;
    fetch("/api/leads/draft", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ leadId }),
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.error) {
          setError(data.error);
        } else {
          setTo(data.draft.to);
          setSubject(data.draft.subject);
          setBody(data.draft.body);
          setContext(data.context || {});
        }
      })
      .catch(() => setError("Failed to generate draft"))
      .finally(() => setLoading(false));

    // Load Instantly accounts
    fetch("/api/instantly/accounts")
      .then((r) => r.json())
      .then((data) => {
        if (data.accounts && data.accounts.length > 0) {
          setAccounts(data.accounts);
          // Pick the best account: prefer warmup_status=1 (active/warmed), then 0 (paused), avoid negative (banned/spam)
          const sorted = [...data.accounts].sort((a: { warmup_status: number }, b: { warmup_status: number }) => {
            const rank = (s: number) => s === 1 ? 0 : s === 0 ? 1 : 2;
            return rank(a.warmup_status) - rank(b.warmup_status);
          });
          setSelectedFrom(sorted[0].email);
        }
      })
      .catch(() => {});
  }, [session?.user?.id, leadId]);

  const handleCopy = () => {
    const text = `To: ${to}\nSubject: ${subject}\n\n${body}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSendInstantly = async () => {
    if (!selectedFrom || !to || !subject || !body) return;
    setSending(true);
    try {
      const res = await fetch("/api/leads/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ from: selectedFrom, to, subject, body }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to send");
      setSent(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Send failed");
    } finally {
      setSending(false);
    }
  };

  const handleMailto = () => {
    const mailto = `mailto:${to}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.open(mailto, "_blank");
  };

  if (guardLoading || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-zinc-400">Generating draft...</p>
      </div>
    );
  }
  if (!session) {
    router.push("/login");
    return null;
  }

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-zinc-800/80 bg-zinc-950/95 flex-shrink-0">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/dashboard" className="text-lg font-semibold text-zinc-100 tracking-tight">
            {APP_DISPLAY_NAME}
          </Link>
          <nav className="flex items-center gap-6 text-sm">
            <Link href="/dashboard" className="text-zinc-500 hover:text-zinc-200">Dashboard</Link>
            <Link href="/dashboard/leads" className="text-zinc-500 hover:text-zinc-200">Leads</Link>
            <span className="text-zinc-100">Compose</span>
            <span className="text-zinc-500">{session.user?.email}</span>
            <button onClick={() => signOut({ callbackUrl: "/" })} className="text-zinc-500 hover:text-zinc-200">Log out</button>
          </nav>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto px-6 py-10">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-semibold text-zinc-100">Compose Email</h1>
              <p className="text-sm text-zinc-500 mt-1">AI-suggested draft based on lead context</p>
            </div>
            <Link href="/dashboard/leads" className="text-sm text-zinc-500 hover:text-zinc-300">
              ← Back to leads
            </Link>
          </div>

          {error ? (
            <div className="rounded-md bg-red-900/20 border border-red-800 px-4 py-3 text-red-300">{error}</div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Email editor — 2/3 width */}
              <div className="lg:col-span-2 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-400 mb-1">To</label>
                  <input
                    value={to}
                    onChange={(e) => setTo(e.target.value)}
                    className="w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-zinc-200 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-400 mb-1">Subject</label>
                  <input
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    className="w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-zinc-200 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-400 mb-1">Body</label>
                  <textarea
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                    rows={12}
                    className="w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-zinc-200 text-sm font-mono"
                  />
                </div>
                {sent ? (
                  <div className="rounded-md bg-emerald-900/30 border border-emerald-800 px-4 py-3 text-emerald-300 text-sm">
                    ✓ Email sent via Instantly from {selectedFrom}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {accounts.length > 0 && (
                      <div className="flex items-center gap-3">
                        <select
                          value={selectedFrom}
                          onChange={(e) => setSelectedFrom(e.target.value)}
                          className="rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-zinc-200 text-sm"
                        >
                          {accounts.map((a) => (
                            <option key={a.email} value={a.email}>
                              {a.email} {a.warmup_status === 1 ? "✅ ready" : a.warmup_status === 0 ? "🔥 warming" : "⚠️ issue"}
                            </option>
                          ))}
                        </select>
                        <button
                          onClick={handleSendInstantly}
                          disabled={sending || !selectedFrom}
                          className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-50"
                        >
                          {sending ? "Sending..." : "Send via Instantly"}
                        </button>
                      </div>
                    )}
                    <div className="flex gap-3">
                      <button
                        onClick={handleMailto}
                        className="rounded-md border border-zinc-700 px-4 py-2 text-sm font-medium text-zinc-300 hover:bg-zinc-800"
                      >
                        Open in Mail App
                      </button>
                      <button
                        onClick={handleCopy}
                        className="rounded-md border border-zinc-700 px-4 py-2 text-sm font-medium text-zinc-300 hover:bg-zinc-800"
                      >
                        {copied ? "✓ Copied!" : "Copy to Clipboard"}
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Context sidebar — 1/3 width */}
              <div className="space-y-4">
                <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-4">
                  <h3 className="text-sm font-medium text-zinc-300 mb-3">📋 Lead Context</h3>
                  <dl className="space-y-2 text-sm">
                    {context.company && (
                      <div><dt className="text-zinc-500">Company</dt><dd className="text-zinc-300">{context.company}</dd></div>
                    )}
                    {context.jobTitle && (
                      <div><dt className="text-zinc-500">Title</dt><dd className="text-zinc-300">{context.jobTitle}</dd></div>
                    )}
                    {context.location && (
                      <div><dt className="text-zinc-500">Location</dt><dd className="text-zinc-300">{context.location}</dd></div>
                    )}
                    {context.pageVisited && (
                      <div>
                        <dt className="text-zinc-500">Page Visited</dt>
                        <dd className="text-emerald-400 break-all text-xs">{context.pageVisited}</dd>
                      </div>
                    )}
                    {context.referrer && (
                      <div>
                        <dt className="text-zinc-500">Referrer</dt>
                        <dd className="text-zinc-300 break-all text-xs">{context.referrer}</dd>
                      </div>
                    )}
                  </dl>
                </div>

                {context.pageContext && (
                  <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-4">
                    <h3 className="text-sm font-medium text-zinc-300 mb-2">🔍 Page Analysis</h3>
                    <p className="text-sm text-zinc-400">{context.pageContext}</p>
                  </div>
                )}

                {context.benchAnalysis && (
                  <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-4">
                    <h3 className="text-sm font-medium text-zinc-300 mb-2">🤖 Bench Analysis</h3>
                    <p className="text-sm text-zinc-400 whitespace-pre-wrap">{context.benchAnalysis}</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default function ComposePage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center"><p className="text-zinc-400">Loading...</p></div>}>
      <ComposeInner />
    </Suspense>
  );
}
