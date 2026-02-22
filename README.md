# Gather Growth Engine

Automated outbound engine that does what SDRs do: understand your product, build a playbook from your ICP, personalize at scale, send via Instantly, and optimize for deliverability and website visits.

**Host:** [growth.gatherhq.com](https://growth.gatherhq.com)  
**Spec:** [docs/SPEC.md](docs/SPEC.md)

## Stack (Phase 1)

- **Next.js 14** (App Router), TypeScript
- **Tailwind CSS** for UI
- **NextAuth.js** with email/password (Credentials) and optional **Google OAuth**
- **Prisma** + **SQLite** (dev) — migrate to Postgres for production
- **Agent:** Anthropic (users provide their own API keys)
- **Sending:** Instantly (users provide their own API keys)
- **A/B testing:** Subject-line (or copy) variants with 50/50 split and comparison UI

**Cost model:** Users bring their own API keys. Project owner pays $0. See [docs/SPEC.md](docs/SPEC.md) §1 and §4.

## Environment variables

Create `.env` from `.env.example` and set:

| Variable | Required | Description |
|---------|----------|-------------|
| `DATABASE_URL` | Yes | SQLite: `file:./dev.db`; production: Postgres URL |
| `NEXTAUTH_SECRET` | Yes | Generate with `openssl rand -base64 32` |
| `NEXTAUTH_URL` | Yes (prod) | Full app URL, e.g. `https://growth.gatherhq.com` |
| `ENCRYPTION_KEY` | Recommended | 32+ char key for encrypting API keys (default dev key not for prod) |
| `GOOGLE_CLIENT_ID` | Optional | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | Optional | Google OAuth client secret |
| `ADMIN_EMAILS` | Optional | Comma-separated emails that can access `/admin` analytics |
| `RESEND_API_KEY` | Yes (prod) | Required for verification emails in production. Get a free key at [resend.com](https://resend.com). |
| `RESEND_FROM_EMAIL` | Optional | From address (default `onboarding@resend.dev` until you verify a domain) |

User API keys (Anthropic, Instantly) are stored encrypted per workspace after onboarding.

## Run locally

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Set up environment:**
   ```bash
   cp .env.example .env
   ```
   Edit `.env` and set at least `NEXTAUTH_SECRET` and `DATABASE_URL` (e.g. `file:./dev.db`).

3. **Set up database:**
   ```bash
   npx prisma generate
   npx prisma db push
   ```
   (Use `npx prisma migrate dev` when using migrations.)

4. **Start dev server:**
   ```bash
   npm run dev
   ```

Open [http://localhost:3000](http://localhost:3000). Sign up or log in (or use **Continue with Google** if OAuth is configured), then complete onboarding (domain + API keys) to use the dashboard.

## Tests

```bash
npm install -D jest @types/jest
npm test
```

Tests cover API route validation (e.g. unauthenticated send returns 401, missing `batchId` returns 400, signup validation). Add more in `__tests__/`.

## Admin analytics

If you set `ADMIN_EMAILS` (comma-separated list of emails) in your environment, those users can open **`/admin`** after logging in to see product analytics: total users, signups (7d / 30d), campaigns sent, total leads, workspaces with domain, and tables of recent signups and recent campaigns.

## Skills (pluggable modules)

You can add **skills**—pluggable modules that run on a schedule or on demand (e.g. “post to LinkedIn twice a day for engagement”). Each skill lives under `skills/<id>/` with a manifest and a `run` function, and is registered in `skills/registry.ts`. Scheduled skills run via **Vercel Cron** (see `vercel.json` → `crons`; set `CRON_SECRET` in Vercel).

- **How to add a skill:** [docs/SKILLS.md](docs/SKILLS.md)
- **APIs:** `GET /api/skills` (list), `POST /api/skills/[id]/run` (run; auth: session or `X-API-Key`)

## MCP (AI assistants)

An **MCP server** in `mcp-server/` exposes the app so AI tools (Cursor, Claude, etc.) can call it via the Model Context Protocol. Tools: **list_campaigns**, **list_skills**, **run_skill**. Set `GATHER_GROWTH_API_URL`, `MCP_API_KEY` (or `GATHER_GROWTH_API_KEY`), and optionally `MCP_USER_ID` in the app env and when running the MCP server. See [mcp-server/README.md](mcp-server/README.md).

## Project layout

```
app/
  page.tsx          # Landing
  login/            # Auth (wired with NextAuth)
  signup/
  dashboard/        # Post-login home (protected)
  onboarding/       # Domain + keys (protected)
  api/auth/         # NextAuth routes
  api/skills/       # List skills, run skill by id
  api/cron/         # Vercel Cron: run scheduled skills
lib/
  auth.ts           # NextAuth config
  api-auth.ts       # Session or X-API-Key (for MCP / skills)
  prisma.ts         # Prisma client
skills/             # Pluggable skills (manifest + run)
  registry.ts       # Register all skills
  linkedin-engagement/  # Example skill
mcp-server/         # MCP server (stdio) for AI tools
prisma/
  schema.prisma     # Database schema
docs/
  SPEC.md           # Product spec (living doc)
  SKILLS.md         # How to add a skill
```

## Deploy to Cloud

See [DEPLOY.md](DEPLOY.md) for detailed instructions on deploying to **Vercel** or **Railway**.

**Quick start:**
1. Push to GitHub (see DEPLOY.md)
2. Import repo on Vercel/Railway
3. Add environment variables: `DATABASE_URL` (Postgres in prod), `NEXTAUTH_URL`, `NEXTAUTH_SECRET`, and optionally `ENCRYPTION_KEY`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `NEXT_PUBLIC_GOOGLE_OAUTH_ENABLED=true`, `RESEND_*`
4. Run database migrations: `npx prisma migrate deploy`
5. Deploy

**Build:** `npm run build` produces a production build. Minification is currently disabled in `next.config.js` to avoid a Terser unicode error; you can re-enable it once the offending dependency or character is fixed.

## What's next

See **§5 What's next** in [docs/SPEC.md](docs/SPEC.md). Auth is wired ✅. Next: onboarding storage (DB + encrypted keys), then crawl + product summary.

## License

TBD (intended open source)
