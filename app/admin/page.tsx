"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { APP_DISPLAY_NAME } from "@/lib/app-config";

type Analytics = {
  totalUsers: number;
  signupsLast7Days: number;
  signupsLast30Days: number;
  totalCampaigns: number;
  totalLeads: number;
  workspacesWithDomain: number;
  recentUsers: Array<{ email: string; name: string | null; createdAt: string }>;
  recentCampaigns: Array<{
    name: string;
    variant: string | null;
    abGroupId: string | null;
    userEmail: string | null;
    domain: string | null;
    createdAt: string;
  }>;
};

export default function AdminPage() {
  const { data: session, status } = useSession();
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [forbidden, setForbidden] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") {
      setLoading(false);
      return;
    }
    if (status !== "authenticated") return;

    fetch("/api/admin/analytics")
      .then((res) => {
        if (res.status === 403) {
          setForbidden(true);
          return null;
        }
        return res.json();
      })
      .then((data) => {
        if (data && !data.error) setAnalytics(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [status]);

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-950">
        <p className="text-zinc-400">Loading...</p>
      </div>
    );
  }

  if (status === "unauthenticated") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-zinc-950 px-4">
        <p className="text-zinc-400 mb-4">You must be logged in to view this page.</p>
        <Link href="/login" className="text-emerald-500 hover:text-emerald-400">
          Log in
        </Link>
      </div>
    );
  }

  if (forbidden) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-zinc-950 px-4">
        <p className="text-zinc-400 mb-4">Access denied. Only admins can view analytics.</p>
        <Link href="/dashboard" className="text-emerald-500 hover:text-emerald-400">
          Back to Dashboard
        </Link>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-950">
        <p className="text-zinc-400">Failed to load analytics.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <header className="border-b border-zinc-800 px-6 py-4">
        <div className="max-w-5xl flex items-center justify-between">
          <Link href="/dashboard" className="text-lg font-semibold text-zinc-100">
            {APP_DISPLAY_NAME}
          </Link>
          <span className="text-sm text-zinc-500">Admin · Analytics</span>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8">
        <h1 className="text-2xl font-semibold text-zinc-100 mb-2">Analytics</h1>
        <p className="text-sm text-zinc-500 mb-8">
          Users, signups, and campaign activity across the product.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/80 p-5">
            <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">
              Total users
            </p>
            <p className="mt-2 text-2xl font-semibold text-zinc-100 tabular-nums">
              {analytics.totalUsers}
            </p>
          </div>
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/80 p-5">
            <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">
              Signups (7 days)
            </p>
            <p className="mt-2 text-2xl font-semibold text-zinc-100 tabular-nums">
              {analytics.signupsLast7Days}
            </p>
          </div>
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/80 p-5">
            <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">
              Signups (30 days)
            </p>
            <p className="mt-2 text-2xl font-semibold text-zinc-100 tabular-nums">
              {analytics.signupsLast30Days}
            </p>
          </div>
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/80 p-5">
            <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">
              Campaigns sent
            </p>
            <p className="mt-2 text-2xl font-semibold text-zinc-100 tabular-nums">
              {analytics.totalCampaigns}
            </p>
          </div>
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/80 p-5">
            <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">
              Total leads
            </p>
            <p className="mt-2 text-2xl font-semibold text-zinc-100 tabular-nums">
              {analytics.totalLeads}
            </p>
          </div>
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/80 p-5">
            <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">
              Workspaces with domain
            </p>
            <p className="mt-2 text-2xl font-semibold text-zinc-100 tabular-nums">
              {analytics.workspacesWithDomain}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/80 p-5">
            <h2 className="text-sm font-medium text-zinc-300 mb-4">Recent signups</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-zinc-700 text-left text-zinc-500">
                    <th className="pb-2 pr-3">Email</th>
                    <th className="pb-2 pr-3">Name</th>
                    <th className="pb-2">Signed up</th>
                  </tr>
                </thead>
                <tbody>
                  {analytics.recentUsers.map((u) => (
                    <tr key={u.email} className="border-b border-zinc-800">
                      <td className="py-2 pr-3 text-zinc-200">{u.email}</td>
                      <td className="py-2 pr-3 text-zinc-400">{u.name ?? "—"}</td>
                      <td className="py-2 text-zinc-500">
                        {new Date(u.createdAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/80 p-5">
            <h2 className="text-sm font-medium text-zinc-300 mb-4">Recent campaigns</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-zinc-700 text-left text-zinc-500">
                    <th className="pb-2 pr-3">Campaign</th>
                    <th className="pb-2 pr-3">User / domain</th>
                    <th className="pb-2">Sent</th>
                  </tr>
                </thead>
                <tbody>
                  {analytics.recentCampaigns.map((c, i) => (
                    <tr key={`${c.createdAt}-${i}`} className="border-b border-zinc-800">
                      <td className="py-2 pr-3 text-zinc-200">
                        {c.name}
                        {c.variant ? (
                          <span className="ml-1 text-zinc-500">({c.variant})</span>
                        ) : null}
                      </td>
                      <td className="py-2 pr-3 text-zinc-400">
                        {c.userEmail ?? "—"}
                        {c.domain ? ` · ${c.domain}` : ""}
                      </td>
                      <td className="py-2 text-zinc-500">
                        {new Date(c.createdAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <p className="mt-8 text-sm text-zinc-500">
          <Link href="/dashboard" className="text-emerald-500 hover:text-emerald-400">
            Back to Dashboard
          </Link>
        </p>
      </main>
    </div>
  );
}
