#!/bin/bash
# Helper script to initialize git and prepare for GitHub push

set -e

echo "🚀 Setting up git for Gather Growth Engine..."

# Initialize git if not already done
if [ ! -d ".git" ]; then
  echo "📦 Initializing git repository..."
  git init
else
  echo "✅ Git repository already initialized"
fi

# Add all files
echo "📝 Staging files..."
git add .

# Check if there are changes to commit
if git diff --staged --quiet; then
  echo "✅ No changes to commit"
else
  echo "💾 Creating initial commit..."
  git commit -m "Initial commit: Next.js scaffold + NextAuth.js auth wired

- Next.js 14 (App Router) + TypeScript + Tailwind
- NextAuth.js with email/password auth
- Prisma + SQLite schema (users, sessions, accounts)
- Protected routes (dashboard, onboarding)
- Landing, login, signup, dashboard pages
- Cost model: users bring own API keys, owner pays $0
- Deployment configs for Vercel and Railway"
fi

echo ""
echo "✅ Git setup complete!"
echo ""
echo "📤 Next steps to push to GitHub:"
echo "1. Create a new repository on GitHub (github.com/new)"
echo "2. Run these commands (replace YOUR_USERNAME and REPO_NAME):"
echo ""
echo "   git remote add origin https://github.com/YOUR_USERNAME/REPO_NAME.git"
echo "   git branch -M main"
echo "   git push -u origin main"
echo ""
echo "Then deploy on Vercel or Railway - see DEPLOY.md for details!"
