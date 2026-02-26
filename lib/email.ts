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

  const data = (await res.json().catch(() => ({}))) as { message?: string };
  const resendMessage = typeof data?.message === "string" ? data.message : "";

  if (!res.ok) {
    // Resend "testing" mode: only send to account owner until domain is verified
    const isTestingMode =
      res.status === 403 &&
      /only send testing emails to your own|verify a domain/i.test(resendMessage);
    const msg = isTestingMode
      ? "Resend is in testing mode: you can only send to your Resend account email until you verify a domain. Go to resend.com/domains, verify your domain (e.g. gatherhq.com), then set RESEND_FROM_EMAIL to an address on that domain (e.g. noreply@gatherhq.com) in Vercel."
      : resendMessage ||
        (res.status === 401
          ? "Invalid Resend API key. Check RESEND_API_KEY."
          : res.status === 422
            ? "Invalid from address or recipient. Use a verified domain for RESEND_FROM_EMAIL."
            : "Resend API error");
    throw new Error(`Verification email failed: ${msg}`);
  }

  return;
}

export async function sendPasswordResetEmail(
  email: string,
  token: string,
  name?: string
): Promise<void> {
  const baseUrl = process.env.NEXTAUTH_URL;
  if (!baseUrl) {
    throw new Error(
      "NEXTAUTH_URL is not set. Password reset emails require it for the link."
    );
  }
  const resetUrl = `${baseUrl}/reset-password?token=${token}`;

  if (!RESEND_API_KEY?.trim()) {
    console.warn(
      "[Email] RESEND_API_KEY is not set. Set it in Vercel (or .env) to send password reset emails."
    );
    throw new Error(
      "Email is not configured. Set RESEND_API_KEY in your environment to send password reset emails."
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
      subject: "Reset your password – Outbound Growth Engine",
      html: `
        <h2>Reset your password</h2>
        <p>Hi ${name || "there"},</p>
        <p>We received a request to reset your password. Click the link below to choose a new password:</p>
        <p><a href="${resetUrl}" style="background-color: #10b981; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">Reset password</a></p>
        <p>Or copy and paste this URL into your browser:</p>
        <p>${resetUrl}</p>
        <p>This link will expire in 1 hour. If you didn't request a reset, you can ignore this email.</p>
      `,
    }),
  });

  const data = (await res.json().catch(() => ({}))) as { message?: string };
  const resendMessage = typeof data?.message === "string" ? data.message : "";

  if (!res.ok) {
    const isTestingMode =
      res.status === 403 &&
      /only send testing emails to your own|verify a domain/i.test(resendMessage);
    const msg = isTestingMode
      ? "Resend is in testing mode: you can only send to your Resend account email until you verify a domain."
      : resendMessage ||
        (res.status === 401
          ? "Invalid Resend API key. Check RESEND_API_KEY."
          : res.status === 422
            ? "Invalid from address or recipient."
            : "Resend API error");
    throw new Error(`Password reset email failed: ${msg}`);
  }

  return;
}

/** Send a feature request to mayank@gatherhq.com */
export async function sendFeatureRequestEmail(
  fromEmail: string,
  fromName: string | null,
  message: string
): Promise<void> {
  if (!RESEND_API_KEY?.trim()) {
    throw new Error("Email is not configured. Set RESEND_API_KEY to submit feature requests.");
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${RESEND_API_KEY.trim()}`,
    },
    body: JSON.stringify({
      from: RESEND_FROM_HEADER,
      to: ["mayank@gatherhq.com"],
      replyTo: [fromEmail],
      subject: `[Feature Request] From ${fromName || fromEmail}`,
      html: `
        <h2>Feature request</h2>
        <p><strong>From:</strong> ${fromName || "—"} &lt;${fromEmail}&gt;</p>
        <hr />
        <pre style="white-space: pre-wrap; font-family: inherit;">${message.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</pre>
      `,
    }),
  });

  const data = (await res.json().catch(() => ({}))) as { message?: string };
  if (!res.ok) {
    throw new Error(data?.message || "Failed to send feature request.");
  }
}

/** Send error notification to mayank@gatherhq.com (e.g. generation failures) */
export async function sendErrorNotificationEmail(
  context: string,
  error: string,
  extra?: Record<string, unknown>
): Promise<void> {
  if (!RESEND_API_KEY?.trim()) {
    console.warn("[Email] RESEND_API_KEY not set, skipping error notification");
    return;
  }

  const extraStr = extra ? `\n\nExtra:\n${JSON.stringify(extra, null, 2)}` : "";
  const body = `${context}\n\nError: ${error}${extraStr}`;

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${RESEND_API_KEY.trim()}`,
    },
    body: JSON.stringify({
      from: RESEND_FROM_HEADER,
      to: ["mayank@gatherhq.com"],
      subject: `[Outbound Growth Engine] ${context}`,
      html: `
        <h2>Error report</h2>
        <p><strong>Context:</strong> ${context.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</p>
        <p><strong>Error:</strong></p>
        <pre style="white-space: pre-wrap; font-family: inherit; background: #1f2937; padding: 1rem; border-radius: 0.5rem;">${error.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</pre>
        ${extra ? `<p><strong>Extra:</strong></p><pre style="white-space: pre-wrap; font-family: inherit;">${JSON.stringify(extra).replace(/</g, "&lt;").replace(/>/g, "&gt;")}</pre>` : ""}
      `,
    }),
  });

  if (!res.ok) {
    const data = (await res.json().catch(() => ({}))) as { message?: string };
    console.error("[Email] Error notification failed:", data?.message || res.status);
  }
}
