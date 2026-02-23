"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { useSession, signOut } from "next-auth/react";
import { useAuthGuard } from "@/hooks/useAuthGuard";
import { APP_DISPLAY_NAME } from "@/lib/app-config";

type Step = "playbook" | "sequences" | "send";

type CampaignData = {
  id: string;
  name: string;
  status: string;
  playbookJson: string | null;
  icp: string | null;
  leadBatchId: string | null;
  leadBatch?: {
    id: string;
    name: string | null;
    leads: Array<{ id: string; email: string; name: string | null; company: string | null; jobTitle: string | null; step1Subject: string | null; step1Body: string | null; stepsJson: string | null }>;
  } | null;
  sentCampaigns: Array<{ id: string; name: string; instantlyCampaignId: string; createdAt: string }>;
};

export default function CampaignPage() {
  const params = useParams();
  const router = useRouter();
  const { ready, loading: guardLoading, session } = useAuthGuard();
  const id = params.id as string;

  const [campaign, setCampaign] = useState<CampaignData | null>(null);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState<Step>("playbook");
  const [editingSteps, setEditingSteps] = useState<Array<{ stepNumber: number; subject: string; body: string; delayDays: number }>>([]);
  const [savingPlaybook, setSavingPlaybook] = useState(false);
  const [playbookError, setPlaybookError] = useState("");
  const [batches, setBatches] = useState<Array<{ id: string; name: string | null; leadCount: number }>>([]);
  const [selectedBatchId, setSelectedBatchId] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [generateError, setGenerateError] = useState("");
  const [csvInput, setCsvInput] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [campaignNameInput, setCampaignNameInput] = useState("");
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState("");
  const [instantlyAccounts, setInstantlyAccounts] = useState<Array<{ email: string }>>([]);
  const [accountsLoading, setAccountsLoading] = useState(false);
  const [selectedAccountEmails, setSelectedAccountEmails] = useState<string[] | null>(null);

  useEffect(() => {
    if (!id || !session?.user?.id) return;
    fetch(`/api/campaigns/${id}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.campaign) {
          setCampaign(data.campaign);
          setCampaignNameInput(data.campaign.name || "");
          if (data.campaign.playbookJson) {
            try {
              const pb = JSON.parse(data.campaign.playbookJson) as { steps?: Array<{ stepNumber?: number; subject: string; body: string; delayDays: number }> };
              if (pb?.steps?.length) {
                setEditingSteps(pb.steps.map((s, i) => ({
                  stepNumber: (s.stepNumber ?? i + 1),
                  subject: s.subject ?? "",
                  body: s.body ?? "",
                  delayDays: typeof s.delayDays === "number" ? s.delayDays : i === 0 ? 0 : 3,
                })));
              } else {
                setEditingSteps([{ stepNumber: 1, subject: "", body: "", delayDays: 0 }, { stepNumber: 2, subject: "", body: "", delayDays: 3 }, { stepNumber: 3, subject: "", body: "", delayDays: 5 }]);
              }
            } catch {
              setEditingSteps([{ stepNumber: 1, subject: "", body: "", delayDays: 0 }, { stepNumber: 2, subject: "", body: "", delayDays: 3 }, { stepNumber: 3, subject: "", body: "", delayDays: 5 }]);
            }
          } else {
            setEditingSteps([{ stepNumber: 1, subject: "", body: "", delayDays: 0 }, { stepNumber: 2, subject: "", body: "", delayDays: 3 }, { stepNumber: 3, subject: "", body: "", delayDays: 5 }]);
          }
          if (data.campaign.leadBatchId) {
            setSelectedBatchId(data.campaign.leadBatchId);
          }
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id, session?.user?.id]);

  useEffect(() => {
    if (!session?.user?.id) return;
    fetch("/api/leads")
      .then((r) => r.json())
      .then((data) => setBatches(data.batches ?? []))
      .catch(() => {});
  }, [session?.user?.id]);

  useEffect(() => {
    if (!session?.user?.id) return;
    setAccountsLoading(true);
    fetch("/api/instantly/accounts")
      .then((r) => r.json())
      .then((data) => {
        const accs = data.accounts ?? [];
        setInstantlyAccounts(accs);
        if (accs.length > 0 && selectedAccountEmails === null) setSelectedAccountEmails(accs.map((a: { email: string }) => a.email));
      })
      .catch(() => {})
      .finally(() => setAccountsLoading(false));
  }, [session?.user?.id]);

  const savePlaybookAndNext = async () => {
    if (!id) return;
    setSavingPlaybook(true);
    setPlaybookError("");
    try {
      const playbookJson = JSON.stringify({ steps: editingSteps });
      const res = await fetch(`/api/campaigns/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ playbookJson }),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || "Failed to save");
      }
      setCampaign((c) => c ? { ...c, playbookJson } : null);
      setStep("sequences");
    } catch (e) {
      setPlaybookError(e instanceof Error ? e.message : "Failed to save playbook");
    } finally {
      setSavingPlaybook(false);
    }
  };

  const linkBatchAndGenerate = async () => {
    if (!id || !selectedBatchId) {
      setGenerateError("Select or upload a lead list first.");
      return;
    }
    setGenerateError("");
    try {
      await fetch(`/api/campaigns/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leadBatchId: selectedBatchId }),
      });
    } catch {
      // ignore
    }
    setGenerating(true);
    try {
      const res = await fetch("/api/leads/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ batchId: selectedBatchId, campaignId: id, limit: 2 }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Generate failed");
      if (data.done !== undefined && data.total > 0 && data.done < data.total) {
        setGenerateError(`Generated ${data.done} of ${data.total}. Click "Generate sequences" again to continue.`);
      } else {
        setStep("send");
        setCampaign((c) => c ? { ...c, status: "sequences_ready", leadBatchId: selectedBatchId } : null);
      }
    } catch (e) {
      setGenerateError(e instanceof Error ? e.message : "Generate failed");
    } finally {
      setGenerating(false);
    }
  };

  const handleUpload = async () => {
    if (!csvInput.trim()) {
      setUploadError("Paste CSV content (headers: email, name, company, job title).");
      return;
    }
    setUploading(true);
    setUploadError("");
    try {
      const res = await fetch("/api/leads/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ csv: csvInput }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Upload failed");
      setSelectedBatchId(data.batchId);
      setBatches((prev) => [{ id: data.batchId, name: null, leadCount: data.count }, ...prev]);
      setCsvInput("");
    } catch (e) {
      setUploadError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const handleLaunch = async () => {
    if (!id || !campaign?.leadBatchId || !campaignNameInput.trim()) {
      setSendError("Campaign name and lead list are required.");
      return;
    }
    setSending(true);
    setSendError("");
    try {
      const res = await fetch("/api/instantly/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          batchId: campaign.leadBatchId,
          campaignName: campaignNameInput.trim(),
          campaignId: id,
          accountEmails: selectedAccountEmails && selectedAccountEmails.length > 0 ? selectedAccountEmails : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Send failed");
      setCampaign((c) => c ? { ...c, status: "launched" } : null);
      router.push("/dashboard");
      router.refresh();
    } catch (e) {
      setSendError(e instanceof Error ? e.message : "Send failed");
    } finally {
      setSending(false);
    }
  };

  if (guardLoading || loading) {
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
  if (!ready || !campaign) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-zinc-400">Campaign not found.</p>
        <Link href="/dashboard" className="ml-2 text-emerald-500">Back to dashboard</Link>
      </div>
    );
  }

  const isLaunched = campaign.status === "launched";
  const leadCount = campaign.leadBatch?.leads?.length ?? 0;

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-zinc-800/80 bg-zinc-950/95 flex-shrink-0">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
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
        <div className="max-w-4xl mx-auto px-6 py-10">
          <div className="flex items-center gap-4 mb-8">
            <Link href="/dashboard" className="text-zinc-500 hover:text-zinc-300">← Dashboard</Link>
            <h1 className="text-2xl font-semibold text-zinc-100">{campaign.name}</h1>
            <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
              isLaunched ? "bg-emerald-900/40 text-emerald-300" : "bg-zinc-800 text-zinc-400"
            }`}>{campaign.status}</span>
          </div>

          {isLaunched ? (
            <div className="space-y-6">
              <p className="text-zinc-400">This campaign has been launched. Sent campaigns: {campaign.sentCampaigns.length}. Total leads: {leadCount}.</p>
              <div className="flex flex-wrap gap-3">
                {campaign.sentCampaigns?.length > 0 && (
                  <Link
                    href={`/dashboard/sent/${campaign.sentCampaigns[0].id}`}
                    className="inline-flex rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500"
                  >
                    View stats, emails & playbook →
                  </Link>
                )}
                <Link href="/dashboard" className="inline-flex rounded-md border border-zinc-600 px-4 py-2 text-sm font-medium text-zinc-300 hover:bg-zinc-800">
                  Back to dashboard
                </Link>
              </div>
            </div>
          ) : (
            <>
              <div className="flex gap-2 mb-8 border-b border-zinc-800 pb-4">
                {(["playbook", "sequences", "send"] as const).map((s) => (
                  <button
                    key={s}
                    onClick={() => setStep(s)}
                    className={`rounded-md px-4 py-2 text-sm font-medium capitalize ${
                      step === s ? "bg-zinc-700 text-zinc-100" : "text-zinc-500 hover:text-zinc-300"
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>

              {step === "playbook" && (
                <div className="space-y-4">
                  <h2 className="text-lg font-medium text-zinc-200">Playbook (email sequence)</h2>
                  <p className="text-sm text-zinc-500">Edit steps below. Then click Next to add leads and generate personalized sequences.</p>
                  {playbookError && <div className="rounded-md bg-red-900/20 border border-red-800 px-4 py-2 text-sm text-red-300">{playbookError}</div>}
                  {editingSteps.map((s, i) => (
                    <div key={i} className="rounded-lg border border-zinc-800 p-4 space-y-2">
                      <span className="text-xs text-zinc-500">Step {s.stepNumber}</span>
                      <input
                        placeholder="Subject"
                        value={s.subject}
                        onChange={(e) => setEditingSteps((prev) => prev.map((x, j) => j === i ? { ...x, subject: e.target.value } : x))}
                        className="w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-zinc-200 text-sm"
                      />
                      <textarea
                        placeholder="Body"
                        value={s.body}
                        onChange={(e) => setEditingSteps((prev) => prev.map((x, j) => j === i ? { ...x, body: e.target.value } : x))}
                        rows={4}
                        className="w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-zinc-200 text-sm"
                      />
                    </div>
                  ))}
                  <button
                    onClick={savePlaybookAndNext}
                    disabled={savingPlaybook}
                    className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-50"
                  >
                    {savingPlaybook ? "Saving…" : "Next: Add leads & generate sequences"}
                  </button>
                </div>
              )}

              {step === "sequences" && (
                <div className="space-y-4">
                  <h2 className="text-lg font-medium text-zinc-200">Leads & sequences</h2>
                  <p className="text-sm text-zinc-500">Upload a CSV (email, name, company, job title) or select an existing list. Then generate personalized email sequences for each lead.</p>
                  <div>
                    <label className="block text-sm text-zinc-400 mb-1">Paste CSV</label>
                    <textarea
                      value={csvInput}
                      onChange={(e) => setCsvInput(e.target.value)}
                      placeholder="email,name,company,job title\njane@acme.com,Jane,Acme,VP Sales"
                      rows={3}
                      className="w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-zinc-200 text-sm"
                    />
                    <button onClick={handleUpload} disabled={uploading} className="mt-2 rounded-md bg-zinc-700 px-3 py-1.5 text-sm text-zinc-200 hover:bg-zinc-600 disabled:opacity-50">
                      {uploading ? "Uploading…" : "Upload CSV"}
                    </button>
                    {uploadError && <p className="mt-1 text-sm text-red-400">{uploadError}</p>}
                  </div>
                  <div>
                    <label className="block text-sm text-zinc-400 mb-1">Or select existing list</label>
                    <select
                      value={selectedBatchId ?? ""}
                      onChange={(e) => setSelectedBatchId(e.target.value || null)}
                      className="rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-zinc-200 text-sm"
                    >
                      <option value="">Select batch</option>
                      {batches.map((b) => (
                        <option key={b.id} value={b.id}>{b.name ?? b.id} ({b.leadCount} leads)</option>
                      ))}
                    </select>
                  </div>
                  {generateError && <p className="text-sm text-amber-400">{generateError}</p>}
                  <button
                    onClick={linkBatchAndGenerate}
                    disabled={!selectedBatchId || generating}
                    className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-50"
                  >
                    {generating ? "Generating…" : "Generate sequences & Next"}
                  </button>
                </div>
              )}

              {step === "send" && (
                <div className="space-y-4">
                  <h2 className="text-lg font-medium text-zinc-200">Configure & launch</h2>
                  <p className="text-sm text-zinc-500">Set campaign name and which Instantly mailboxes to use. Then launch.</p>
                  <div>
                    <label className="block text-sm text-zinc-400 mb-1">Campaign name</label>
                    <input
                      value={campaignNameInput}
                      onChange={(e) => setCampaignNameInput(e.target.value)}
                      placeholder="e.g. Q1 Outbound"
                      className="w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-zinc-200 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-zinc-400 mb-1">Instantly accounts</label>
                    {accountsLoading ? <p className="text-zinc-500 text-sm">Loading…</p> : (
                      <p className="text-sm text-zinc-500">
                        {instantlyAccounts.length === 0 ? "Add your Instantly API key in Settings to see accounts." : `${instantlyAccounts.length} account(s) available. Sending will use all (or configure in Settings).`}
                      </p>
                    )}
                  </div>
                  {sendError && <div className="rounded-md bg-red-900/20 border border-red-800 px-4 py-2 text-sm text-red-300">{sendError}</div>}
                  <button
                    onClick={handleLaunch}
                    disabled={sending || !campaignNameInput.trim() || !campaign.leadBatchId}
                    className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-50"
                  >
                    {sending ? "Launching…" : "Launch campaign"}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
}
