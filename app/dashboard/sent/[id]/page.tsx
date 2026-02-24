"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { useState, useEffect } from "react";
import { useAuthGuard } from "@/hooks/useAuthGuard";
import { APP_DISPLAY_NAME } from "@/lib/app-config";

type Step = { stepNumber: number; subject: string; body: string; delayDays: number };

export default function SentCampaignDetailPage() {
  const params = useParams();
  const { ready, loading: guardLoading, session } = useAuthGuard();
  const sentId = params.id as string;

  const [sent, setSent] = useState<{
    id: string;
    name: string;
    createdAt: string;
    campaignId: string | null;
    campaign?: { id: string; name: string; playbookJson: string | null } | null;
    leadBatch?: { id: string; name: string | null; leadCount: number; leads: Array<{ id: string; email: string; name: string | null; company: string | null; step1Subject: string | null; step1Body: string | null; stepsJson: string | null }> } | null;
  } | null>(null);
  const [workspacePlaybook, setWorkspacePlaybook] = useState<string | null>(null);
  const [analytics, setAnalytics] = useState<{
    emails_sent_count?: number;
    open_count?: number;
    link_click_count?: number;
    open_rate_pct?: number;
    click_rate_pct?: number;
    reply_count?: number;
    suggestion?: string | null;
  } | null>(null);
  const [replies, setReplies] = useState<Array<{ fromEmail: string; subject: string | null; bodySnippet: string | null; classification: string | null; createdAt: string }>>([]);
  const [memory, setMemory] = useState<{ byPersona?: Record<string, unknown>; byVertical?: Record<string, unknown>; suggestion?: string | null } | null>(null);
  const [loading, setLoading] = useState(true);
  const [playbookSteps, setPlaybookSteps] = useState<Step[]>([]);
  const [savingPlaybook, setSavingPlaybook] = useState(false);
  const [playbookSaved, setPlaybookSaved] = useState(false);
  const [expandedLeadId, setExpandedLeadId] = useState<string | null>(null);
  const [emailsPage, setEmailsPage] = useState(1);
  const [testEmail, setTestEmail] = useState("");
  const [testSending, setTestSending] = useState(false);
  const [testMessage, setTestMessage] = useState("");
  const [showSequencePreview, setShowSequencePreview] = useState(false);
  const [playbookExpanded, setPlaybookExpanded] = useState(false);
  const [playbookAiInput, setPlaybookAiInput] = useState("");
  const [playbookAiOpen, setPlaybookAiOpen] = useState(false);
  const [playbookAiLoading, setPlaybookAiLoading] = useState(false);

  useEffect(() => {
    if (!sentId || !session?.user?.id) return;
    Promise.all([
      fetch(`/api/instantly/sent-campaigns/${sentId}`).then((r) => r.json()),
      fetch(`/api/instantly/sent-campaigns/${sentId}/analytics`).then((r) => r.json()),
      fetch(`/api/instantly/sent-campaigns/${sentId}/replies`).then((r) => r.json()),
      fetch("/api/performance-memory").then((r) => r.json()),
    ])
      .then(([detailRes, analyticsRes, repliesRes, memoryRes]) => {
        if (detailRes.sentCampaign) {
          setSent(detailRes.sentCampaign);
          setWorkspacePlaybook(detailRes.workspacePlaybook ?? null);
          const playbookSource = detailRes.sentCampaign.campaign?.playbookJson ?? detailRes.workspacePlaybook;
          let steps: Step[] = [];
          if (playbookSource) {
            try {
              const pb = JSON.parse(playbookSource) as { steps?: Step[] };
              if (pb?.steps?.length) steps = pb.steps;
            } catch {
              //
            }
          }
          if (steps.length === 0) {
            steps = [
              { stepNumber: 1, subject: "", body: "", delayDays: 0 },
              { stepNumber: 2, subject: "", body: "", delayDays: 3 },
              { stepNumber: 3, subject: "", body: "", delayDays: 5 },
            ];
          }
          setPlaybookSteps(steps);
        }
        if (!analyticsRes.error && analyticsRes.emails_sent_count !== undefined) setAnalytics(analyticsRes);
        if (repliesRes.replies) setReplies(repliesRes.replies);
        if (!memoryRes.error) setMemory(memoryRes);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [sentId, session?.user?.id]);

  useEffect(() => {
    if (session?.user?.email && !testEmail) setTestEmail(session.user.email);
  }, [session?.user?.email]);

  const savePlaybook = async () => {
    if (!sent) return;
    setSavingPlaybook(true);
    setPlaybookSaved(false);
    try {
      const playbookJson = JSON.stringify({ steps: playbookSteps });
      if (sent.campaignId && sent.campaign?.id) {
        const res = await fetch(`/api/campaigns/${sent.campaign.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ playbookJson }),
        });
        if (!res.ok) throw new Error("Failed to save");
      } else {
        const res = await fetch("/api/playbook", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ playbook: { steps: playbookSteps } }),
        });
        if (!res.ok) throw new Error("Failed to save");
      }
      setPlaybookSaved(true);
    } catch {
      //
    } finally {
      setSavingPlaybook(false);
    }
  };

  if (guardLoading || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-zinc-400">Loading...</p>
      </div>
    );
  }
  if (!session) return null;
  if (!ready || !sent) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-zinc-400">Campaign not found.</p>
        <Link href="/dashboard" className="ml-2 text-emerald-500">Dashboard</Link>
      </div>
    );
  }

  const suggestion = analytics?.suggestion ?? memory?.suggestion;

  type LeadRow = { id: string; email: string; name: string | null; company: string | null; step1Subject: string | null; step1Body: string | null; stepsJson: string | null };
  const getLeadStepsForDisplay = (lead: LeadRow): Array<{ subject: string; body: string }> => {
    if (lead.stepsJson) {
      try {
        const arr = JSON.parse(lead.stepsJson) as Array<{ subject?: string; body?: string }>;
        if (Array.isArray(arr) && arr.length > 0) {
          return arr.map((s) => ({ subject: s.subject ?? "", body: s.body ?? "" }));
        }
      } catch {
        //
      }
    }
    const s1 = lead.step1Subject ?? "";
    const b1 = lead.step1Body ?? "";
    if (s1 || b1) return [{ subject: s1, body: b1 }];
    return [];
  };

  const templateLead = sent.leadBatch?.leads?.find((l) => getLeadStepsForDisplay(l).length > 0);
  const previewSteps = templateLead ? getLeadStepsForDisplay(templateLead) : [];

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-zinc-800/80 bg-zinc-950/95 flex-shrink-0">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/dashboard" className="text-lg font-semibold text-zinc-100 tracking-tight">
            {APP_DISPLAY_NAME}
          </Link>
          <nav className="flex items-center gap-6 text-sm">
            <Link href="/dashboard" className="text-zinc-500 hover:text-zinc-200">Dashboard</Link>
            <Link href="/onboarding" className="text-zinc-500 hover:text-zinc-200">Settings</Link>
            <span className="text-zinc-500">{session.user?.email}</span>
            <button onClick={() => signOut({ callbackUrl: "/" })} className="text-zinc-500 hover:text-zinc-200">Log out</button>
          </nav>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto">
        <div className="max-w-5xl mx-auto px-6 py-10">
          <div className="flex items-center gap-4 mb-8">
            <Link href="/dashboard" className="text-zinc-500 hover:text-zinc-300">← Dashboard</Link>
            <h1 className="text-2xl font-semibold text-zinc-100">{sent.name}</h1>
            <span className="rounded-full px-2.5 py-0.5 text-xs font-medium bg-emerald-900/40 text-emerald-300">Launched</span>
          </div>

          {/* AI suggestions — at top for visibility */}
          {(suggestion || (memory?.byPersona && Object.keys(memory.byPersona).length > 0)) && (
            <section className="mb-10">
              <h2 className="text-lg font-medium text-zinc-200 mb-4">AI suggestions</h2>
              <p className="text-sm text-zinc-500 mb-2">
                Based on performance memory and stat-sig results across your campaigns.
              </p>
              {suggestion && (
                <div className="rounded-lg border border-amber-800/50 bg-amber-900/20 p-4 text-sm text-amber-200">
                  {suggestion}
                </div>
              )}
            </section>
          )}

          {/* Playbook (editable, collapsible) — above Emails sent, below AI suggestions */}
          <section className="mb-10">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
              <button
                type="button"
                onClick={() => setPlaybookExpanded((v) => !v)}
                className="flex items-center gap-2 text-left group"
              >
                <h2 className="text-lg font-medium text-zinc-200 group-hover:text-zinc-100">
                  Playbook
                </h2>
                <span className="text-zinc-500 text-sm">
                  {playbookExpanded ? "▼" : "▶"}
                </span>
              </button>
              <button
                type="button"
                onClick={() => setPlaybookAiOpen((v) => !v)}
                disabled={playbookSteps.length === 0}
                className="rounded-md border border-amber-600 px-3 py-1.5 text-sm font-medium text-amber-200 hover:bg-amber-900/30 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Update with AI
              </button>
            </div>
            {playbookAiOpen && (
              <div className="mb-4 flex flex-wrap items-end gap-2">
                <input
                  type="text"
                  value={playbookAiInput}
                  onChange={(e) => setPlaybookAiInput(e.target.value)}
                  placeholder="e.g. Make step 2 shorter, add more urgency to subject lines"
                  className="flex-1 min-w-[200px] rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-zinc-200 text-sm"
                />
                <button
                  type="button"
                  onClick={async () => {
                    if (!playbookAiInput.trim()) return;
                    setPlaybookAiLoading(true);
                    try {
                      const res = await fetch("/api/chat", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                          message: playbookAiInput.trim(),
                          context: { steps: playbookSteps },
                        }),
                      });
                      const data = await res.json();
                      if (data.error) throw new Error(data.error);
                      if (data.edits?.steps?.length) {
                        const edited = data.edits.steps as Step[];
                        const merged = edited.map((s, i) => ({
                          ...s,
                          delayDays: s.delayDays ?? playbookSteps[i]?.delayDays ?? (i === 0 ? 0 : 3),
                        }));
                        setPlaybookSteps(merged);
                        setPlaybookSaved(false);
                      }
                      setPlaybookAiInput("");
                    } catch {
                      setPlaybookAiInput("Failed. Try again.");
                    } finally {
                      setPlaybookAiLoading(false);
                    }
                  }}
                  disabled={playbookAiLoading || !playbookAiInput.trim()}
                  className="rounded-md bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-500 disabled:opacity-50"
                >
                  {playbookAiLoading ? "Applying…" : "Apply"}
                </button>
              </div>
            )}
            {!playbookExpanded ? (
              <div className="rounded-lg border border-zinc-800 bg-zinc-900/30 p-4 text-sm text-zinc-400">
                {playbookSteps.length === 0 ? (
                  "No playbook steps yet."
                ) : (
                  <div className="space-y-1">
                    {playbookSteps.map((s, i) => {
                      const body = s.body || "";
                      const preview = body.slice(0, 50) + (body.length > 50 ? "…" : "");
                      return (
                        <p key={i} className="truncate">
                          Step {i + 1}: {s.subject || "(no subject)"}{preview ? ` — ${preview}` : ""}
                        </p>
                      );
                    })}
                  </div>
                )}
              </div>
            ) : (
              <>
                <p className="text-sm text-zinc-500 mb-4">
                  {sent.campaignId ? "This campaign is linked to a playbook. Edit below and save to update it for future use." : "Edit the default playbook (used for new campaigns)."}
                </p>
                {playbookSteps.length === 0 && (
                  <p className="text-sm text-zinc-500 mb-4">No playbook steps yet. Add below and save.</p>
                )}
                <div className="space-y-4">
                  {playbookSteps.map((s, i) => (
                    <div key={i} className="rounded-lg border border-zinc-800 p-4">
                      <span className="text-xs text-zinc-500">Step {s.stepNumber}</span>
                      <input
                        placeholder="Subject"
                        value={s.subject}
                        onChange={(e) => setPlaybookSteps((prev) => prev.map((x, j) => j === i ? { ...x, subject: e.target.value } : x))}
                        className="mt-1 w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-zinc-200 text-sm"
                      />
                      <textarea
                        placeholder="Body"
                        value={s.body}
                        onChange={(e) => setPlaybookSteps((prev) => prev.map((x, j) => j === i ? { ...x, body: e.target.value } : x))}
                        rows={3}
                        className="mt-2 w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-zinc-200 text-sm"
                      />
                    </div>
                  ))}
                </div>
                <div className="mt-4 flex items-center gap-3">
                  <button
                    onClick={savePlaybook}
                    disabled={savingPlaybook}
                    className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-50"
                  >
                    {savingPlaybook ? "Saving…" : "Save playbook"}
                  </button>
                  {playbookSaved && <span className="text-sm text-emerald-400">Saved.</span>}
                </div>
              </>
            )}
          </section>

          {/* Stats */}
          <section className="mb-10">
            <h2 className="text-lg font-medium text-zinc-200 mb-4">Stats</h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
                <p className="text-xs text-zinc-500 uppercase tracking-wider">Sent</p>
                <p className="mt-1 text-2xl font-semibold text-zinc-100 tabular-nums">{analytics?.emails_sent_count ?? "—"}</p>
              </div>
              <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
                <p className="text-xs text-zinc-500 uppercase tracking-wider">Open rate</p>
                <p className="mt-1 text-2xl font-semibold text-zinc-100 tabular-nums">{analytics?.open_rate_pct != null ? `${analytics.open_rate_pct}%` : "—"}</p>
              </div>
              <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
                <p className="text-xs text-zinc-500 uppercase tracking-wider">Click rate</p>
                <p className="mt-1 text-2xl font-semibold text-zinc-100 tabular-nums">{analytics?.click_rate_pct != null ? `${analytics.click_rate_pct}%` : "—"}</p>
              </div>
              <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
                <p className="text-xs text-zinc-500 uppercase tracking-wider">Replies</p>
                <p className="mt-1 text-2xl font-semibold text-zinc-100 tabular-nums">{analytics?.reply_count ?? replies.length ?? "—"}</p>
              </div>
            </div>
          </section>

          {/* Send test to my email (for this launched campaign) */}
          <section className="mb-10">
            <h2 className="text-lg font-medium text-zinc-200 mb-4">Send test to my email</h2>
            <p className="text-sm text-zinc-500 mb-3">
              Creates a separate test campaign with 2-min delays. Emails send when Instantly's schedule allows (Mon–Fri, 9am–5pm). Check your Instantly dashboard and inbox (including spam).
            </p>
            <div className="flex flex-wrap items-end gap-3">
              <div className="flex-1 min-w-[200px]">
                <label className="block text-xs text-zinc-500 mb-1">Test email</label>
                <input
                  type="email"
                  value={testEmail}
                  onChange={(e) => setTestEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-zinc-200 text-sm"
                />
              </div>
              <button
                type="button"
                onClick={async () => {
                  setTestSending(true);
                  setTestMessage("");
                  try {
                    const res = await fetch(`/api/instantly/sent-campaigns/${sentId}/test`, {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ testEmail: testEmail.trim() }),
                    });
                    const data = await res.json();
                    if (res.ok) setTestMessage(data.message ?? "Test lead added. Check your inbox.");
                    else setTestMessage(data.error ?? "Failed");
                  } catch {
                    setTestMessage("Request failed");
                  } finally {
                    setTestSending(false);
                  }
                }}
                disabled={testSending || !testEmail.trim()}
                className="rounded-md bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-500 disabled:opacity-50"
              >
                {testSending ? "Sending…" : "Send test to my email"}
              </button>
              {previewSteps.length > 0 && (
                <button
                  type="button"
                  onClick={() => setShowSequencePreview((v) => !v)}
                  className="rounded-md border border-zinc-600 px-4 py-2 text-sm font-medium text-zinc-300 hover:bg-zinc-800"
                >
                  {showSequencePreview ? "Hide sequence preview" : "Preview sequence"}
                </button>
              )}
            </div>
            {testMessage && (
              <p className={`mt-3 text-sm ${testMessage.includes("Check your inbox") || testMessage.includes("added") || testMessage.includes("activated") ? "text-emerald-400" : "text-amber-400"}`}>
                {testMessage}
              </p>
            )}
            {showSequencePreview && previewSteps.length > 0 && (
              <div className="mt-4 rounded-lg border border-zinc-700 bg-zinc-900/50 p-4 space-y-4">
                <p className="text-sm text-zinc-400">What will be sent (personalized per lead). Sample from {templateLead?.email ?? "first lead"}:</p>
                {previewSteps.map((step, i) => (
                  <div key={i} className="rounded border border-zinc-700 p-3">
                    <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">Step {i + 1}</p>
                    <p className="text-zinc-400 font-medium">Subject: {step.subject || "(none)"}</p>
                    <pre className="mt-2 text-zinc-300 whitespace-pre-wrap font-sans text-sm break-words">
                      {step.body || "(no body)"}
                    </pre>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Emails sent — paginated, click any to read full content */}
          {sent.leadBatch && sent.leadBatch.leads.length > 0 && (() => {
            const PAGE_SIZE = 10;
            const total = sent.leadBatch.leads.length;
            const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
            const page = Math.min(emailsPage, totalPages);
            const start = (page - 1) * PAGE_SIZE;
            const pageLeads = sent.leadBatch.leads.slice(start, start + PAGE_SIZE);
            return (
            <section className="mb-10">
              <h2 className="text-lg font-medium text-zinc-200 mb-4">Emails sent</h2>
              <p className="text-sm text-zinc-500 mb-3">
                {sent.leadBatch.leadCount} leads total; showing {start + 1}–{Math.min(start + PAGE_SIZE, total)} of {total}. Click any row to read the full email(s).
              </p>
              <div className="space-y-2">
                {pageLeads.map((lead) => {
                  const steps = getLeadStepsForDisplay(lead);
                  const firstSubject = steps[0]?.subject ?? "";
                  const firstBody = steps[0]?.body ?? "";
                  const isExpanded = expandedLeadId === lead.id;
                  return (
                    <div
                      key={lead.id}
                      className="rounded-lg border border-zinc-800 overflow-hidden text-sm"
                    >
                      <button
                        type="button"
                        onClick={() => setExpandedLeadId(isExpanded ? null : lead.id)}
                        className="w-full text-left p-4 hover:bg-zinc-800/50 transition-colors"
                      >
                        <p className="text-zinc-400 font-medium">{lead.email}{lead.company ? ` · ${lead.company}` : ""}</p>
                        <p className="mt-1 text-zinc-500">Subject: {firstSubject || "(none)"}</p>
                        {!isExpanded && (
                          <p className="mt-2 text-zinc-300 line-clamp-2">{firstBody || "(no body)"}</p>
                        )}
                        <p className="mt-2 text-xs text-zinc-500">{isExpanded ? "▼ Click to collapse" : "▶ Click to read full email"}</p>
                      </button>
                      {isExpanded && (
                        <div className="border-t border-zinc-800 p-4 bg-zinc-900/50 space-y-6">
                          {steps.map((step, i) => (
                            <div key={i}>
                              <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">Step {i + 1}</p>
                              <p className="text-zinc-500 font-medium">Subject: {step.subject || "(none)"}</p>
                              <pre className="mt-2 text-zinc-300 whitespace-pre-wrap font-sans text-sm break-words">
                                {step.body || "(no body)"}
                              </pre>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              {totalPages > 1 && (
                <div className="mt-4 flex items-center gap-4 text-sm">
                  <button
                    type="button"
                    onClick={() => setEmailsPage((p) => Math.max(1, p - 1))}
                    disabled={page <= 1}
                    className="rounded border border-zinc-600 px-3 py-1.5 text-zinc-300 hover:bg-zinc-800 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Previous
                  </button>
                  <span className="text-zinc-500">
                    Page {page} of {totalPages}
                  </span>
                  <button
                    type="button"
                    onClick={() => setEmailsPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page >= totalPages}
                    className="rounded border border-zinc-600 px-3 py-1.5 text-zinc-300 hover:bg-zinc-800 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next
                  </button>
                </div>
              )}
            </section>
            );
          })()}

          {/* Replies */}
          {replies.length > 0 && (
            <section className="mb-10">
              <h2 className="text-lg font-medium text-zinc-200 mb-4">Replies</h2>
              <div className="space-y-3">
                {replies.map((r, i) => (
                  <div key={i} className="rounded-lg border border-zinc-800 p-4 text-sm">
                    <p className="text-zinc-400">{r.fromEmail} {r.classification ? ` · ${r.classification}` : ""}</p>
                    {r.subject && <p className="text-zinc-500 mt-0.5">Re: {r.subject}</p>}
                    <p className="mt-2 text-zinc-300 line-clamp-2">{r.bodySnippet ?? ""}</p>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      </main>
    </div>
  );
}
