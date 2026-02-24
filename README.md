# 📋 TaskVault — Productivity Bucket List

Built with **Next.js 14** + **Clerk Auth** + **Supabase DB** + deployed on **Vercel**.

---

## 🚀 Setup Guide

### Step 1 — Clerk Auth (2 min)

1. Go to [clerk.com](https://clerk.com) → **Create Application**
2. Name it "TaskVault", select **Email + Password** (and Google if you want)
3. Go to **API Keys** → copy:
   - `Publishable key` → `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
   - `Secret key` → `CLERK_SECRET_KEY`
4. Go to **Redirects** → set:
   - Sign-in URL: `/sign-in`
   - Sign-up URL: `/sign-up`
   - After sign-in: `/dashboard`
   - After sign-up: `/dashboard`

### Step 2 — Supabase DB (3 min)

1. Go to [supabase.com](https://supabase.com) → **New Project**
2. **SQL Editor** → **New Query** → paste `supabase-schema.sql` → **Run**
3. **Settings → API** → copy:
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `service_role` key → `SUPABASE_SERVICE_ROLE_KEY`

### Step 3 — Push to GitHub

```bash
git add .
git commit -m "Switch to Clerk auth"
git push
```

### Step 4 — Vercel Environment Variables

Add these in **Vercel → Settings → Environment Variables**:

| Variable | Where to get it |
|---|---|
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk → API Keys |
| `CLERK_SECRET_KEY` | Clerk → API Keys |
| `NEXT_PUBLIC_CLERK_SIGN_IN_URL` | `/sign-in` |
| `NEXT_PUBLIC_CLERK_SIGN_UP_URL` | `/sign-up` |
| `NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL` | `/dashboard` |
| `NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL` | `/dashboard` |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Settings → API |
| `RESEND_API_KEY` | resend.com (optional, for emails) |
| `NEXT_PUBLIC_APP_URL` | Your Vercel URL after deploy |

Then **Deploy** → done! 🎉

### Step 5 — Add Vercel URL to Clerk

After deploy, go to **Clerk → Domains** → **Add domain** → add your Vercel URL.

---

## 🏃 Local Dev

```bash
npm install
cp .env.local.example .env.local
# Fill in your keys
npm run dev
```

## ✨ Tech Stack
- **Framework:** Next.js 14 (App Router)
- **Auth:** Clerk
- **Database:** Supabase (PostgreSQL)  
- **Email:** Resend
- **Styling:** Tailwind CSS
- **Deploy:** Vercel
