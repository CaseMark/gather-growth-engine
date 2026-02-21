# Quick Start - Get This on GitHub & Deploy

I've set everything up, but there's a permission issue preventing me from running git commands directly. Here's the **one command** you need to run:

## Step 1: Initialize Git (Run This)

```bash
cd /Users/mayank/gather-growth-engine
bash setup-and-push.sh
```

This will:
- ✅ Initialize git
- ✅ Add all files
- ✅ Create the initial commit

## Step 2: Create GitHub Repo & Push

After running the script above, you'll see instructions. But here's what to do:

1. **Go to:** https://github.com/new
2. **Create repo:** Name it `gather-growth-engine` (or whatever you want)
3. **Don't** check "Initialize with README" (we already have one)
4. **Click "Create repository"**

5. **Then run** (replace `YOUR_USERNAME` with your GitHub username):
   ```bash
   git remote add origin https://github.com/YOUR_USERNAME/gather-growth-engine.git
   git branch -M main
   git push -u origin main
   ```

## Step 3: Deploy on Vercel (Easiest)

1. **Go to:** https://vercel.com
2. **Sign in** with GitHub
3. **Click "Add New Project"**
4. **Import** your `gather-growth-engine` repo
5. **Add environment variables:**
   - `DATABASE_URL` - Click "Add Postgres" (Vercel will create one for you)
   - `NEXTAUTH_URL` - Will be auto-filled (like `https://your-app.vercel.app`)
   - `NEXTAUTH_SECRET` - Run `openssl rand -base64 32` and paste the result
6. **Before deploying:** Update `prisma/schema.prisma` line 9 to use `provider = "postgresql"` instead of `"sqlite"`
7. **Click "Deploy"**

That's it! Your app will be live in ~2 minutes.

---

**Need help?** See [DEPLOY.md](DEPLOY.md) for more detailed instructions.
