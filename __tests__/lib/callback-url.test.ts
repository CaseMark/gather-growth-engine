/**
 * @jest-environment node
 */
import { sanitizeCallbackUrl } from "@/lib/callback-url";

describe("sanitizeCallbackUrl", () => {
  it("returns /onboarding when callbackUrl is null", () => {
    expect(sanitizeCallbackUrl(null)).toBe("/onboarding");
  });

  it("returns /onboarding when callbackUrl is undefined", () => {
    expect(sanitizeCallbackUrl(undefined as unknown as string | null)).toBe("/onboarding");
  });

  it("returns /onboarding when callbackUrl is empty string", () => {
    expect(sanitizeCallbackUrl("")).toBe("/onboarding");
  });

  it("returns /onboarding when callbackUrl is not a string", () => {
    expect(sanitizeCallbackUrl(123 as unknown as string | null)).toBe("/onboarding");
  });

  it("returns /onboarding for /login to avoid redirect loop", () => {
    expect(sanitizeCallbackUrl("/login")).toBe("/onboarding");
    expect(sanitizeCallbackUrl("https://gather-growth-engine.vercel.app/login")).toBe("/onboarding");
    expect(sanitizeCallbackUrl("https://x/login")).toBe("/onboarding");
  });

  it("returns /onboarding for /login with query (nested callbackUrl loop)", () => {
    const nested =
      "https://gather-growth-engine.vercel.app/login?callbackUrl=https%3A%2F%2Fgather-growth-engine.vercel.app%2Fsignup";
    expect(sanitizeCallbackUrl(nested)).toBe("/onboarding");
    expect(sanitizeCallbackUrl("https://x/login?callbackUrl=/onboarding")).toBe("/onboarding");
  });

  it("returns /onboarding for /signup so we do not redirect back to signup after login", () => {
    expect(sanitizeCallbackUrl("/signup")).toBe("/onboarding");
    expect(sanitizeCallbackUrl("https://x/signup")).toBe("/onboarding");
  });

  it("allows / and returns it", () => {
    expect(sanitizeCallbackUrl("/")).toBe("/");
    expect(sanitizeCallbackUrl("https://x/")).toBe("/");
  });

  it("allows /onboarding", () => {
    expect(sanitizeCallbackUrl("/onboarding")).toBe("/onboarding");
    expect(sanitizeCallbackUrl("https://gather-growth-engine.vercel.app/onboarding")).toBe("/onboarding");
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

  it("returns /onboarding for unknown or external paths", () => {
    expect(sanitizeCallbackUrl("/other")).toBe("/onboarding");
    expect(sanitizeCallbackUrl("/api/auth/session")).toBe("/onboarding");
    expect(sanitizeCallbackUrl("https://evil.com/onboarding")).toBe("/onboarding"); // we only use pathname with base https://x
  });

  it("handles invalid URL strings gracefully", () => {
    expect(sanitizeCallbackUrl("not-a-url")).toBe("/onboarding");
    expect(sanitizeCallbackUrl("://")).toBe("/onboarding");
  });
});
