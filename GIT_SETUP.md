# Git Setup Instructions

Run these commands in your terminal from the project directory:

```bash
cd /Users/mayank/gather-growth-engine

# Initialize git (if not already done)
git init

# Add all files
git add .

# Create initial commit
git commit -m "Initial commit: Next.js scaffold + NextAuth.js auth wired

- Next.js 14 (App Router) + TypeScript + Tailwind
- NextAuth.js with email/password auth
- Prisma + SQLite schema (users, sessions, accounts)
- Protected routes (dashboard, onboarding)
- Landing, login, signup, dashboard pages
- Cost model: users bring own API keys, owner pays $0
- Deployment configs for Vercel and Railway"
```

## Push to GitHub

1. **Create a new repository on GitHub:**
   - Go to https://github.com/new
   - Name it `gather-growth-engine` (or whatever you prefer)
   - Don't initialize with README (we already have one)
   - Click "Create repository"

2. **Connect and push:**
   ```bash
   git remote add origin https://github.com/YOUR_USERNAME/gather-growth-engine.git
   git branch -M main
   git push -u origin main
   ```

Replace `YOUR_USERNAME` with your GitHub username.

## Deploy

Once pushed to GitHub, see [DEPLOY.md](DEPLOY.md) for Vercel/Railway deployment instructions.
