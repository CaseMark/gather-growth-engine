import { withAuth } from "next-auth/middleware";

// Don't use Prisma here - it doesn't run in Edge Runtime.
// Email verification and onboarding redirects are handled in the app (see AuthGuard).
export default withAuth({
  pages: {
    signIn: "/login",
  },
});

export const config = {
  matcher: ["/dashboard/:path*", "/onboarding/:path*", "/verify-email-pending"],
};
