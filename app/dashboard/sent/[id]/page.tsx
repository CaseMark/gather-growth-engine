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
    leadBatch?: { id: string; name: string | null; leadCount: number; leads: Array<{ email: string; name: string | null; company: string | null; step1Subject: string | null; step1Body: string | null; stepsJson: string | null }> } | null;
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

          {/* Emails sent (sample) */}
          {sent.leadBatch && sent.leadBatch.leads.length > 0 && (
            <section className="mb-10">
              <h2 className="text-lg font-medium text-zinc-200 mb-4">Emails sent (sample)</h2>
              <p className="text-sm text-zinc-500 mb-3">
                {sent.leadBatch.leadCount} leads total; showing up to 50 below.
              </p>
              <div className="space-y-4">
                {sent.leadBatch.leads.slice(0, 10).map((lead) => {
                  let firstSubject = lead.step1Subject ?? "";
                  let firstBody = lead.step1Body ?? "";
                  if (lead.stepsJson) {
                    try {
                      const steps = JSON.parse(lead.stepsJson) as Array<{ subject?: string; body?: string }>;
                      if (steps[0]) {
                        firstSubject = steps[0].subject ?? firstSubject;
                        firstBody = steps[0].body ?? firstBody;
                      }
                    } catch {
                      //
                    }
                  }
                  return (
                    <div key={lead.email} className="rounded-lg border border-zinc-800 p-4 text-sm">
                      <p className="text-zinc-400 font-medium">{lead.email} {lead.company ? ` · ${lead.company}` : ""}</p>
                      <p className="mt-1 text-zinc-500">Subject: {firstSubject || "(none)"}</p>
                      <p className="mt-2 text-zinc-300 line-clamp-3">{firstBody || "(no body)"}</p>
                    </div>
                  );
                })}
              </div>
              {sent.leadBatch.leads.length > 10 && (
                <p className="mt-2 text-sm text-zinc-500">+ {Math.min(sent.leadBatch.leads.length - 10, 40)} more…</p>
              )}
            </section>
          )}

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

          {/* AI suggestions */}
          {(suggestion || (memory?.byPersona && Object.keys(memory.byPersona).length > 0)) && (
            <section className="mb-10">
              <h2 className="text-lg font-medium text-zinc-200 mb-4">AI suggestions</h2>
              <p className="text-sm text-zinc-400 mb-2">
                Based on performance memory and stat-sig results across your campaigns.
              </p>
              {suggestion && (
                <div className="rounded-lg border border-amber-800/50 bg-amber-900/20 p-4 text-sm text-amber-200">
                  {suggestion}
                </div>
              )}
            </section>
          )}

          {/* Playbook (editable) */}
          <section className="mb-10">
            <h2 className="text-lg font-medium text-zinc-200 mb-4">Playbook</h2>
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
          </section>
        </div>
      </main>
    </div>
  );
}
