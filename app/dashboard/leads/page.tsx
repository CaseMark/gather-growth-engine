"use client";

import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { Fragment, Suspense, useState, useEffect, useCallback } from "react";
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
  icpChangedAt: string | null;
  lastContactedAt: string | null;
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

const PAGE_SIZES = [25, 50, 100, 200];

export default function LeadsPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-zinc-400">Loading...</p>
      </div>
    }>
      <LeadsPageInner />
    </Suspense>
  );
}

function LeadsPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { ready, loading: guardLoading, session } = useAuthGuard();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "unassigned" | "assigned">(
    (searchParams.get("filter") as "all" | "unassigned" | "assigned") || "all"
  );
  const [search, setSearch] = useState(searchParams.get("search") ?? "");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [assignCampaignId, setAssignCampaignId] = useState("");
  const [assigning, setAssigning] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  // Pagination state
  const [page, setPage] = useState(parseInt(searchParams.get("page") ?? "1", 10));
  const [pageSize, setPageSize] = useState(parseInt(searchParams.get("pageSize") ?? "50", 10));
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  // ICP dropdown state
  const [icpOptions, setIcpOptions] = useState<string[]>([]);
  const [updatingIcpLeadId, setUpdatingIcpLeadId] = useState<string | null>(null);

  // Debounce search
  const [debouncedSearch, setDebouncedSearch] = useState(search);
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  // Reset to page 1 when filter/search changes
  useEffect(() => {
    setPage(1);
  }, [filter, debouncedSearch]);

  const fetchLeads = useCallback(async () => {
    if (!session?.user?.id) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(pageSize),
        filter,
      });
      if (debouncedSearch) params.set("search", debouncedSearch);
      const res = await fetch(`/api/leads/all?${params}`);
      const data = await res.json();
      setLeads(data.leads ?? []);
      setCampaigns(data.campaigns ?? []);
      setTotalCount(data.totalCount ?? 0);
      setTotalPages(data.totalPages ?? 0);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [session?.user?.id, page, pageSize, filter, debouncedSearch]);

  useEffect(() => {
    fetchLeads();
  }, [fetchLeads]);

  // Fetch ICP options
  useEffect(() => {
    if (!session?.user?.id) return;
    fetch("/api/leads/icp")
      .then((r) => r.json())
      .then((data) => setIcpOptions(data.icpOptions ?? []))
      .catch(() => {});
  }, [session?.user?.id]);

  // Update URL params when pagination changes
  useEffect(() => {
    const params = new URLSearchParams();
    if (page > 1) params.set("page", String(page));
    if (pageSize !== 50) params.set("pageSize", String(pageSize));
    if (filter !== "all") params.set("filter", filter);
    if (search) params.set("search", search);
    const qs = params.toString();
    const newUrl = `/dashboard/leads${qs ? `?${qs}` : ""}`;
    window.history.replaceState(null, "", newUrl);
  }, [page, pageSize, filter, search]);

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selectedIds.size === leads.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(leads.map((l) => l.id)));
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
      setMessage(`Assigned ${data.moved} lead(s) to campaign`);
      setSelectedIds(new Set());
      await fetchLeads();
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
      setMessage(`Deleted ${data.deleted} lead(s)`);
      setSelectedIds(new Set());
      await fetchLeads();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Failed");
    } finally {
      setDeleting(false);
    }
  };

  const handleIcpChange = async (leadId: string, newIcp: string | null) => {
    setUpdatingIcpLeadId(leadId);
    try {
      const res = await fetch("/api/leads/icp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leadIds: [leadId], icp: newIcp }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      // Update local state immediately
      setLeads((prev) =>
        prev.map((l) =>
          l.id === leadId ? { ...l, icp: newIcp, icpChangedAt: new Date().toISOString() } : l
        )
      );
      // Refresh ICP options if new value was entered
      if (newIcp && !icpOptions.includes(newIcp)) {
        setIcpOptions((prev) => [...prev, newIcp].sort((a, b) => a.localeCompare(b)));
      }
      setMessage(`ICP updated to "${newIcp || "none"}" (2-min grace period before sequences)`);
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Failed to update ICP");
    } finally {
      setUpdatingIcpLeadId(null);
    }
  };

  const handleBulkIcpChange = async (newIcp: string | null) => {
    if (selectedIds.size === 0) return;
    setAssigning(true);
    setMessage("");
    try {
      const res = await fetch("/api/leads/icp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leadIds: Array.from(selectedIds), icp: newIcp }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      setMessage(`ICP updated to "${newIcp || "none"}" for ${data.updated} lead(s) (2-min grace period)`);
      setSelectedIds(new Set());
      await fetchLeads();
      // Refresh ICP options
      if (newIcp && !icpOptions.includes(newIcp)) {
        setIcpOptions((prev) => [...prev, newIcp].sort((a, b) => a.localeCompare(b)));
      }
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Failed to update ICP");
    } finally {
      setAssigning(false);
    }
  };

  if (guardLoading || (loading && leads.length === 0)) {
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

  const startItem = (page - 1) * pageSize + 1;
  const endItem = Math.min(page * pageSize, totalCount);

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
                {totalCount} total
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

          {/* Bulk action bar */}
          {selectedIds.size > 0 && (
            <div className="flex flex-wrap items-center gap-3 mb-4 rounded-md border border-emerald-900/50 bg-emerald-950/20 px-4 py-3">
              <span className="text-sm text-zinc-300">{selectedIds.size} selected</span>

              {/* Assign to campaign */}
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

              {/* Bulk ICP assign */}
              <IcpDropdown
                value=""
                options={icpOptions}
                onChange={(val) => handleBulkIcpChange(val)}
                placeholder="Set ICP..."
                className="rounded-md border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-zinc-200 text-sm"
              />

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
                      checked={leads.length > 0 && selectedIds.size === leads.length}
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
                  <th className="px-4 py-3 text-left text-zinc-400 font-medium">Contacted</th>
                  <th className="px-4 py-3 text-left text-zinc-400 font-medium">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800">
                {leads.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-4 py-8 text-center text-zinc-500">
                      {loading ? "Loading..." : "No leads found"}
                    </td>
                  </tr>
                ) : (
                  leads.map((lead) => (
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
                      <td className="px-4 py-3 text-zinc-200">{lead.name || "\u2014"}</td>
                      <td className="px-4 py-3 text-zinc-300">{lead.email}</td>
                      <td className="px-4 py-3 text-zinc-400">{lead.company || "\u2014"}</td>
                      <td className="px-4 py-3 text-zinc-400">{lead.jobTitle || "\u2014"}</td>
                      <td className="px-4 py-3">
                        <IcpDropdown
                          value={lead.icp ?? ""}
                          options={icpOptions}
                          onChange={(val) => handleIcpChange(lead.id, val)}
                          disabled={updatingIcpLeadId === lead.id}
                          className="w-full min-w-[120px] rounded-md border border-zinc-700 bg-zinc-900 px-2 py-1 text-xs text-zinc-200"
                        />
                      </td>
                      <td className="px-4 py-3">
                        {lead.campaigns.length > 0 ? (
                          <span className="text-emerald-400 text-xs">{lead.campaigns[0].name}</span>
                        ) : (
                          <span className="text-zinc-600 text-xs">unassigned</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {lead.lastContactedAt ? (
                          <span className="text-amber-400 text-xs" title={new Date(lead.lastContactedAt).toLocaleString()}>
                            {(() => {
                              const d = new Date(lead.lastContactedAt);
                              const now = new Date();
                              const diffMs = now.getTime() - d.getTime();
                              const diffMins = Math.floor(diffMs / 60000);
                              if (diffMins < 60) return `${diffMins}m ago`;
                              const diffHrs = Math.floor(diffMins / 60);
                              if (diffHrs < 24) return `${diffHrs}h ago`;
                              const diffDays = Math.floor(diffHrs / 24);
                              return `${diffDays}d ago`;
                            })()}
                          </span>
                        ) : (
                          <span className="text-zinc-600 text-xs">--</span>
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
                            Compose
                          </button>
                        </span>
                      </td>
                    </tr>
                    {expandedId === lead.id && (
                      <tr className="bg-zinc-900/60">
                        <td colSpan={9} className="px-8 py-4">
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
                            {lead.icpChangedAt && (
                              <div><span className="text-zinc-500">ICP changed:</span> <span className="text-zinc-300">{new Date(lead.icpChangedAt).toLocaleString()}</span></div>
                            )}
                            {lead.lastContactedAt && (
                              <div><span className="text-zinc-500">Last contacted:</span> <span className="text-amber-400">{new Date(lead.lastContactedAt).toLocaleString()}</span></div>
                            )}
                          </div>
                          {(() => {
                            try {
                              const meta = lead.metadataJson ? JSON.parse(lead.metadataJson) : null;
                              if (meta?.benchAnalysis) {
                                return (
                                  <div className="mt-3 rounded-md border border-zinc-700 bg-zinc-800/50 px-4 py-3">
                                    <div className="text-xs font-medium text-zinc-400 mb-1">AI Analysis (Bench)</div>
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

          {/* Pagination controls */}
          {totalPages > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-4 mt-4 text-sm">
              <div className="flex items-center gap-2 text-zinc-400">
                <span>
                  {totalCount > 0 ? `${startItem}-${endItem} of ${totalCount}` : "0 leads"}
                </span>
                <span className="text-zinc-600">|</span>
                <label className="flex items-center gap-1">
                  <span>Show</span>
                  <select
                    value={pageSize}
                    onChange={(e) => {
                      setPageSize(parseInt(e.target.value, 10));
                      setPage(1);
                    }}
                    className="rounded border border-zinc-700 bg-zinc-900 px-2 py-1 text-zinc-200 text-sm"
                  >
                    {PAGE_SIZES.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                  <span>per page</span>
                </label>
              </div>

              <div className="flex items-center gap-1">
                <button
                  onClick={() => setPage(1)}
                  disabled={page <= 1}
                  className="rounded border border-zinc-700 px-2.5 py-1 text-zinc-300 hover:bg-zinc-800 disabled:opacity-30 disabled:cursor-not-allowed"
                  title="First page"
                >
                  First
                </button>
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="rounded border border-zinc-700 px-2.5 py-1 text-zinc-300 hover:bg-zinc-800 disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  Prev
                </button>
                <span className="px-3 py-1 text-zinc-300">
                  Page {page} of {totalPages}
                </span>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  className="rounded border border-zinc-700 px-2.5 py-1 text-zinc-300 hover:bg-zinc-800 disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  Next
                </button>
                <button
                  onClick={() => setPage(totalPages)}
                  disabled={page >= totalPages}
                  className="rounded border border-zinc-700 px-2.5 py-1 text-zinc-300 hover:bg-zinc-800 disabled:opacity-30 disabled:cursor-not-allowed"
                  title="Last page"
                >
                  Last
                </button>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

/** Inline ICP dropdown component with custom entry support */
function IcpDropdown({
  value,
  options,
  onChange,
  disabled,
  placeholder,
  className,
}: {
  value: string;
  options: string[];
  onChange: (val: string | null) => void;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
}) {
  const [customMode, setCustomMode] = useState(false);
  const [customValue, setCustomValue] = useState("");

  if (customMode) {
    return (
      <div className="flex gap-1">
        <input
          type="text"
          value={customValue}
          onChange={(e) => setCustomValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && customValue.trim()) {
              onChange(customValue.trim());
              setCustomMode(false);
              setCustomValue("");
            }
            if (e.key === "Escape") {
              setCustomMode(false);
              setCustomValue("");
            }
          }}
          placeholder="Type ICP name..."
          autoFocus
          className={className}
          style={{ minWidth: "100px" }}
        />
        <button
          onClick={() => {
            if (customValue.trim()) {
              onChange(customValue.trim());
            }
            setCustomMode(false);
            setCustomValue("");
          }}
          className="text-xs text-emerald-400 hover:text-emerald-300 px-1"
        >
          OK
        </button>
        <button
          onClick={() => { setCustomMode(false); setCustomValue(""); }}
          className="text-xs text-zinc-500 hover:text-zinc-300 px-1"
        >
          X
        </button>
      </div>
    );
  }

  return (
    <select
      value={value}
      onChange={(e) => {
        const v = e.target.value;
        if (v === "__custom__") {
          setCustomMode(true);
          return;
        }
        if (v === "__none__") {
          onChange(null);
          return;
        }
        if (v === "") return; // placeholder
        onChange(v);
      }}
      disabled={disabled}
      className={className}
    >
      <option value="">{placeholder ?? (value ? value : "\u2014")}</option>
      <option value="__none__">-- Remove ICP --</option>
      {options.map((opt) => (
        <option key={opt} value={opt}>{opt}</option>
      ))}
      <option value="__custom__">+ Custom ICP...</option>
    </select>
  );
}
