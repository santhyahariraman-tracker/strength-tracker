# Strength Tracker

Track your strength training workouts: date, focus, exercises, and sets (reps + weight in lbs/kg).

## Stack

- Next.js (App Router) + Tailwind CSS
- Supabase (Postgres + Auth)
- Deployed on Vercel

## Setup

1. **Create a Supabase project** at [supabase.com](https://supabase.com).
2. **Run the migration**: open the SQL editor in your Supabase project and run the contents of [`supabase/migrations/0001_init.sql`](supabase/migrations/0001_init.sql). This creates the `workouts`, `exercises`, and `sets` tables with Row Level Security so each user only sees their own data.
3. **Get your API keys**: in Supabase, go to Project Settings → API, copy the Project URL and anon/public key.
4. **Configure env vars**: copy `.env.local.example` to `.env.local` and fill in the values:
   ```
   NEXT_PUBLIC_SUPABASE_URL=...
   NEXT_PUBLIC_SUPABASE_ANON_KEY=...
   ```
5. **Install and run**:
   ```
   npm install
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000). Sign up with an email/password (Supabase sends a confirmation email by default — you can disable that requirement in Supabase Auth settings for local testing).

## Deploy to Vercel

1. Push this repo to GitHub.
2. Import the repo into [Vercel](https://vercel.com/new).
3. Add the same two environment variables (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`) in the Vercel project settings.
4. Deploy.

## Usage

- **New workout**: pick a date, type a Focus (e.g. "Push Day" — past values autocomplete), add one or more exercises. For each exercise, enter the number of sets to generate that many rows for reps + weight + unit (lbs/kg).
- **Workout detail page**: edit the date/focus, add/remove exercises, edit/add/remove individual sets.
- **Dashboard**: lists all your workouts, most recent first.
