# Supabase architecture — LaunchBase

This document describes the **Supabase-side design** of LaunchBase. Read it together with the SQL migrations under `supabase/migrations/`.

## Design goals

1. **Multi-tenant by organization** — every product row has `organization_id`
2. **Public launch surface** — anon users can read marketing data and join the waitlist
3. **Authenticated community** — signed-in users submit features and vote
4. **Admin isolation** — only org owners/admins see PII (waitlist) and drafts (changelog)
5. **No service_role in the app** — Next.js uses the anon key + user JWT; RLS enforces access

## Entity overview

```
auth.users
    └── profiles (1:1, trigger on signup)

organizations (tenant root, public slug)
    ├── organization_members (user + role: owner | admin | member)
    ├── waitlist_entries
    ├── feature_requests
    ├── feature_votes → feature_requests, profiles
    ├── roadmap_items
    └── changelogs
```

Demo organization (from seed):

| Field | Value |
|-------|-------|
| Name | LaunchBase Demo |
| Slug | `launchbase-demo` |
| ID | `11111111-1111-4111-8111-111111111111` |

## Migration order

Apply with `supabase db reset` (runs migrations then `seed.sql`).

### 1. `20260701120000_initial_schema.sql`

Creates:

- All 8 `public` tables with constraints and indexes
- `set_updated_at()` trigger on mutable tables
- `handle_new_user()` — `AFTER INSERT ON auth.users` → inserts `public.profiles`
- **RLS enabled** on all public tables (no policies yet)

### 2. `20260701130000_rls_policies.sql`

Creates:

- `public.is_org_member(org_id uuid)` — SECURITY DEFINER helper
- `public.is_org_admin(org_id uuid)` — owner or admin
- **27 RLS policies** across 8 tables

Policy intent:

| Table | Anonymous | Authenticated user | Org admin |
|-------|-----------|-------------------|-----------|
| `profiles` | — | read/update own | — |
| `organizations` | read | read | update |
| `organization_members` | — | read fellow members | manage members |
| `waitlist_entries` | insert | insert | read, update status |
| `feature_requests` | read; insert with email | read; insert as self | update/triage |
| `feature_votes` | read rows | insert/delete own vote | — |
| `roadmap_items` | read | read | insert/update/delete |
| `changelogs` | read if `published_at` set | same | read all + CRUD |

### 3. `20260701140000_table_grants.sql`

Grants table-level privileges to `anon` and `authenticated` for PostgREST.

Without this migration, clients see:

```text
permission denied for table profiles (42501)
```

RLS filters rows; **GRANT** allows the role to touch the table at all.

## Auth → profile flow

1. User signs up via Supabase Auth (`/signup`)
2. Row inserted into `auth.users`
3. Trigger `on_auth_user_created` runs `public.handle_new_user()`
4. Row inserted into `public.profiles` with same `id` as `auth.users.id`
5. App reads/updates profile under RLS (`profiles_select_own`, `profiles_update_own`)

Optional metadata at signup: `raw_user_meta_data.display_name` → `profiles.display_name`.

## Admin access model

Admin checks use `organization_members`:

```sql
-- is_org_admin: role IN ('owner', 'admin')
```

**Chicken-and-egg:** the first owner cannot be created through the app yet (no org-creation migration). For local demos, run:

```text
scripts/local/bootstrap-admin.sql
```

This inserts one `organization_members` row as postgres (bypasses RLS). **Do not** ship this pattern to production without hardening.

The Next.js admin page uses `resolveOrgAdminAccess()`:

| State | UX |
|-------|-----|
| Logged out | Redirect to `/login?next=/…/admin` |
| Logged in, not admin | Access denied screen |
| Owner/admin | Dashboard |

## Waitlist flow (public)

1. Anonymous visitor opens `/launchbase-demo`
2. Submits email (+ optional name) via browser client
3. `INSERT INTO waitlist_entries` with `source = 'public_page'`, default `status = 'pending'`
4. RLS: `waitlist_entries_insert_public` (`anon`, `authenticated`)
5. Unique constraint: one email per org — duplicate → friendly UI error
6. **No public SELECT** — only admins see emails in `/admin`

Confirm in Studio: **Table Editor → waitlist_entries**.

## Feature requests & votes

- **Public read** of all requests for the org
- **Anonymous insert** possible via RLS with `submitter_email` (not used in current UI)
- **Authenticated insert** with `created_by = auth.uid()`
- **Votes:** authenticated users insert/delete own row; vote counts aggregated from raw `feature_votes` in MVP (see migration comment — production should use a count view or RPC)

## Changelog visibility

| `published_at` | Public page | Admin page |
|----------------|-------------|------------|
| `NULL` (draft) | Hidden | Visible |
| Set | Visible | Visible |

Seed includes draft **v0.3.0** — visible only to bootstrapped admin until published.

## Local configuration

`supabase/config.toml` highlights:

- `site_url = "http://127.0.0.1:3000"` — auth redirect allow-list
- `[auth.email] enable_confirmations = false` — immediate login after signup (local demo)

## Environment variables

Only these belong in the Next.js app:

```env
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=<from supabase status>
```

Never expose `service_role`, database passwords, or JWT secrets in frontend code or committed files.

## Suggested exploration path (video / self-study)

1. `supabase db reset` — watch three migrations apply
2. Studio → tables + seed rows
3. Public page as incognito — waitlist signup
4. Sign up → verify `profiles` row
5. Bootstrap admin SQL → admin dashboard
6. Non-admin user → access denied on `/admin`
7. Read `20260701130000_rls_policies.sql` alongside Studio **Authentication → Policies**

## Known follow-ups (not implemented)

- Org creation + self-assign owner (replace bootstrap SQL)
- Roadmap admin UI (RLS already allows admin CRUD)
- Feature request triage UI for admins
- Vote-count view / RPC to hide voter `user_id`
- `beta_invites` table

These are intentional gaps for a small, readable OSS reference.
