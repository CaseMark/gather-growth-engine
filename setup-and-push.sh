#!/bin/bash
# Run this script to initialize git and prepare for GitHub push

set -e

cd "$(dirname "$0")"

echo "🚀 Setting up git for Gather Growth Engine..."

# Remove existing .git if corrupted
if [ -d ".git" ]; then
  echo "🧹 Cleaning up existing .git directory..."
  rm -rf .git
fi

# Initialize git
echo "📦 Initializing git repository..."
git init

# Configure git (you can change these)
git config user.name "Mayank"
git config user.email "mayank@example.com"  # Change this to your email

# Add all files
echo "📝 Staging files..."
git add .

# Create initial commit
echo "💾 Creating initial commit..."
git commit -m "Initial commit: Next.js scaffold + NextAuth.js auth wired

- Next.js 14 (App Router) + TypeScript + Tailwind
- NextAuth.js with email/password auth
- Prisma + SQLite schema (users, sessions, accounts)
- Protected routes (dashboard, onboarding)
- Landing, login, signup, dashboard pages
- Cost model: users bring own API keys, owner pays $0
- Deployment configs for Vercel and Railway"

echo ""
echo "✅ Git setup complete!"
echo ""
echo "📤 Next: Push to GitHub"
echo ""
echo "1. Create a repo on GitHub: https://github.com/new"
echo "   Name it: gather-growth-engine"
echo "   Don't initialize with README"
echo ""
echo "2. Then run these commands (replace YOUR_USERNAME):"
echo ""
echo "   git remote add origin https://github.com/YOUR_USERNAME/gather-growth-engine.git"
echo "   git branch -M main"
echo "   git push -u origin main"
echo ""
echo "3. Then deploy on Vercel - see DEPLOY.md for details!"
