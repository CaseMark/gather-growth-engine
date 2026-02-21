"use client";

import Link from "next/link";
import { signIn, useSession, getCsrfToken } from "next-auth/react";
import { Suspense, useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { APP_DISPLAY_NAME } from "@/lib/app-config";
import { sanitizeCallbackUrl } from "@/lib/callback-url";

function LoginForm() {
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl");
  const redirectTo = sanitizeCallbackUrl(callbackUrl);
  const errorParam = searchParams.get("error");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [csrfToken, setCsrfToken] = useState<string | null>(null);
  const [fullCallbackUrl, setFullCallbackUrl] = useState("");
  const [googleEnabled, setGoogleEnabled] = useState(false);
  const { data: session, status } = useSession();

  useEffect(() => {
    if (typeof window !== "undefined") setFullCallbackUrl(window.location.origin + redirectTo);
  }, [redirectTo]);

  // Show NextAuth error from URL (e.g. after form POST and credentials fail)
  useEffect(() => {
    if (errorParam === "CredentialsSignin" || errorParam === "Callback" || errorParam === "CallbackRouteError") {
      setError("Invalid email or password");
      setLoading(false);
    }
  }, [errorParam]);

  // If already signed in, leave immediately
  useEffect(() => {
    if (status === "authenticated" && session?.user) {
      const fullUrl = typeof window !== "undefined" ? window.location.origin + redirectTo : redirectTo;
      window.location.replace(fullUrl);
      return;
    }
  }, [status, session?.user, redirectTo]);

  useEffect(() => {
    getCsrfToken().then((token) => setCsrfToken(token ?? null));
  }, []);

  useEffect(() => {
    fetch("/api/auth/providers")
      .then((res) => res.json())
      .then((data) => setGoogleEnabled(Boolean(data?.google)))
      .catch(() => {});
  }, []);

  // Native form POST so the browser does a full-page request; server sets cookie and 302 redirects.
  const handleSubmit = (e: React.FormEvent) => {
    setError("");
    if (!csrfToken || !fullCallbackUrl) {
      e.preventDefault();
      setError("Loading... try again in a moment.");
      return;
    }
    setLoading(true);
    // Let the form submit naturally — no preventDefault
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-6">
      <div className="w-full max-w-sm space-y-8">
        <div className="text-center">
          <Link href="/" className="text-lg font-semibold text-zinc-100">
            {APP_DISPLAY_NAME}
          </Link>
          <h2 className="mt-6 text-2xl font-semibold">Log in</h2>
        </div>
        <form
          className="mt-8 space-y-6"
          method="POST"
          action="/api/auth/callback/credentials"
          onSubmit={handleSubmit}
        >
          {error && (
            <div className="rounded-md bg-red-900/20 border border-red-800 px-4 py-3 text-sm text-red-300">
              {error}
            </div>
          )}
          {csrfToken && (
            <input type="hidden" name="csrfToken" value={csrfToken} />
          )}
          {fullCallbackUrl && <input type="hidden" name="callbackUrl" value={fullCallbackUrl} />}
          <div>
            <label htmlFor="email" className="sr-only">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              placeholder="you@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-md border border-zinc-700 bg-zinc-900 px-4 py-3 text-zinc-100 placeholder-zinc-500 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>
          <div>
            <label htmlFor="password" className="sr-only">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-md border border-zinc-700 bg-zinc-900 px-4 py-3 text-zinc-100 placeholder-zinc-500 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>
          <button
            type="submit"
            disabled={loading || !csrfToken || !fullCallbackUrl}
            className="w-full rounded-md bg-emerald-600 py-3 font-medium text-white hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Logging in..." : "Log in"}
          </button>
          {googleEnabled && (
            <>
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-zinc-700" />
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="bg-zinc-950 px-2 text-zinc-500">or</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => signIn("google", { callbackUrl: redirectTo })}
                className="w-full rounded-md border border-zinc-600 bg-zinc-800 py-3 font-medium text-zinc-200 hover:bg-zinc-700"
              >
                Continue with Google
              </button>
            </>
          )}
        </form>
        <p className="text-center text-sm text-zinc-400">
          No account?{" "}
          <Link href="/signup" className="font-medium text-emerald-500 hover:text-emerald-400">
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen flex-col items-center justify-center px-6">
          <p className="text-zinc-400">Loading...</p>
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
