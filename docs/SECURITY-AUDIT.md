# Security Audit

Last reviewed: 2026-02-25

## Summary

Overall security posture is **good**. No hardcoded secrets, no obvious token leaks, auth is consistently applied. One fix applied: encryption key now fails loudly in production if not set.

---

## ✅ What's Secure

### Secrets & Keys
- **No hardcoded secrets** – API keys, tokens, passwords are from `process.env` or user-provided (stored encrypted)
- **`.env` gitignored** – Only `.env.example` (no real values) is tracked
- **User API keys** – Anthropic and Instantly keys stored encrypted in DB, decrypted only server-side
- **Workspace GET** – Returns `hasAnthropicKey` / `hasInstantlyKey` booleans, never raw keys
- **NEXT_PUBLIC_*** – Only `NEXT_PUBLIC_APP_VERSION` is exposed to client (safe)

### Authentication & Authorization
- **All protected API routes** – Use `getServerSession` and return 401 if no session
- **Workspace isolation** – Queries filter by `workspaceId` derived from `session.user.id`
- **Admin routes** – `isAdmin()` checks `ADMIN_EMAILS` / `ADMIN_EMAIL` env
- **IDOR protection** – Campaign, sent campaign, lead batch, etc. all scoped to user's workspace

### Tokens
- **Email verification** – `crypto.randomBytes(32).toString("hex")` (256-bit)
- **Password reset** – Same, with 1-hour expiry
- **bcrypt** – Passwords hashed with cost 10

### Data Handling
- **No raw SQL** – Prisma only, no `$queryRaw` / injection risk
- **No `dangerouslySetInnerHTML`** – No XSS vectors found
- **Feature request** – Message escaped for HTML (`replace(/</g, "&lt;")`)

### Public Endpoints (by design)
- `GET /api/auth/providers` – Returns only `{ google: boolean }`, no secrets
- `POST /api/auth/signup` – Creates user, sends verification email
- `POST /api/auth/forgot-password` – Same response whether email exists (no enumeration)
- `POST /api/auth/reset-password` – Requires valid token
- `GET /api/verify-email?token=...` – One-time use, token cleared after verify

---

## ⚠️ Recommendations

### 1. ENCRYPTION_KEY in Production (fixed)
- **Before:** Default key used if env not set → weak encryption in prod
- **After:** Throws in production if `ENCRYPTION_KEY` not set or &lt; 16 chars

### 2. Rate Limiting
- **verify-email**, **forgot-password**, **signup** – No rate limiting. An attacker could:
  - Brute-force verification tokens (64-char hex = infeasible but still)
  - Enumerate emails via signup "already exists"
  - Spam password reset emails
- **Recommendation:** Add rate limiting (e.g. Vercel Edge, Upstash, or middleware) for these routes

### 3. MCP / API Key Auth
- `MCP_API_KEY` or `GATHER_GROWTH_API_KEY` + optional `MCP_USER_ID` grants full access as that user
- Ensure key is strong and not committed; rotate if leaked

### 4. Security Headers
- No explicit `Content-Security-Policy`, `X-Frame-Options`, etc. in `next.config.js`
- Next.js sets some by default; consider adding CSP for stricter XSS protection

### 5. Import API – User-Provided URL
- `POST /api/leads/import/api` – User supplies URL + optional API key. Server fetches the URL.
- URL is validated (http/https only). Key is used only for that request, not stored.
- **SSRF risk:** Server fetches user URL. Mitigated by protocol check; consider blocking `localhost`, `127.0.0.1`, internal IPs if you have internal services.

---

## Checklist for Deploy

- [ ] `ENCRYPTION_KEY` set in Vercel (32+ chars)
- [ ] `NEXTAUTH_SECRET` set
- [ ] `DATABASE_URL` points to production DB
- [ ] `ADMIN_EMAILS` or `ADMIN_EMAIL` set if using admin features
- [ ] `MCP_API_KEY` / `GATHER_GROWTH_API_KEY` – only if using programmatic access; keep secret
