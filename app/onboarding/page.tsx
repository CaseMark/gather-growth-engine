"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { useAuthGuard } from "@/hooks/useAuthGuard";
import { APP_DISPLAY_NAME } from "@/lib/app-config";

export default function OnboardingPage() {
  const { ready, loading: guardLoading, session } = useAuthGuard();
  const router = useRouter();
  const [domain, setDomain] = useState("");
  const [anthropicKey, setAnthropicKey] = useState("");
  const [instantlyKey, setInstantlyKey] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [existingData, setExistingData] = useState<any>(null);

  useEffect(() => {
    if (session?.user?.id) {
      fetch("/api/onboarding")
        .then((res) => res.json())
        .then((data) => {
          if (data.workspace) {
            setExistingData(data.workspace);
            setDomain(data.workspace.domain || "");
          }
        })
        .catch(console.error);
    }
  }, [session]);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          domain,
          anthropicKey,
          instantlyKey,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Something went wrong");
        setLoading(false);
        return;
      }

      router.push("/dashboard");
      router.refresh();
    } catch (err) {
      setError("Something went wrong. Please try again.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen">
      <header className="border-b border-zinc-800 px-6 py-4">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <Link href="/dashboard" className="text-lg font-semibold">
            {APP_DISPLAY_NAME}
          </Link>
          <Link href="/dashboard" className="text-zinc-400 hover:text-zinc-100">
            &lt;- Dashboard
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-6 py-12">
        <h1 className="text-2xl font-semibold">Settings</h1>
        <p className="mt-2 text-zinc-400">
          Enter your domain and API keys. We'll crawl your home page and use
          these to run the engine.
        </p>

        {existingData && (
          <div className="mt-4 rounded-md bg-emerald-900/20 border border-emerald-800 px-4 py-3 text-sm text-emerald-300">
            You already have onboarding data saved. Update it below or continue to dashboard.
          </div>
        )}

        <form className="mt-10 space-y-8" onSubmit={handleSubmit}>
          {error && (
            <div className="rounded-md bg-red-900/20 border border-red-800 px-4 py-3 text-sm text-red-300">
              {error}
            </div>
          )}

          <div>
            <label htmlFor="domain" className="block text-sm font-medium text-zinc-300">
              Your domain
            </label>
            <input
              id="domain"
              name="domain"
              type="text"
              required
              placeholder="acme.com"
              value={domain}
              onChange={(e) => setDomain(e.target.value)}
              className="mt-2 w-full rounded-md border border-zinc-700 bg-zinc-900 px-4 py-3 text-zinc-100 placeholder-zinc-500 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
            <p className="mt-1 text-xs text-zinc-500">
              We'll crawl the home page of this domain to understand your product.
            </p>
          </div>

          <div className="space-y-4">
            <h2 className="text-sm font-medium text-zinc-300">API keys</h2>
            <p className="text-xs text-zinc-500">
              These keys are encrypted and stored securely. They'll be used only for your account's operations.
            </p>
            <div>
              <label htmlFor="anthropic_key" className="block text-sm text-zinc-400">
                Anthropic API key
              </label>
              <input
                id="anthropic_key"
                name="anthropic_key"
                type="password"
                required
                placeholder="sk-ant-..."
                value={anthropicKey}
                onChange={(e) => setAnthropicKey(e.target.value)}
                className="mt-1 w-full rounded-md border border-zinc-700 bg-zinc-900 px-4 py-3 text-zinc-100 placeholder-zinc-500 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label htmlFor="instantly_key" className="block text-sm text-zinc-400">
                Instantly API key
              </label>
              <input
                id="instantly_key"
                name="instantly_key"
                type="password"
                required
                placeholder="Instantly API key"
                value={instantlyKey}
                onChange={(e) => setInstantlyKey(e.target.value)}
                className="mt-1 w-full rounded-md border border-zinc-700 bg-zinc-900 px-4 py-3 text-zinc-100 placeholder-zinc-500 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-md bg-emerald-600 py-3 font-medium text-white hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Saving..." : existingData ? "Update and continue" : "Save and continue"}
          </button>
        </form>
      </main>
    </div>
  );
}
