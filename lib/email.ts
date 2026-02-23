// Email sending utility
// Uses Resend API (free tier). Requires RESEND_API_KEY in production.

const RESEND_API_KEY = process.env.RESEND_API_KEY;
// Resend requires "Display Name <email>" format; free tier allows onboarding@resend.dev
const RESEND_FROM =
  process.env.RESEND_FROM_EMAIL?.trim() || "onboarding@resend.dev";
const FROM_DISPLAY = "Outbound Growth Engine";
const RESEND_FROM_HEADER =
  RESEND_FROM.includes("<") && RESEND_FROM.includes(">")
    ? RESEND_FROM
    : `${FROM_DISPLAY} <${RESEND_FROM}>`;

export async function sendVerificationEmail(
  email: string,
  token: string,
  name: string
): Promise<void> {
  const baseUrl = process.env.NEXTAUTH_URL;
  if (!baseUrl) {
    throw new Error(
      "NEXTAUTH_URL is not set. Verification emails require it for the link."
    );
  }
  const verificationUrl = `${baseUrl}/verify-email?token=${token}`;

  // No API key: fail loudly so deploy/env can be fixed (don't silently skip in production)
  if (!RESEND_API_KEY?.trim()) {
    console.warn(
      "[Email] RESEND_API_KEY is not set. Set it in Vercel (or .env) to send verification emails."
    );
    throw new Error(
      "Email is not configured. Set RESEND_API_KEY in your environment to send verification emails."
    );
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${RESEND_API_KEY.trim()}`,
    },
    body: JSON.stringify({
      from: RESEND_FROM_HEADER,
      to: [email],
      subject: "Verify your email for Outbound Growth Engine",
      html: `
        <h2>Welcome to Outbound Growth Engine!</h2>
        <p>Hi ${name},</p>
        <p>Please verify your email address by clicking the link below:</p>
        <p><a href="${verificationUrl}" style="background-color: #10b981; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">Verify Email</a></p>
        <p>Or copy and paste this URL into your browser:</p>
        <p>${verificationUrl}</p>
        <p>This link will expire in 24 hours.</p>
      `,
    }),
  });

  const data = await res.json().catch(() => ({})) as { message?: string };

  if (!res.ok) {
    const msg =
      typeof data?.message === "string"
        ? data.message
        : res.status === 401
          ? "Invalid Resend API key. Check RESEND_API_KEY."
          : res.status === 422
            ? "Invalid from address or recipient. Use onboarding@resend.dev or a verified domain."
            : "Resend API error";
    throw new Error(`Verification email failed: ${msg}`);
  }

  return;
}
