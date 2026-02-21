/**
 * Sanitize NextAuth callbackUrl for redirects. Only allow internal app paths;
 * reject /login and /signup to avoid redirect loops.
 */
export function sanitizeCallbackUrl(callbackUrl: string | null): string {
  if (!callbackUrl || typeof callbackUrl !== "string") return "/onboarding";
  try {
    const path = new URL(callbackUrl, "https://x").pathname;
    if (path === "/login" || path.startsWith("/login")) return "/onboarding";
    if (path === "/signup" || path.startsWith("/signup")) return "/onboarding";
    if (["/", "/onboarding", "/dashboard", "/verify-email-pending", "/admin"].some((p) => p === path || path.startsWith(p + "/"))) {
      return path;
    }
  } catch {
    // ignore invalid URLs
  }
  return "/onboarding";
}
