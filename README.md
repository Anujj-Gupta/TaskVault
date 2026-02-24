# 📋 TaskVault — Productivity Bucket List

A full-stack productivity app built with **Next.js 14**, **Supabase** (auth + DB), and deployed on **Vercel**. Features real-time task management, push notifications, email reminders (Resend), and a complete activity log per user.

---

## 🚀 Quick Deploy (15 minutes)

### Step 1 — Set up Supabase

1. Go to [supabase.com](https://supabase.com) → **New Project**
2. Choose a name, region, and password → **Create Project**
3. Once ready, go to **SQL Editor** → **New Query**
4. Paste the entire contents of `supabase-schema.sql` and click **Run**
5. Go to **Settings → API** and copy:
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon / public` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` key → `SUPABASE_SERVICE_ROLE_KEY`

### Step 2 — Set up Resend (email reminders)

1. Go to [resend.com](https://resend.com) → Sign up free (100 emails/day free)
2. **API Keys** → **Create API Key** → copy it → `RESEND_API_KEY`
3. Go to **Domains** → add and verify your domain (or use `onboarding@resend.dev` for testing)
4. In `app/api/reminders/route.ts` update the `from` field to your verified email/domain

### Step 3 — Push to GitHub

```bash
# In your terminal:
git clone https://github.com/YOUR_USERNAME/taskvault  # or create new repo
cd taskvault

# Copy all files from this project into the repo folder, then:
git add .
git commit -m "Initial commit — TaskVault"
git push origin main
```

Or use GitHub Desktop / VS Code's built-in Git.

### Step 4 — Deploy to Vercel

1. Go to [vercel.com](https://vercel.com) → **Add New Project**
2. Import your GitHub repo
3. In **Environment Variables**, add all keys from `.env.local.example`:

| Variable | Value |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Your Supabase anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Your Supabase service role key |
| `RESEND_API_KEY` | Your Resend API key |
| `NEXT_PUBLIC_APP_URL` | Your Vercel URL (e.g. `https://taskvault.vercel.app`) |

4. Click **Deploy** — done! 🎉

---

## 🏃 Local Development

```bash
# 1. Install dependencies
npm install

# 2. Copy env template and fill in your values
cp .env.local.example .env.local
# Edit .env.local with your Supabase + Resend keys

# 3. Start dev server
npm run dev
# Visit http://localhost:3000
```

---

## 📁 Project Structure

```
taskvault/
├── app/
│   ├── auth/page.tsx          # Sign in / Sign up page
│   ├── dashboard/page.tsx     # Main dashboard (server component)
│   ├── api/
│   │   ├── tasks/route.ts     # GET/POST/PATCH/DELETE tasks
│   │   ├── logs/route.ts      # GET activity logs
│   │   └── reminders/route.ts # POST send email via Resend
│   ├── globals.css
│   └── layout.tsx
├── components/
│   └── DashboardClient.tsx    # Main UI — tasks, filters, modals
├── lib/
│   ├── supabase/
│   │   ├── client.ts          # Browser Supabase client
│   │   ├── server.ts          # Server Supabase client
│   │   └── middleware.ts      # Session refresh middleware
│   └── types.ts               # TypeScript types
├── middleware.ts               # Auth redirect middleware
├── supabase-schema.sql         # Run this in Supabase SQL Editor
└── .env.local.example          # Copy to .env.local
```

---

## ✨ Features

| Feature | Details |
|---|---|
| 🔐 **Auth** | Email + password via Supabase Auth. Sessions handled automatically. |
| 🗄️ **Database** | PostgreSQL via Supabase. Row-level security — users only see their own data. |
| ✅ **Tasks** | Title, description, link, due date, reminder, category, priority, recurrence |
| 🔔 **Push Notifications** | Browser push when reminder fires (if permission granted) |
| 📧 **Email Reminders** | Sent via Resend API when reminder time hits |
| 😴 **Snooze** | Delay any reminder by 30 minutes |
| 🔗 **Resource Links** | Attach article/resource URLs, open with one click |
| 🔄 **Recurrence** | Daily/weekly/monthly tasks auto-recreate on completion |
| 📋 **Activity Log** | Full log per task and global — created, completed, reminded, emailed, etc. |
| 📊 **Stats** | Total, pending, overdue, done + progress bar |
| 🔍 **Search & Filter** | Search by text, filter by status/priority, sort multiple ways |

---

## 🔧 Customisation

**Change email sender:** Edit `from` in `app/api/reminders/route.ts`

**Add OAuth (Google, GitHub):** In Supabase Dashboard → Auth → Providers, enable the provider. Then in `app/auth/page.tsx` add:
```tsx
await supabase.auth.signInWithOAuth({ provider: 'google' })
```

**Custom domain on Vercel:** Settings → Domains → Add your domain

---

## 🛠 Tech Stack

- **Framework:** Next.js 14 (App Router)
- **Auth + DB:** Supabase (PostgreSQL + Auth)
- **Email:** Resend
- **Styling:** Tailwind CSS
- **Deployment:** Vercel
- **Fonts:** Syne + DM Mono

---

## 🐛 Troubleshooting

**"Invalid API key" from Supabase** → Double-check `.env.local` keys match exactly from Supabase dashboard

**Email not sending** → Verify your domain in Resend, update the `from` address in the route, check `RESEND_API_KEY` is set in Vercel env vars

**Auth redirect loop** → Make sure you ran `supabase-schema.sql` fully, check RLS policies are enabled

**Push notifications not working** → Requires HTTPS (works on Vercel, not on `http://localhost` in some browsers — use Chrome for local testing)
