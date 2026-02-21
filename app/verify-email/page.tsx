"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useEffect, useState, Suspense } from "react";
import Link from "next/link";

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    const token = searchParams.get("token");

    if (!token) {
      setStatus("error");
      setMessage("No verification token provided");
      return;
    }

    // Verify email
    fetch(`/api/verify-email?token=${token}`)
      .then(async (res) => {
        const data = await res.json();
        return { res, data };
      })
      .then(({ res, data }) => {
        if (res.ok) {
          setStatus("success");
          setMessage(data.message || "Email verified successfully!");
          // Redirect to onboarding after 2 seconds
          setTimeout(() => {
            router.push("/onboarding");
          }, 2000);
        } else {
          setStatus("error");
          setMessage(data.error || "Verification failed");
        }
      })
      .catch((error) => {
        setStatus("error");
        setMessage("Something went wrong. Please try again.");
      });
  }, [searchParams, router]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-6">
      <div className="w-full max-w-md space-y-6 text-center">
        <Link href="/" className="text-lg font-semibold text-zinc-100">
          Outbound Growth Engine
        </Link>

        {status === "loading" && (
          <>
            <div className="mt-8">
              <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-zinc-700 border-t-emerald-500"></div>
            </div>
            <p className="mt-4 text-zinc-400">Verifying your email...</p>
          </>
        )}

        {status === "success" && (
          <>
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
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
            </div>
            <h1 className="mt-4 text-2xl font-semibold">Email Verified!</h1>
            <p className="mt-2 text-zinc-400">{message}</p>
            <p className="mt-2 text-sm text-zinc-500">
              Redirecting to onboarding...
            </p>
          </>
        )}

        {status === "error" && (
          <>
            <div className="mt-8">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-900/20">
                <svg
                  className="h-6 w-6 text-red-500"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </div>
            </div>
            <h1 className="mt-4 text-2xl font-semibold">Verification Failed</h1>
            <p className="mt-2 text-zinc-400">{message}</p>
            <div className="mt-6 space-y-3">
              <Link
                href="/login"
                className="inline-block rounded-md bg-emerald-600 px-4 py-2 font-medium text-white hover:bg-emerald-500"
              >
                Go to Login
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen flex-col items-center justify-center px-6">
        <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-zinc-700 border-t-emerald-500" />
        <p className="mt-4 text-zinc-400">Loading...</p>
      </div>
    }>
      <VerifyEmailContent />
    </Suspense>
  );
}
