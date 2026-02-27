"use client";

import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Fragment, useState, useEffect, useMemo } from "react";
import { useAuthGuard } from "@/hooks/useAuthGuard";
import { APP_DISPLAY_NAME } from "@/lib/app-config";

type Lead = {
  id: string;
  email: string;
  name: string | null;
  company: string | null;
  jobTitle: string | null;
  industry: string | null;
  linkedinUrl: string | null;
  city: string | null;
  state: string | null;
  pageVisited: string | null;
  referrer: string | null;
  source: string | null;
  icp: string | null;
  employeeCount: string | null;
  revenue: string | null;
  metadataJson: string | null;
  createdAt: string;
  batchId: string;
  batchName: string | null;
  campaigns: Array<{ id: string; name: string }>;
};

type Campaign = {
  id: string;
  name: string;
  status: string;
  leadBatchId: string | null;
};

export default function LeadsPage() {
  const router = useRouter();
  const { ready, loading: guardLoading, session } = useAuthGuard();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "unassigned" | "assigned">("all");
  const [search, setSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [assignCampaignId, setAssignCampaignId] = useState("");
  const [assigning, setAssigning] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!session?.user?.id) return;
    fetch("/api/leads/all")
      .then((r) => r.json())
      .then((data) => {
        setLeads(data.leads ?? []);
        setCampaigns(data.campaigns ?? []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [session?.user?.id]);

  const filtered = useMemo(() => {
    let list = leads;
    if (filter === "unassigned") {
      list = list.filter((l) => l.campaigns.length === 0);
    } else if (filter === "assigned") {
      list = list.filter((l) => l.campaigns.length > 0);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (l) =>
          l.email.toLowerCase().includes(q) ||
          (l.name?.toLowerCase().includes(q)) ||
          (l.company?.toLowerCase().includes(q)) ||
          (l.jobTitle?.toLowerCase().includes(q)) ||
          (l.batchName?.toLowerCase().includes(q))
      );
    }
    return list;
  }, [leads, filter, search]);

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selectedIds.size === filtered.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filtered.map((l) => l.id)));
    }
  };

  const handleAssign = async () => {
    if (!assignCampaignId || selectedIds.size === 0) return;
    setAssigning(true);
    setMessage("");
    try {
      const res = await fetch("/api/leads/assign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leadIds: Array.from(selectedIds), campaignId: assignCampaignId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      setMessage(`✓ Assigned ${data.moved} lead(s) to campaign`);
      setSelectedIds(new Set());
      // Refresh
      const refresh = await fetch("/api/leads/all");
      const refreshData = await refresh.json();
      setLeads(refreshData.leads ?? []);
      setCampaigns(refreshData.campaigns ?? []);
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Failed");
    } finally {
      setAssigning(false);
    }
  };

  const handleDelete = async () => {
    if (selectedIds.size === 0) return;
    if (!confirm(`Delete ${selectedIds.size} lead(s)? This cannot be undone.`)) return;
    setDeleting(true);
    setMessage("");
    try {
      const res = await fetch("/api/leads/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leadIds: Array.from(selectedIds) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      setMessage(`🗑 Deleted ${data.deleted} lead(s)`);
      setSelectedIds(new Set());
      const refresh = await fetch("/api/leads/all");
      const refreshData = await refresh.json();
      setLeads(refreshData.leads ?? []);
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Failed");
    } finally {
      setDeleting(false);
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

  const unassignedCount = leads.filter((l) => l.campaigns.length === 0).length;

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-zinc-800/80 bg-zinc-950/95 flex-shrink-0">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/dashboard" className="text-lg font-semibold text-zinc-100 tracking-tight">
            {APP_DISPLAY_NAME}
          </Link>
          <nav className="flex items-center gap-6 text-sm">
            <Link href="/dashboard" className="text-zinc-500 hover:text-zinc-200">Dashboard</Link>
            <Link href="/dashboard/leads" className="text-zinc-100">Leads</Link>
            <Link href="/dashboard/features" className="text-zinc-500 hover:text-zinc-200">Feature Request</Link>
            <Link href="/onboarding" className="text-zinc-500 hover:text-zinc-200">Settings</Link>
            <span className="text-zinc-500">{session.user?.email}</span>
            <button onClick={() => signOut({ callbackUrl: "/" })} className="text-zinc-500 hover:text-zinc-200">Log out</button>
          </nav>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto">
        <div className="max-w-6xl mx-auto px-6 py-10">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-semibold text-zinc-100">Leads</h1>
              <p className="text-sm text-zinc-500 mt-1">
                {leads.length} total · {unassignedCount} unassigned
              </p>
            </div>
          </div>

          {/* Filters and search */}
          <div className="flex flex-wrap items-center gap-3 mb-4">
            <div className="flex rounded-md border border-zinc-700 overflow-hidden">
              {(["all", "unassigned", "assigned"] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-3 py-1.5 text-sm capitalize ${
                    filter === f
                      ? "bg-zinc-700 text-zinc-100"
                      : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800"
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search leads..."
              className="flex-1 min-w-[200px] rounded-md border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-zinc-200 text-sm"
            />
          </div>

          {/* Bulk assign bar */}
          {selectedIds.size > 0 && (
            <div className="flex flex-wrap items-center gap-3 mb-4 rounded-md border border-emerald-900/50 bg-emerald-950/20 px-4 py-3">
              <span className="text-sm text-zinc-300">{selectedIds.size} selected</span>
              <select
                value={assignCampaignId}
                onChange={(e) => setAssignCampaignId(e.target.value)}
                className="rounded-md border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-zinc-200 text-sm"
              >
                <option value="">Assign to campaign...</option>
                {campaigns.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
              <button
                onClick={handleAssign}
                disabled={!assignCampaignId || assigning}
                className="rounded-md bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-50"
              >
                {assigning ? "Assigning..." : "Assign"}
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="rounded-md border border-red-800 px-3 py-1.5 text-sm font-medium text-red-400 hover:bg-red-900/30 disabled:opacity-50"
              >
                {deleting ? "Deleting..." : "Delete"}
              </button>
              <button
                onClick={() => setSelectedIds(new Set())}
                className="text-sm text-zinc-500 hover:text-zinc-300"
              >
                Clear
              </button>
            </div>
          )}

          {message && (
            <div className="mb-4 rounded-md bg-zinc-800 px-4 py-2 text-sm text-zinc-300">{message}</div>
          )}

          {/* Lead table */}
          <div className="rounded-lg border border-zinc-800 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-zinc-900/80">
                <tr>
                  <th className="px-4 py-3 text-left">
                    <input
                      type="checkbox"
                      checked={filtered.length > 0 && selectedIds.size === filtered.length}
                      onChange={toggleAll}
                      className="rounded border-zinc-600 bg-zinc-800 text-emerald-600"
                    />
                  </th>
                  <th className="px-4 py-3 text-left text-zinc-400 font-medium">Name</th>
                  <th className="px-4 py-3 text-left text-zinc-400 font-medium">Email</th>
                  <th className="px-4 py-3 text-left text-zinc-400 font-medium">Company</th>
                  <th className="px-4 py-3 text-left text-zinc-400 font-medium">Title</th>
                  <th className="px-4 py-3 text-left text-zinc-400 font-medium">ICP</th>
                  <th className="px-4 py-3 text-left text-zinc-400 font-medium">Campaign</th>
                  <th className="px-4 py-3 text-left text-zinc-400 font-medium">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800">
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-8 text-center text-zinc-500">
                      No leads found
                    </td>
                  </tr>
                ) : (
                  filtered.map((lead) => (
                    <Fragment key={lead.id}>
                    <tr className="hover:bg-zinc-900/40">
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          checked={selectedIds.has(lead.id)}
                          onChange={() => toggleSelect(lead.id)}
                          className="rounded border-zinc-600 bg-zinc-800 text-emerald-600"
                        />
                      </td>
                      <td className="px-4 py-3 text-zinc-200">{lead.name || "—"}</td>
                      <td className="px-4 py-3 text-zinc-300">{lead.email}</td>
                      <td className="px-4 py-3 text-zinc-400">{lead.company || "—"}</td>
                      <td className="px-4 py-3 text-zinc-400">{lead.jobTitle || "—"}</td>
                      <td className="px-4 py-3">
                        {lead.icp ? (
                          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                            lead.icp === "general" ? "bg-zinc-800 text-zinc-400" : "bg-emerald-900/40 text-emerald-300"
                          }`}>
                            {lead.icp}
                          </span>
                        ) : (
                          <span className="rounded-full bg-zinc-800 px-2 py-0.5 text-xs text-zinc-500">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {lead.campaigns.length > 0 ? (
                          <span className="text-emerald-400 text-xs">{lead.campaigns[0].name}</span>
                        ) : (
                          <span className="text-zinc-600 text-xs">unassigned</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className="flex gap-2">
                          <button
                            onClick={() => setExpandedId(expandedId === lead.id ? null : lead.id)}
                            className="text-xs text-zinc-500 hover:text-zinc-300"
                          >
                            {expandedId === lead.id ? "Hide" : "View"}
                          </button>
                          <button
                            onClick={() => router.push(`/dashboard/leads/compose?leadId=${lead.id}`)}
                            className="text-xs text-emerald-500 hover:text-emerald-300"
                            title="Compose email"
                          >
                            ✉️
                          </button>
                        </span>
                      </td>
                    </tr>
                    {expandedId === lead.id && (
                      <tr className="bg-zinc-900/60">
                        <td colSpan={8} className="px-8 py-4">
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
                            {lead.source && <div><span className="text-zinc-500">Source:</span> <span className="text-zinc-300">{lead.source}</span></div>}
                            {lead.industry && <div><span className="text-zinc-500">Industry:</span> <span className="text-zinc-300">{lead.industry}</span></div>}
                            {(lead.city || lead.state) && <div><span className="text-zinc-500">Location:</span> <span className="text-zinc-300">{[lead.city, lead.state].filter(Boolean).join(", ")}</span></div>}
                            {lead.employeeCount && <div><span className="text-zinc-500">Employees:</span> <span className="text-zinc-300">{lead.employeeCount}</span></div>}
                            {lead.revenue && <div><span className="text-zinc-500">Revenue:</span> <span className="text-zinc-300">{lead.revenue}</span></div>}
                            {lead.pageVisited && <div><span className="text-zinc-500">Page:</span> <span className="text-zinc-300 break-all">{lead.pageVisited}</span></div>}
                            {lead.referrer && <div><span className="text-zinc-500">Referrer:</span> <span className="text-zinc-300 break-all">{lead.referrer}</span></div>}
                            {lead.linkedinUrl && <div><span className="text-zinc-500">LinkedIn:</span> <a href={lead.linkedinUrl} target="_blank" rel="noopener" className="text-blue-400 hover:underline break-all">{lead.linkedinUrl}</a></div>}
                            <div><span className="text-zinc-500">Batch:</span> <span className="text-zinc-300">{lead.batchName || lead.batchId}</span></div>
                            <div><span className="text-zinc-500">Added:</span> <span className="text-zinc-300">{new Date(lead.createdAt).toLocaleDateString()}</span></div>
                          </div>
                          {(() => {
                            try {
                              const meta = lead.metadataJson ? JSON.parse(lead.metadataJson) : null;
                              if (meta?.benchAnalysis) {
                                return (
                                  <div className="mt-3 rounded-md border border-zinc-700 bg-zinc-800/50 px-4 py-3">
                                    <div className="text-xs font-medium text-zinc-400 mb-1">🤖 AI Analysis (Bench)</div>
                                    <div className="text-sm text-zinc-300 whitespace-pre-wrap">{meta.benchAnalysis}</div>
                                  </div>
                                );
                              }
                              return null;
                            } catch { return null; }
                          })()}
                        </td>
                      </tr>
                    )}
                    </Fragment>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}
