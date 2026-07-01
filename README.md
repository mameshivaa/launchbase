# LaunchBase

**Launch OS demo** built with **Supabase** (Postgres, Auth, RLS) and **Next.js**.

This is an **open-source, local-first reference project** — not a hosted SaaS product. Clone it, run `supabase start`, and explore how a multi-tenant launch page (waitlist, roadmap, feature board, changelog) fits together with Row Level Security.

## What you get

- **8-table Postgres schema** scoped by `organization_id`
- **Supabase Auth** with automatic `profiles` creation via trigger
- **RLS policies** for anonymous, authenticated, and org-admin roles
- **Next.js App Router** client using only the **anon key** (no `service_role` in the browser)
- **Demo org** `launchbase-demo` with seed data

## Stack

| Layer | Tech |
|-------|------|
| Frontend | Next.js 16, React 19, Tailwind CSS 4 |
| Backend | Supabase (local CLI) |
| Auth | Email/password |
| Data | Postgres + RLS + PostgREST |

## Prerequisites

- [Node.js](https://nodejs.org/) 20+
- [Supabase CLI](https://supabase.com/docs/guides/cli)
- Docker (for local Supabase)

## Quick start

```bash
# 1. Clone and install
git clone https://github.com/mameshivaa/launchbase.git
cd launchbase
npm install

# 2. Start Supabase
supabase start

# 3. Environment (anon key only)
cp .env.example .env.local
supabase status -o json   # copy API_URL → NEXT_PUBLIC_SUPABASE_URL, ANON_KEY → NEXT_PUBLIC_SUPABASE_ANON_KEY

# 4. Reset DB (migrations + seed)
supabase db reset

# 5. Run the app
npm run dev
```

Open **http://127.0.0.1:3000/launchbase-demo** for the public product page.

## Demo routes

| URL | Who | Purpose |
|-----|-----|---------|
| `/launchbase-demo` | Anyone | Public roadmap, features, changelog, waitlist signup |
| `/signup`, `/login` | Anyone | Auth |
| `/account` | Signed-in user | Profile (`display_name`) |
| `/launchbase-demo/admin` | Org admin only | Waitlist + changelog management |

## Bootstrap a local admin

There is **no** “create organization” UI yet. For local demos, promote one signed-up user to owner:

1. Sign up at `/signup` (e.g. `admin.demo@example.invalid`)
2. Copy the user UUID from **Supabase Studio → Authentication → Users**
3. Edit `scripts/local/bootstrap-admin.sql` — replace `YOUR_PROFILE_UUID`
4. Run in Studio SQL or:

   ```bash
   supabase db query --file scripts/local/bootstrap-admin.sql
   ```

5. Log in and open `/launchbase-demo/admin`

See [docs/supabase.md](./docs/supabase.md) for schema, RLS, and migration details.

## Supabase layout

```
supabase/
├── config.toml
├── seed.sql                              # Demo org + public product data
└── migrations/
    ├── 20260701120000_initial_schema.sql # Tables, triggers, RLS enabled
    ├── 20260701130000_rls_policies.sql   # Policies + is_org_admin helpers
    └── 20260701140000_table_grants.sql   # GRANTs for anon/authenticated API roles
```

**Important:** PostgREST needs both **RLS policies** and **table GRANTs**. Without grants, the browser gets `403 permission denied` even when policies exist.

## Security model (summary)

- **Anonymous:** public read (org, roadmap, features, published changelogs); waitlist INSERT
- **Authenticated:** own profile; submit/vote on features; no admin data
- **Org admin/owner:** waitlist read/update; changelog drafts; roadmap write (RLS ready, admin UI partial)

The app never uses `service_role` in client or server components — only `NEXT_PUBLIC_SUPABASE_ANON_KEY` with the user session.

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Next.js dev server |
| `npm run build` | Production build |
| `supabase db reset` | Reapply migrations + seed |
| `supabase status` | Local URLs and keys |

## Project structure

```
src/
├── app/[slug]/           # Public org page + admin
├── components/           # Auth, public, admin UI
├── domain/entities/      # Shared TypeScript types
└── lib/supabase/         # Browser/server clients, admin gate
scripts/local/            # Dev-only SQL (admin bootstrap)
docs/supabase.md          # Architecture deep-dive
```

## Not in scope (by design)

- Production deployment or hosted Supabase project
- Org self-service signup / billing
- `beta_invites`, vote-count RPC, roadmap admin UI
- Email confirmation in production (local config has confirmations off)

Contributions and learning use cases welcome. This repo is meant to be read alongside Supabase Studio and the migration files.

## License

[MIT](./LICENSE)

---

## 日本語 — クイックスタート

本番 SaaS ではなく、**Supabase の Auth / RLS / スキーマ構成を学ぶための OSS** です。

```bash
git clone https://github.com/mameshivaa/launchbase.git
cd launchbase && npm install
supabase start
cp .env.example .env.local   # supabase status の anon key を設定
supabase db reset
npm run dev
```

- 公開ページ: http://127.0.0.1:3000/launchbase-demo  
- 管理画面: `/launchbase-demo/admin`（要 [bootstrap SQL](./scripts/local/bootstrap-admin.sql)）  
- 詳細: [docs/supabase.md](./docs/supabase.md)
