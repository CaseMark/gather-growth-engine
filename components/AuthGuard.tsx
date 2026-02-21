"use client";

import { useSession } from "next-auth/react";
import { useRouter, usePathname } from "next/navigation";
import { useEffect, useState } from "react";

type AuthGuardProps = {
  children: React.ReactNode;
};

/**
 * Runs in the app (Node runtime), not in Edge/middleware.
 * Calls /api/auth/check-verification and redirects if email not verified
 * or if user should go to onboarding first.
 */
export function AuthGuard({ children }: AuthGuardProps) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const [checkDone, setCheckDone] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
      return;
    }
    if (status !== "authenticated" || !session?.user?.id) {
      return;
    }

    fetch("/api/auth/check-verification")
      .then((res) => res.json())
      .then(({ verified, hasWorkspace }) => {
        setCheckDone(true);

        const onVerifyPending = pathname?.startsWith("/verify-email-pending");
        const onOnboarding = pathname?.startsWith("/onboarding");
        const onDashboard = pathname?.startsWith("/dashboard");

        // Not verified -> must see "check your email" page
        if (!verified && !onVerifyPending) {
          router.replace("/verify-email-pending");
          return;
        }

        // Verified but on verify-email-pending -> send to onboarding
        if (verified && onVerifyPending) {
          router.replace("/onboarding");
          return;
        }

        // Verified, on dashboard, but no workspace -> send to onboarding
        if (verified && onDashboard && !hasWorkspace) {
          router.replace("/onboarding");
        }
      })
      .catch(() => setCheckDone(true));
  }, [status, session?.user?.id, pathname, router]);

  // Show nothing until we've done the check
  if (status === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-zinc-400">Loading...</p>
      </div>
    );
  }
  if (status === "authenticated" && !checkDone) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-zinc-400">Loading...</p>
      </div>
    );
  }

  return <>{children}</>;
}
