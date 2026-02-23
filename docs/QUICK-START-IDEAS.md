# Ideas: Get users up and running without API key barriers

This doc captures options to reduce drop-off after verification (when users hit the “add Anthropic + Instantly keys” step).

## Implemented: Optional keys at onboarding

- **Domain only required.** Users can enter just their domain and go straight to the dashboard.
- **API keys optional.** They can add Anthropic and Instantly keys later in Settings.
- **Dashboard banner** when keys are missing, with a clear link to Settings.

Result: Users get past onboarding quickly and see the product; they add keys when they’re ready to crawl, generate playbooks, and send.

---

## Option A: Send via Gmail / Google (lower volume, no Instantly)

**Idea:** Let users “Connect Google” and send emails through Gmail instead of Instantly. Lower volume (Gmail limits ~100–500/day) but no Instantly signup.

**Pros**

- No Instantly API key required; one less barrier.
- Users can try end-to-end flow (personalize → send) with an account they already have.
- Good for “try it with a few leads” or very small outbound.

**Cons**

- Build: Gmail API or SMTP + OAuth (Google OAuth scope for sending), token storage, rate limits.
- Gmail is not built for bulk; high volume can trigger spam/limits. Best framed as “Send from Gmail (for testing)” vs “Instantly (for scale).”

**Implementation sketch**

- Add “Send with Gmail” as an alternative to “Send to Instantly” in the dashboard.
- OAuth: request Gmail send scope; store refresh token per workspace (encrypted).
- Sending: use Gmail API or Nodemailer + OAuth to send from the user’s Gmail. Enforce a low cap (e.g. 20–50 emails/day) and show a clear limit in the UI.
- Keep Instantly as the primary path for scale; Gmail as “quick start / testing.”

---

## Option B: Free tier with shared Anthropic key (demo)

**Idea:** Use a single, rate-limited Anthropic key (e.g. `DEMO_ANTHROPIC_KEY` in env) when the user has not added their own key. Lets them try crawl + playbook generation with no signup at Anthropic.

**Pros**

- Users see the product “work” (crawl, playbook, maybe chat) before committing to an API key.
- Bounded cost if limits are strict (e.g. 5–10 requests per user per day, or per IP).

**Cons**

- You pay for usage; need abuse protection (rate limits, optional CAPTCHA, one demo per email).
- Requires quota tracking (DB table or server-side cache) and clear “you’re on demo; add your key for full use” messaging.

**Implementation sketch**

- Env: `DEMO_ANTHROPIC_KEY` (optional). If set and user has no `anthropicKey`, use demo key for crawl/playbook/chat.
- Rate limit: e.g. `DemoUsage` table (userId, date, requestCount) or in-memory store; cap at 10 requests/user/day.
- UI: “You’re using demo AI (limited). Add your Anthropic key in Settings for full access.”

---

## Option C: Better onboarding copy and links

**Idea:** Keep current flow but reduce perceived friction with clear, step-by-step copy and direct links to get keys.

**Examples**

- “You’ll need two free keys — we’ll show you exactly where (about 2 minutes).”
- Link to Anthropic console and Instantly API/key page.
- Short video or GIF: “Get your Anthropic key” / “Get your Instantly key.”
- Optional: “Skip for now” that saves domain only and goes to dashboard (already done with optional keys).

---

## Recommendation

1. **Shipped:** Optional keys + dashboard banner (lowest friction, no new cost).
2. **Next:** Improve onboarding copy and add direct links to get Anthropic and Instantly keys (Option C).
3. **If you want “try sending without Instantly”:** Add Gmail send path (Option A) with a low daily cap and position it as testing / low volume.
4. **If you want “try without any keys”:** Add a demo Anthropic tier (Option B) with strict rate limits and clear upgrade prompt.
