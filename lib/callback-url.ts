/**
 * Sanitize NextAuth callbackUrl for redirects. Only allow internal app paths;
 * reject /login and /signup to avoid redirect loops.
 * Post-login we send users to /dashboard by default; /onboarding is treated as /dashboard
 * so middleware never sends us into a login -> onboarding -> login loop.
 */
export function sanitizeCallbackUrl(callbackUrl: string | null): string {
  if (!callbackUrl || typeof callbackUrl !== "string") return "/dashboard";
  try {
    const path = new URL(callbackUrl, "https://x").pathname;
    if (path === "/login" || path.startsWith("/login")) return "/dashboard";
    if (path === "/signup" || path.startsWith("/signup")) return "/dashboard";
    // Send /onboarding callback to dashboard to avoid stuck loop (dashboard will redirect to onboarding if needed)
    if (path === "/onboarding" || path.startsWith("/onboarding")) return "/dashboard";
    if (["/", "/dashboard", "/verify-email-pending", "/admin"].some((p) => p === path || path.startsWith(p + "/"))) {
      return path;
    }
  } catch {
    // ignore invalid URLs
  }
  return "/dashboard";
}
