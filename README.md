# Gather Growth Engine

Automated outbound engine that does what SDRs do: understand your product, build a playbook from your ICP, personalize at scale, send via Instantly, and optimize for deliverability and website visits.

**Host:** [growth.gatherhq.com](https://growth.gatherhq.com)  
**Spec:** [docs/SPEC.md](docs/SPEC.md)

## Stack (Phase 1)

- **Next.js 14** (App Router), TypeScript
- **Tailwind CSS** for UI
- **NextAuth.js** with email/password (Credentials provider)
- **Prisma** + **SQLite** (dev) — migrate to Postgres for production
- **Agent:** Anthropic (users provide their own API keys)
- **Sending:** Instantly (users provide their own API keys)

**Cost model:** Users bring their own API keys. Project owner pays $0. See [docs/SPEC.md](docs/SPEC.md) §1 and §4.

## Run locally

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Set up environment:**
   ```bash
   cp .env.example .env
   ```
   Then edit `.env` and set `NEXTAUTH_SECRET` (generate one with `openssl rand -base64 32`).

3. **Set up database:**
   ```bash
   npx prisma generate
   npx prisma migrate dev --name init
   ```

4. **Start dev server:**
   ```bash
   npm run dev
   ```

Open [http://localhost:3000](http://localhost:3000). You can **Sign up** to create an account, then **Log in** to access the dashboard. The onboarding flow (domain + API keys) is next.

## Project layout

```
app/
  page.tsx          # Landing
  login/            # Auth (wired with NextAuth)
  signup/
  dashboard/        # Post-login home (protected)
  onboarding/       # Domain + keys (protected)
  api/auth/         # NextAuth routes
lib/
  auth.ts           # NextAuth config
  prisma.ts         # Prisma client
prisma/
  schema.prisma     # Database schema
docs/
  SPEC.md           # Product spec (living doc)
```

## Deploy to Cloud

See [DEPLOY.md](DEPLOY.md) for detailed instructions on deploying to **Vercel** or **Railway**.

**Quick start:**
1. Push to GitHub (see DEPLOY.md)
2. Import repo on Vercel/Railway
3. Add environment variables (DATABASE_URL, NEXTAUTH_URL, NEXTAUTH_SECRET)
4. Deploy!

## What's next

See **§5 What's next** in [docs/SPEC.md](docs/SPEC.md). Auth is wired ✅. Next: onboarding storage (DB + encrypted keys), then crawl + product summary.

## License

TBD (intended open source)
