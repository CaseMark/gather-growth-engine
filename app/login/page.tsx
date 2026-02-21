"use client";

import Link from "next/link";
import { signIn, useSession } from "next-auth/react";
import { Suspense, useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { APP_DISPLAY_NAME } from "@/lib/app-config";

/** Only allow internal paths. Reject /login to avoid redirect loops. */
function sanitizeCallbackUrl(callbackUrl: string | null): string {
  if (!callbackUrl || typeof callbackUrl !== "string") return "/onboarding";
  try {
    const path = new URL(callbackUrl, "https://x").pathname;
    if (path === "/login" || path.startsWith("/login?")) return "/onboarding";
    if (path === "/signup" || path.startsWith("/signup")) return "/onboarding";
    if (["/", "/onboarding", "/dashboard", "/verify-email-pending", "/admin"].some((p) => p === path || path.startsWith(p + "/"))) {
      return path;
    }
  } catch {
    // ignore invalid URLs
  }
  return "/onboarding";
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl");
  const redirectTo = sanitizeCallbackUrl(callbackUrl);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleEnabled, setGoogleEnabled] = useState(false);
  const { data: session, status } = useSession();

  // If already signed in, leave immediately so we don't get stuck on this screen
  useEffect(() => {
    if (status === "authenticated" && session?.user) {
      router.replace(redirectTo);
      router.refresh();
    }
  }, [status, session?.user, redirectTo, router]);

  useEffect(() => {
    fetch("/api/auth/providers")
      .then((res) => res.json())
      .then((data) => setGoogleEnabled(Boolean(data?.google)))
      .catch(() => {});
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError("Invalid email or password");
        setLoading(false);
      } else {
        router.replace(redirectTo);
        router.refresh();
      }
    } catch (err) {
      setError("Something went wrong. Please try again.");
      setLoading(false);
    }
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
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {error && (
            <div className="rounded-md bg-red-900/20 border border-red-800 px-4 py-3 text-sm text-red-300">
              {error}
            </div>
          )}
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
            disabled={loading}
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
