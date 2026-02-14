# PainCam AI

Pain & mobility assessment web app. Users record a self-video, fill a questionnaire, and receive a mobility score, personalized exercise recommendations, and a downloadable PDF report.

## Stack

- **Next.js 14** (App Router) + TypeScript
- **TailwindCSS** for styling
- **Supabase** (Auth + Postgres + Storage)
- **@react-pdf/renderer** for PDF generation
- **recharts** for charts
- **zod** for validation

## Prerequisites

- Node.js 18+
- A Supabase project (free tier works)

## Setup

### 1. Install dependencies

```bash
cd paincam-ai
npm install
```

### 2. Configure environment variables

Copy the example env file and fill in your Supabase credentials:

```bash
cp .env.local.example .env.local
```

Edit `.env.local`:

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

Find these values in your Supabase project dashboard under **Settings > API**.

### 3. Apply Supabase migrations

Run the SQL in `supabase/migrations/001_initial_schema.sql` in your Supabase SQL editor (Dashboard > SQL Editor > New Query). This creates:

- `profiles` table
- `sessions` table
- `reports` table
- Row Level Security policies
- Auto-profile creation trigger on signup

Then run `supabase/migrations/002_storage_setup.sql` to create storage buckets and policies:

- `session-videos` bucket
- `reports` bucket

### 4. Run the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Features

- **Auth**: Email/password signup, login, logout via Supabase Auth
- **Protected routes**: Dashboard, session, and reports are auth-gated
- **New Session**: Record or upload a video, then fill a pain/mobility questionnaire
- **Scoring**: Rule-based mobility score (0-100) and risk level (low/moderate/high)
- **Recommendations**: 20 exercises catalog, rule-based matching by pain area and difficulty
- **PDF Report**: Downloadable report with scores, details, and recommendations
- **Dashboard**: Session history list with a mobility score chart (last 10 sessions)
- **i18n**: Hebrew-first (RTL) with English toggle
- **Red flag warnings**: Visible alerts when red flags are selected

## Project Structure

```
paincam-ai/
├── src/
│   ├── app/
│   │   ├── auth/login/         # Login page
│   │   ├── auth/signup/        # Signup page
│   │   ├── auth/callback/      # Auth callback route
│   │   ├── dashboard/          # Dashboard with session list + chart
│   │   ├── session/new/        # New session (video + questionnaire)
│   │   ├── reports/[id]/       # Report view + PDF download
│   │   ├── layout.tsx          # Root layout with RTL + providers
│   │   └── page.tsx            # Redirects to /dashboard
│   ├── components/
│   │   ├── client-providers.tsx
│   │   ├── navbar.tsx
│   │   ├── pdf-report.tsx      # PDF document template
│   │   └── pdf-download-button.tsx
│   ├── context/
│   │   └── locale-context.tsx  # i18n context (HE/EN)
│   ├── data/
│   │   └── exercises.ts        # 20 exercises catalog
│   ├── lib/
│   │   ├── i18n.ts             # Dictionary (Hebrew + English)
│   │   ├── recommendations.ts  # Rule-based exercise picker
│   │   ├── scoring.ts          # calculateScores()
│   │   ├── supabase-client.ts  # Browser Supabase client
│   │   ├── supabase-middleware.ts
│   │   ├── supabase-server.ts  # Server Supabase client
│   │   ├── types.ts            # TypeScript types
│   │   └── validation.ts       # Zod schemas
│   └── middleware.ts           # Auth protection middleware
├── supabase/
│   └── migrations/
│       ├── 001_initial_schema.sql
│       └── 002_storage_setup.sql
├── .env.local.example
└── package.json
```

## Scoring Rules

- Start at 100
- Subtract: painIntensity × 5, stiffness × 3, (10 − sleepQuality) × 2, stress × 2
- For each of 7 movement tests: subtract (3 − value) × 4
- Clamp to 0–100
- Risk: any red flag → high; painIntensity ≥ 7 → moderate; else → low

## Exercise Catalog

20 exercises in `src/data/exercises.ts`, each with bilingual names, instructions, contraindications, area tags, and difficulty levels. The recommendation engine selects 5 matching exercises for each session based on pain area and risk level.
