"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuthGuard } from "@/hooks/useAuthGuard";

export default function VerifyEmailPendingPage() {
  const { ready, loading: guardLoading, session } = useAuthGuard();
  const router = useRouter();
  const [userEmail, setUserEmail] = useState("");

  useEffect(() => {
    if (session?.user?.email) {
      setUserEmail(session.user.email);
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

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-6">
      <div className="w-full max-w-md space-y-6 text-center">
        <Link href="/" className="text-lg font-semibold text-zinc-100">
          Outbound Growth Engine
        </Link>

        <div className="mt-8">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-900/20">
            <svg
              className="h-6 w-6 text-emerald-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
              />
            </svg>
          </div>
        </div>

        <h1 className="mt-4 text-2xl font-semibold">Check Your Email</h1>
        <p className="mt-2 text-zinc-400">
          We've sent a verification email to <strong className="text-zinc-200">{userEmail}</strong>
        </p>
        <p className="mt-2 text-sm text-zinc-500">
          Click the link in the email to verify your account and continue to onboarding.
        </p>

        <div className="mt-8 rounded-lg border border-zinc-800 bg-zinc-900/50 p-4 text-left">
          <p className="text-sm text-zinc-400">
            <strong className="text-zinc-300">Running locally?</strong> The verification link is printed in the <strong>same terminal where you ran <code className="rounded bg-zinc-800 px-1">npm run dev</code></strong>. Right after you signed up, a block of text appeared there. Look for the line that says <strong>&quot;COPY THIS LINK INTO YOUR BROWSER&quot;</strong> and copy the URL on the next line (starts with http://localhost:3000/verify-email?token=...) into your browser address bar.
          </p>
        </div>

        <div className="mt-6 space-y-3">
          <button
            onClick={() => router.refresh()}
            className="w-full rounded-md border border-zinc-700 px-4 py-2 font-medium text-zinc-300 hover:border-zinc-600 hover:text-zinc-100"
          >
            I've verified my email
          </button>
          <Link
            href="/login"
            className="block text-sm text-zinc-400 hover:text-zinc-300"
          >
            Back to login
          </Link>
        </div>
      </div>
    </div>
  );
}
