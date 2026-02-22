// Email sending utility
// Uses Resend API (free tier). In production, RESEND_API_KEY is required or verification emails will not send.

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const RESEND_FROM_EMAIL = process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev";

function isProduction(): boolean {
  const url = process.env.NEXTAUTH_URL ?? "";
  return process.env.NODE_ENV === "production" || url.startsWith("https://");
}

export async function sendVerificationEmail(
  email: string,
  token: string,
  name: string
) {
  const verificationUrl = `${process.env.NEXTAUTH_URL}/verify-email?token=${token}`;

  // If Resend API key is not set
  if (!RESEND_API_KEY?.trim()) {
    if (isProduction()) {
      throw new Error(
        "Verification emails are not configured. Set RESEND_API_KEY (and optionally RESEND_FROM_EMAIL) in your deployment environment. See https://resend.com for a free API key."
      );
    }
    // Local dev: log the link so you can verify without sending
    console.warn("\n" + "=".repeat(70));
    console.warn("[Email] VERIFICATION EMAIL (dev mode - not actually sent)");
    console.warn("=".repeat(70));
    console.warn(`To: ${email}`);
    console.warn("");
    console.warn(">>> COPY THIS LINK INTO YOUR BROWSER TO VERIFY YOUR EMAIL <<<");
    console.warn("");
    console.warn(verificationUrl);
    console.warn("");
    console.warn("=".repeat(70) + "\n");
    return;
  }

  // Use Resend API
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: RESEND_FROM_EMAIL,
        to: email,
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

    if (!res.ok) {
      const error = await res.json();
      throw new Error(`Resend API error: ${error.message || "Unknown error"}`);
    }

    return await res.json();
  } catch (error) {
    console.error("Failed to send verification email via Resend:", error);
    throw error;
  }
}
