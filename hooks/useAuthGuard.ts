"use client";

import { useSession } from "next-auth/react";
import { useRouter, usePathname } from "next/navigation";
import { useEffect, useState } from "react";

/**
 * Call this at the top of protected pages. It redirects if:
 * - not logged in -> /login
 * - email not verified -> /verify-email-pending
 * - verified but on verify-email-pending -> /onboarding
 * - verified, on dashboard, no workspace -> /onboarding
 * Returns { ready } - when true, it's safe to render the page.
 */
export function useAuthGuard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const [ready, setReady] = useState(false);

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
        setReady(true);

        const onVerifyPending = pathname?.startsWith("/verify-email-pending");
        const onOnboarding = pathname?.startsWith("/onboarding");
        const onDashboard = pathname?.startsWith("/dashboard");

        if (!verified && !onVerifyPending) {
          router.replace("/verify-email-pending");
          return;
        }
        if (verified && onVerifyPending) {
          router.replace("/onboarding");
          return;
        }
        if (verified && onDashboard && !hasWorkspace) {
          router.replace("/onboarding");
        }
      })
      .catch(() => setReady(true));
  }, [status, session?.user?.id, pathname, router]);

  return {
    ready: status === "authenticated" && ready,
    loading: status === "loading" || (status === "authenticated" && !ready),
    session,
  };
}
