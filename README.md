# LaunchBase

**Build your startup launch OS on Supabase.**

For founders and developers who want to collect waitlist demand, turn feature requests into roadmap decisions, and publish launch momentum without building auth, permissions, and admin plumbing from scratch.

![LaunchBase landing page screenshot](./docs/assets/launchbase-home.png)

LaunchBase is an open-source, local-first starter for launch operations. It combines a public startup page with an internal dashboard for waitlists, feature requests, votes, roadmap planning, and changelog publishing.

Bring your own product screenshots, edit one config file, run Supabase locally, and start from a working Auth + RLS foundation.

## Use it when

- You are a **startup founder** who needs a credible launch page and a simple internal operating dashboard.
- You are a **developer** who wants a concrete Supabase Auth + RLS app to fork, study, and adapt.
- You are a **product operator** who wants waitlist, request, vote, roadmap, and changelog workflows without adopting a heavy product suite.
- You are building an **OSS SaaS template** and need a real multi-tenant security model, not a static mockup.

## What it includes

| Area | What LaunchBase gives you |
| --- | --- |
| Public launch page | Waitlist form, roadmap, feature requests, votes, changelog |
| Admin dashboard | Waitlist status workflow, demand ranking, roadmap status, changelog publishing |
| Account flow | Supabase Auth signup/login, profile row, next-step onboarding |
| Customization | Brand copy, colors, CTA links, badges, and media slots in one config file |
| Supabase foundation | Local CLI, migrations, seed data, PostgREST, Auth, and RLS policies |

![LaunchBase public startup page screenshot](./docs/assets/launchbase-public-demo.png)

## Why Supabase is doing real work here

LaunchBase is intentionally Supabase-native. The point is not only that it stores rows in Postgres; Supabase removes whole categories of app code that an early startup usually should not hand-roll.

![LaunchBase admin dashboard screenshot](./docs/assets/launchbase-admin-dashboard.png)

Concretely:

- **Auth is already tied to database identity.** Users sign up through Supabase Auth, then a Postgres trigger creates the matching `profiles` row. The app does not need a separate user bootstrap service.
- **RLS replaces a custom authorization layer.** Public visitors, authenticated users, members, owners, and admins are separated with SQL policies. The same tables can safely power public pages and admin pages.
- **PostgREST removes boilerplate CRUD routes.** The Next.js app reads and mutates tables through the Supabase client while RLS decides whether each query is allowed.
- **The anon key stays safe by design.** The app uses only `NEXT_PUBLIC_SUPABASE_ANON_KEY` plus the current user session. No `service_role` key is used in client or server components.
- **The local CLI makes the demo reproducible.** `supabase db reset` rebuilds migrations and seed data, so contributors can reproduce the same launch workspace quickly.
- **Studio makes debugging visible.** Auth users, table rows, policies, and grants are inspectable while learning or adapting the app.

## Quick start

```bash
git clone https://github.com/mameshivaa/launchbase.git
cd launchbase
npm install

supabase start
cp .env.example .env.local
supabase status -o json
```

Copy the local Supabase values into `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=<ANON_KEY from supabase status>
```

Then reset the database and run the app:

```bash
supabase db reset
npm run dev
```

Open:

- Landing page: http://127.0.0.1:3000
- Public demo: http://127.0.0.1:3000/launchbase-demo
- Account: http://127.0.0.1:3000/account
- Admin dashboard: http://127.0.0.1:3000/launchbase-demo/admin

## Demo flow

1. Open `/launchbase-demo` and inspect the public startup page.
2. Join the waitlist as an anonymous visitor.
3. Sign up at `/signup`.
4. Open `/account` and confirm your profile is loaded through RLS.
5. Bootstrap the signed-in user as demo org owner.
6. Open `/launchbase-demo/admin`.
7. Review waitlist entries, feature requests, roadmap status, and changelog drafts.

## Bootstrap a local admin

There is no organization creation UI yet. For local demos, promote a signed-up user to owner.

1. Sign up at `/signup`.
2. Open `/account`.
3. Copy the profile ID shown on the account page.
4. Edit `scripts/local/bootstrap-admin.sql` and replace `YOUR_PROFILE_UUID`.
5. Run it in Supabase Studio SQL editor, or run:

```bash
supabase db query --file scripts/local/bootstrap-admin.sql
```

After that, open `/launchbase-demo/admin`.

## Customize the startup landing page

Edit:

```text
src/config/landing-page.ts
```

You can change:

- Brand name, eyebrow, headline, and supporting copy
- Supabase-style accent colors
- CTA labels and links
- Stack badges
- Hero image and screenshot slot labels
- Operation card text

The default UI includes media placeholders so a startup can attach its own product screenshot, admin dashboard screenshot, or public roadmap capture.

## Supabase schema

LaunchBase creates 8 core tables:

1. `profiles`
2. `organizations`
3. `organization_members`
4. `waitlist_entries`
5. `feature_requests`
6. `feature_votes`
7. `roadmap_items`
8. `changelogs`

Every product row is scoped by `organization_id`. RLS policies define the public, authenticated, member, owner, and admin access model.

See [docs/supabase.md](./docs/supabase.md) for the architecture walkthrough.

## Security model

- Anonymous users can read the public launch surface and join the waitlist.
- Authenticated users can update their own profile, submit feature requests, and vote.
- Organization owners/admins can read waitlist PII, update waitlist status, manage roadmap data, and publish changelog entries.
- The app never uses `service_role` in Next.js client or server components.
- The browser and server use only the Supabase anon key plus the current user session.

## Project structure

```text
src/
├── app/                  # Next.js App Router routes
├── components/           # Auth, public, account, and admin UI
├── config/               # Startup-customizable landing page config
├── domain/entities/      # Shared TypeScript entity types
└── lib/                  # Supabase clients and helpers

docs/assets/              # Real README screenshots captured from the app

supabase/
├── config.toml
├── seed.sql
└── migrations/

scripts/local/
└── bootstrap-admin.sql
```

## Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start the Next.js dev server |
| `npm run build` | Build the app for production |
| `npm run lint` | Run ESLint |
| `supabase start` | Start the local Supabase stack |
| `supabase db reset` | Reapply migrations and seed data |
| `supabase status` | Show local Supabase URLs and keys |

## Current scope

LaunchBase is intentionally small and readable. These are not included yet:

- Hosted production deployment
- Billing
- Organization self-service creation
- Team invitation UI
- Roadmap admin editing UI
- Feature request triage UI
- Vote-count RPC or database view
- Email production hardening

## License

[MIT](./LICENSE)
