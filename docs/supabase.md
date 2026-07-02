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
    ├── organization_invitations (hashed token + invited role)
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
| `organization_invitations` | — | — | create, read, revoke, rotate links |
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

### 4. `20260702090000_mvp_complete.sql`

Creates:

- `public.create_organization(org_name, org_slug)` — authenticated RPC that creates an organization and inserts the caller as `owner`
- `public.get_feature_vote_counts(org_id)` — public-safe aggregate vote counts
- private `feature_votes` reads: authenticated users can read only their own votes; admins can inspect votes for their org; anonymous users cannot read raw voter rows

### 5. `20260702100000_team_invitations.sql`

Creates:

- `organization_invitations` — pending/accepted/revoked/expired invites scoped to one organization
- `create_organization_invitation(org_id, email, role)` — admin-only RPC that returns a one-time raw token for copyable links
- `rotate_organization_invitation_token(invitation_id)` — admin-only RPC that replaces the hash and returns a fresh one-time raw token
- `revoke_organization_invitation(invitation_id)` — admin-only RPC
- `accept_organization_invitation(token)` — authenticated RPC that checks token hash, expiry, status, and email match before creating membership

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

The normal owner bootstrap path is `/account` → **Create workspace**. That calls:

```sql
select public.create_organization('Acme Launch', 'acme-launch');
```

The function inserts one `organizations` row and one `organization_members` row with `role = 'owner'` in a single transaction.

**Local fallback:** if you specifically want to promote a user into the seeded demo organization, run:

```text
scripts/local/bootstrap-admin.sql
```

This inserts one `organization_members` row as postgres (bypasses RLS). It is retained only as a local fallback.

The Next.js admin page uses `resolveOrgAdminAccess()`:

| State | UX |
|-------|-----|
| Logged out | Redirect to `/login?next=/…/admin` |
| Logged in, not admin | Access denied screen |
| Owner/admin | Dashboard |

## Team invitation model

Team invites are DB-backed links, not Supabase Auth admin invites. This keeps `service_role` out of the Next.js app runtime.

1. Owner/admin creates an invite from the admin dashboard.
2. Postgres stores only `token_hash`; the raw token is returned once for copying.
3. If the link is lost, admin rotates the pending invite to get a new token.
4. `/invite/[token]` requires login.
5. `accept_organization_invitation(token)` verifies:
   - token hash exists
   - invite is pending
   - invite has not expired
   - signed-in email matches invitation email
6. Membership is inserted or updated with the invited role.

Invite creation UI allows `admin` and `member`. It does not invite new `owner` users.

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
- **Votes:** authenticated users insert/delete own row; public pages call `get_feature_vote_counts(org_id)` so voter `user_id` values are not exposed

## Changelog visibility

| `published_at` | Public page | Admin page |
|----------------|-------------|------------|
| `NULL` (draft) | Hidden | Visible |
| Set | Visible | Visible |

Seed includes draft **v0.3.0** — visible only to bootstrapped admin until published.

## Local configuration

`supabase/config.toml` highlights for local development:

- `site_url = "http://127.0.0.1:3000"` — auth redirect allow-list
- `[auth.email] enable_confirmations = false` — immediate login after signup (local demo)

Production recommendations:

- Set Supabase Auth **Site URL** to the hosted app URL.
- Add redirect URLs for `/login`, `/account`, and `/invite/*`.
- Enable email confirmations before accepting real users.
- Configure a production SMTP provider in Supabase Auth.
- Keep local `SUPABASE_SERVICE_ROLE_KEY` out of Vercel frontend/runtime env unless adding explicit server-only admin APIs.

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
5. Create a workspace from `/account` → admin dashboard
6. Create a team invite → copy link → accept as matching email
7. Non-admin user → access denied on `/admin`
8. Run `npm run test:rls` with local Supabase keys exported
9. Read the migrations alongside Studio **Authentication → Policies**

## Known follow-ups (not implemented)

- `beta_invites` table
- Email provider SDK integration
- Billing and managed hosted SaaS operations

These are intentional gaps for a small, readable OSS reference.
