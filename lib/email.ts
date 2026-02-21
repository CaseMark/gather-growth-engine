// Email sending utility
// Uses Resend API (free tier) or falls back to console logging for development

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const RESEND_FROM_EMAIL = process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev";

export async function sendVerificationEmail(
  email: string,
  token: string,
  name: string
) {
  const verificationUrl = `${process.env.NEXTAUTH_URL}/verify-email?token=${token}`;

  // If Resend API key is not set, just log (for local dev)
  if (!RESEND_API_KEY) {
    // Use console.warn so it stands out in the terminal
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
    console.error("Failed to send email via Resend:", error);
    // Fall back to console logging
    console.log("=".repeat(60));
    console.log("[Email] VERIFICATION EMAIL (fallback - not actually sent)");
    console.log("=".repeat(60));
    console.log(`To: ${email}`);
    console.log(`Verification URL: ${verificationUrl}`);
    console.log("=".repeat(60));
  }
}
