# LaunchBase

**LaunchBase is an open-source launch operations starter built with Supabase and Next.js.**

It gives developers and early startup teams a local-first foundation for a public launch page and an internal operating dashboard: waitlist signups, feature requests, votes, roadmap planning, changelog publishing, Supabase Auth, and Row Level Security.

LaunchBase is not a hosted SaaS. Clone it, run Supabase locally, customize the brand copy and colors, and use it as the starting point for your own startup launch system.

## Who it is for

- **Startup founders** who need a practical launch page, waitlist, roadmap, and changelog without assembling a stack from scratch.
- **Product managers** who want a lightweight operating dashboard for launch demand and roadmap signal.
- **Developers** who want a readable Supabase Auth + RLS reference app that can be adapted quickly.
- **OSS learners** who want to study a complete multi-tenant Supabase schema with public and admin surfaces.

## What you get

- Public startup page at `/launchbase-demo`
- Admin dashboard at `/launchbase-demo/admin`
- Waitlist signup collection and admin status workflow
- Feature request board with authenticated voting
- Public roadmap
- Changelog publishing workflow
- Supabase Auth and profile management
- Organization-scoped data model
- RLS policies for anonymous, authenticated, and admin users
- Customizable landing page copy, CTA links, colors, and media slots

## Stack

| Layer | Tech |
| --- | --- |
| Frontend | Next.js 16, React 19, Tailwind CSS 4 |
| Backend | Supabase CLI, Postgres, PostgREST |
| Auth | Supabase Auth email/password |
| Access control | Supabase Row Level Security |
| Runtime model | Local-first OSS starter |

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
4. Open `/account` and confirm your `profiles` row is visible through RLS.
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

## Customize the landing page

Startup teams should be able to make the app their own quickly. Edit:

```text
src/config/landing-page.ts
```

You can change:

- Brand name and headline
- Supporting copy
- Supabase-style accent colors
- CTA labels and links
- Stack badges
- Media slot labels for product screenshots
- Operation card text

The default page includes image placeholder regions so teams can drop in their own product screenshot, admin dashboard screenshot, or public roadmap capture.

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

Every product row is scoped by `organization_id`. RLS policies define the public, authenticated, and admin access model.

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
