/**
 * @jest-environment node
 */
import { sanitizeCallbackUrl } from "@/lib/callback-url";

describe("sanitizeCallbackUrl", () => {
  it("returns /dashboard when callbackUrl is null", () => {
    expect(sanitizeCallbackUrl(null)).toBe("/dashboard");
  });

  it("returns /dashboard when callbackUrl is undefined", () => {
    expect(sanitizeCallbackUrl(undefined as unknown as string | null)).toBe("/dashboard");
  });

  it("returns /dashboard when callbackUrl is empty string", () => {
    expect(sanitizeCallbackUrl("")).toBe("/dashboard");
  });

  it("returns /dashboard when callbackUrl is not a string", () => {
    expect(sanitizeCallbackUrl(123 as unknown as string | null)).toBe("/dashboard");
  });

  it("returns /dashboard for /login to avoid redirect loop", () => {
    expect(sanitizeCallbackUrl("/login")).toBe("/dashboard");
    expect(sanitizeCallbackUrl("https://gather-growth-engine.vercel.app/login")).toBe("/dashboard");
    expect(sanitizeCallbackUrl("https://x/login")).toBe("/dashboard");
  });

  it("returns /dashboard for /login with query (nested callbackUrl loop)", () => {
    const nested =
      "https://gather-growth-engine.vercel.app/login?callbackUrl=https%3A%2F%2Fgather-growth-engine.vercel.app%2Fsignup";
    expect(sanitizeCallbackUrl(nested)).toBe("/dashboard");
    expect(sanitizeCallbackUrl("https://x/login?callbackUrl=/onboarding")).toBe("/dashboard");
  });

  it("returns /dashboard for /signup so we do not redirect back to signup after login", () => {
    expect(sanitizeCallbackUrl("/signup")).toBe("/dashboard");
    expect(sanitizeCallbackUrl("https://x/signup")).toBe("/dashboard");
  });

  it("redirects /onboarding to /dashboard to avoid stuck login loop", () => {
    expect(sanitizeCallbackUrl("/onboarding")).toBe("/dashboard");
    expect(sanitizeCallbackUrl("https://gather-growth-engine.vercel.app/login?callbackUrl=%2Fonboarding")).toBe("/dashboard");
  });

  it("allows / and returns it", () => {
    expect(sanitizeCallbackUrl("/")).toBe("/");
    expect(sanitizeCallbackUrl("https://x/")).toBe("/");
  });

  it("allows /dashboard and subpaths", () => {
    expect(sanitizeCallbackUrl("/dashboard")).toBe("/dashboard");
    expect(sanitizeCallbackUrl("/dashboard/foo")).toBe("/dashboard/foo");
    expect(sanitizeCallbackUrl("https://x/dashboard")).toBe("/dashboard");
  });

  it("allows /verify-email-pending", () => {
    expect(sanitizeCallbackUrl("/verify-email-pending")).toBe("/verify-email-pending");
  });

  it("allows /admin and subpaths", () => {
    expect(sanitizeCallbackUrl("/admin")).toBe("/admin");
    expect(sanitizeCallbackUrl("/admin/analytics")).toBe("/admin/analytics");
  });

  it("returns /dashboard for unknown or external paths", () => {
    expect(sanitizeCallbackUrl("/other")).toBe("/dashboard");
    expect(sanitizeCallbackUrl("/api/auth/session")).toBe("/dashboard");
    expect(sanitizeCallbackUrl("https://evil.com/onboarding")).toBe("/dashboard");
  });

  it("handles invalid URL strings gracefully", () => {
    expect(sanitizeCallbackUrl("not-a-url")).toBe("/dashboard");
    expect(sanitizeCallbackUrl("://")).toBe("/dashboard");
  });
});
