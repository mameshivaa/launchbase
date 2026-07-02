# Contributing to LaunchBase

LaunchBase is a small OSS starter for Supabase-backed launch operations. The best contributions keep it easy to fork, easy to verify locally, and useful to a real startup team.

## Good contribution areas

- RLS test coverage for auth, invites, votes, and admin-only data.
- Clearer setup, deploy, or migration documentation.
- Practical admin workflows for waitlist, feature triage, roadmap, changelog, and team operations.
- UI refinements that stay dense, operational, and startup-tool oriented.
- Seed data and screenshots that make the demo easier to understand.

## Scope boundaries

Please avoid adding these without prior discussion:

- Billing or subscription logic.
- Hosted multi-tenant provisioning services.
- Email provider SDKs such as Resend or SendGrid.
- New UI libraries.
- Runtime use of `SUPABASE_SERVICE_ROLE_KEY` inside the Next.js app.

## Local setup

```bash
npm install
supabase start
cp .env.example .env.local
supabase status -o json
supabase db reset
npm run dev
```

Copy the local Supabase URL and anon key from `supabase status` into `.env.local`.

## Required checks

Run these before opening a PR:

```bash
npm run lint
npm run build
supabase db reset
npm run test:rls
```

`npm run test:rls` needs local Supabase env vars:

```bash
SUPABASE_URL=http://127.0.0.1:54321
SUPABASE_ANON_KEY=<local anon key>
SUPABASE_SERVICE_ROLE_KEY=<local service role key>
```

Use the service role key only for local smoke tests. Do not add it to the Next.js runtime.

## Pull request checklist

- Explain the user workflow improved by the change.
- Note any migration or RLS policy changes.
- Include screenshots for visible UI changes.
- Keep private video, raw media, and `.env.local` files out of the PR.
- Update README or docs when behavior changes.
