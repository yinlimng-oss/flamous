# feast-review

New, standalone project for the Feast Dining Group review system. Built fresh — the
live site at review.feastdininggroup.com was used only as a UX/visual reference (its
actual flow: language → good/bad → visit-type tags → category tags → free text →
2–8 photos → AI captions → platform choice → post), not modified or reused as code.

## Structure

```
app/
  admin/            → Admin dashboard (Dashboard, Reviews, Customers, Restaurants,
                       Outlets, QR Codes, Analytics, Social Platforms, Settings)
  r/[slug]/          → Customer review flow (QR landing) — NEXT STEP, not yet built
  layout.tsx, page.tsx, globals.css
components/
  admin/            → Shared admin UI (Sidebar, StatCard, badges, etc.)
  review/           → Customer-flow UI — NEXT STEP, not yet built
lib/supabase/       → Browser + server Supabase clients, admin-context helper
supabase/
  migrations/       → 3 SQL migrations: schema, RLS, storage
  functions/        → 6 Edge Functions: create-session, submit-feedback, upload-photo,
                       generate-review, track-click, admin-analytics
middleware.ts        → Protects /admin/* routes
```

## Status

- [x] Project scaffold (this step)
- [x] Database schema + RLS + storage (migrations)
- [x] All 6 Edge Functions
- [x] Admin dashboard (9 pages, some read-only — see below)
- [ ] Customer-facing review flow (`app/r/[slug]/`) — **next step**
- [ ] Restaurant/outlet create-edit forms in admin
- [ ] Deployed + tested against a live Supabase project

## Getting started (once dependencies are installed)

```bash
npm install
cp .env.example .env.local   # fill in your Supabase project values
npm run dev
```

Backend setup (migrations, functions, secrets) is documented in `supabase/README` /
the Supabase setup section previously given — same steps, now living inside this repo.
