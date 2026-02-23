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
  usersVerified?: number;
  usersWithAnthropicKey?: number;
  usersWithInstantlyKey?: number;
  usersWhoCreatedCampaign?: number;
  usersWhoSentCampaign?: number;
  recentUsers: Array<{ id: string; email: string; name: string | null; createdAt: string; emailVerified: boolean }>;
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
  const [verifyingEmail, setVerifyingEmail] = useState<string | null>(null);

  const refetchAnalytics = () => {
    fetch("/api/admin/analytics")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data && !data.error) setAnalytics(data);
      })
      .catch(() => {});
  };

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

  const handleVerifyUserEmail = async (email: string) => {
    setVerifyingEmail(email);
    try {
      const res = await fetch("/api/admin/verify-user-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (res.ok) refetchAnalytics();
      else alert(data.error ?? "Failed to verify");
    } catch {
      alert("Failed to verify");
    } finally {
      setVerifyingEmail(null);
    }
  };

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

        <section className="mb-8">
          <h2 className="text-lg font-medium text-zinc-200 mb-2">User journey · where they get stuck</h2>
          <p className="text-sm text-zinc-500 mb-4">
            Funnel from signup to first send. Gaps show where users drop off.
          </p>
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/80 p-5 overflow-x-auto">
            <table className="w-full min-w-[420px] text-sm">
              <thead>
                <tr className="border-b border-zinc-700 text-left text-zinc-500">
                  <th className="pb-3 pr-4">Step</th>
                  <th className="pb-3 pr-4 text-right">Count</th>
                  <th className="pb-3 pr-4 text-right">% of previous</th>
                  <th className="pb-3 text-zinc-500">Stuck (didn’t reach this step)</th>
                </tr>
              </thead>
              <tbody className="text-zinc-300">
                <tr className="border-b border-zinc-800">
                  <td className="py-2.5 pr-4 font-medium text-zinc-200">1. Signed up</td>
                  <td className="py-2.5 pr-4 text-right tabular-nums">{analytics.totalUsers}</td>
                  <td className="py-2.5 pr-4 text-right tabular-nums">—</td>
                  <td className="py-2.5 text-zinc-500">—</td>
                </tr>
                <tr className="border-b border-zinc-800">
                  <td className="py-2.5 pr-4 font-medium text-zinc-200">2. Verified email</td>
                  <td className="py-2.5 pr-4 text-right tabular-nums">{analytics.usersVerified ?? 0}</td>
                  <td className="py-2.5 pr-4 text-right tabular-nums">
                    {analytics.totalUsers ? Math.round(((analytics.usersVerified ?? 0) / analytics.totalUsers) * 100) : 0}%
                  </td>
                  <td className="py-2.5 text-zinc-500">
                    {Math.max(0, analytics.totalUsers - (analytics.usersVerified ?? 0))} not verified
                  </td>
                </tr>
                <tr className="border-b border-zinc-800">
                  <td className="py-2.5 pr-4 font-medium text-zinc-200">3. Completed onboarding (domain)</td>
                  <td className="py-2.5 pr-4 text-right tabular-nums">{analytics.workspacesWithDomain}</td>
                  <td className="py-2.5 pr-4 text-right tabular-nums">
                    {(analytics.usersVerified ?? 0) ? Math.round((analytics.workspacesWithDomain / (analytics.usersVerified ?? 0)) * 100) : 0}%
                  </td>
                  <td className="py-2.5 text-zinc-500">
                    {Math.max(0, (analytics.usersVerified ?? 0) - analytics.workspacesWithDomain)} verified but no domain
                  </td>
                </tr>
                <tr className="border-b border-zinc-800">
                  <td className="py-2.5 pr-4 font-medium text-zinc-200">4. Added Anthropic key</td>
                  <td className="py-2.5 pr-4 text-right tabular-nums">{analytics.usersWithAnthropicKey ?? 0}</td>
                  <td className="py-2.5 pr-4 text-right tabular-nums">
                    {analytics.workspacesWithDomain ? Math.round(((analytics.usersWithAnthropicKey ?? 0) / analytics.workspacesWithDomain) * 100) : 0}%
                  </td>
                  <td className="py-2.5 text-zinc-500">optional</td>
                </tr>
                <tr className="border-b border-zinc-800">
                  <td className="py-2.5 pr-4 font-medium text-zinc-200">5. Added Instantly key</td>
                  <td className="py-2.5 pr-4 text-right tabular-nums">{analytics.usersWithInstantlyKey ?? 0}</td>
                  <td className="py-2.5 pr-4 text-right tabular-nums">
                    {analytics.workspacesWithDomain ? Math.round(((analytics.usersWithInstantlyKey ?? 0) / analytics.workspacesWithDomain) * 100) : 0}%
                  </td>
                  <td className="py-2.5 text-zinc-500">
                    {Math.max(0, analytics.workspacesWithDomain - (analytics.usersWithInstantlyKey ?? 0))} have domain but no Instantly key
                  </td>
                </tr>
                <tr className="border-b border-zinc-800">
                  <td className="py-2.5 pr-4 font-medium text-zinc-200">6. Created a campaign</td>
                  <td className="py-2.5 pr-4 text-right tabular-nums">{analytics.usersWhoCreatedCampaign ?? 0}</td>
                  <td className="py-2.5 pr-4 text-right tabular-nums">
                    {analytics.workspacesWithDomain ? Math.round(((analytics.usersWhoCreatedCampaign ?? 0) / analytics.workspacesWithDomain) * 100) : 0}%
                  </td>
                  <td className="py-2.5 text-zinc-500">
                    {Math.max(0, analytics.workspacesWithDomain - (analytics.usersWhoCreatedCampaign ?? 0))} onboarded but never started a campaign
                  </td>
                </tr>
                <tr>
                  <td className="py-2.5 pr-4 font-medium text-zinc-200">7. Sent a campaign</td>
                  <td className="py-2.5 pr-4 text-right tabular-nums">{analytics.usersWhoSentCampaign ?? 0}</td>
                  <td className="py-2.5 pr-4 text-right tabular-nums">
                    {analytics.workspacesWithDomain ? Math.round(((analytics.usersWhoSentCampaign ?? 0) / analytics.workspacesWithDomain) * 100) : 0}%
                  </td>
                  <td className="py-2.5 text-zinc-500">
                    {Math.max(0, (analytics.usersWhoCreatedCampaign ?? 0) - (analytics.usersWhoSentCampaign ?? 0))} created campaign but never sent
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/80 p-5">
            <h2 className="text-sm font-medium text-zinc-300 mb-4">Recent signups</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-zinc-700 text-left text-zinc-500">
                    <th className="pb-2 pr-3">Email</th>
                    <th className="pb-2 pr-3">Name</th>
                    <th className="pb-2 pr-3">Signed up</th>
                    <th className="pb-2 pr-3">Verified</th>
                    <th className="pb-2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {analytics.recentUsers.map((u) => (
                    <tr key={u.id} className="border-b border-zinc-800">
                      <td className="py-2 pr-3 text-zinc-200">{u.email}</td>
                      <td className="py-2 pr-3 text-zinc-400">{u.name ?? "—"}</td>
                      <td className="py-2 pr-3 text-zinc-500">
                        {new Date(u.createdAt).toLocaleDateString()}
                      </td>
                      <td className="py-2 pr-3 text-zinc-500">
                        {u.emailVerified ? "Yes" : "No"}
                      </td>
                      <td className="py-2">
                        {u.emailVerified ? (
                          <span className="text-zinc-600 text-xs">—</span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleVerifyUserEmail(u.email)}
                            disabled={verifyingEmail === u.email}
                            className="rounded border border-zinc-600 bg-zinc-800 px-2 py-1 text-xs text-zinc-300 hover:bg-zinc-700 disabled:opacity-50"
                          >
                            {verifyingEmail === u.email ? "Verifying..." : "Verify email"}
                          </button>
                        )}
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
