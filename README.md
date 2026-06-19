# MJRH V2 — Field Service Operating System

## Quick Start (Vercel)

### 1. Deploy to Vercel
[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new)

1. Push this repo to GitHub
2. Import in Vercel → New Project
3. Add Environment Variables:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
4. Click Deploy ✅

### 2. Supabase Setup
Run `SUPABASE_MIGRATIONS_S0_S1.sql` in your Supabase SQL Editor.

Deploy the Edge Function:
```bash
npx supabase functions deploy admin-actions
```
Set the Edge Function secrets:
```bash
npx supabase secrets set SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### 3. Local Development
```bash
cp .env.example .env
# fill in .env values
npm install
npm run dev
```

## Architecture
- **Frontend**: React 19 + Vite 5 + TanStack Router (SPA)
- **Backend**: Supabase (Postgres + Auth + Realtime + Edge Functions)
- **Styling**: Tailwind CSS + shadcn/ui
- **Deploy**: Vercel (frontend) + Supabase (backend)
