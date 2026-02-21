# Deployment Guide

## Quick Deploy

### Option 1: Vercel (Recommended for Next.js)

1. **Push to GitHub:**
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   # Create a repo on GitHub, then:
   git remote add origin https://github.com/YOUR_USERNAME/gather-growth-engine.git
   git push -u origin main
   ```

2. **Deploy on Vercel:**
   - Go to [vercel.com](https://vercel.com)
   - Import your GitHub repo
   - Add environment variables:
     - `DATABASE_URL` - Get from Vercel Postgres (add Postgres addon) or external provider
     - `NEXTAUTH_URL` - Your Vercel URL (e.g., `https://your-app.vercel.app`)
     - `NEXTAUTH_SECRET` - Generate with `openssl rand -base64 32`
   - Deploy!

**Note:** For production, change Prisma schema to use Postgres:
- In `prisma/schema.prisma`, change `provider = "sqlite"` to `provider = "postgresql"`
- Or use Vercel Postgres addon (it auto-detects)

### Option 2: Railway

1. **Push to GitHub** (same as above)

2. **Deploy on Railway:**
   - Go to [railway.app](https://railway.app)
   - New Project → Deploy from GitHub repo
   - Add Postgres service (Railway will auto-add `DATABASE_URL`)
   - Add environment variables:
     - `NEXTAUTH_URL` - Your Railway URL
     - `NEXTAUTH_SECRET` - Generate with `openssl rand -base64 32`
   - Update `prisma/schema.prisma` to use `provider = "postgresql"` for production
   - Deploy!

## Environment Variables

**Required:**
- `DATABASE_URL` - Postgres connection string (production) or SQLite file path (local)
- `NEXTAUTH_URL` - Your app URL (e.g., `https://your-app.vercel.app`)
- `NEXTAUTH_SECRET` - Secret key (generate with `openssl rand -base64 32`)

**Optional (for future features):**
- User-provided API keys stored in DB (Anthropic, Instantly, etc.)

## Database Migration

For production, you'll need to run migrations:

```bash
npx prisma migrate deploy
```

Vercel and Railway can run this automatically via build commands (see `vercel.json` and `railway.json`).

## Cost Model Reminder

- **Project owner pays $0** - Users bring their own API keys
- Vercel free tier: Hobby plan (good for testing)
- Railway free tier: $5/month credit (good for testing)
- Postgres: Use Vercel Postgres (free tier) or Railway Postgres (included)
