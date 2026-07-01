-- =============================================================================
-- LaunchBase — Initial MVP Schema
-- =============================================================================
--
-- This migration creates the 8 core tables for LaunchBase, a small Launch OS
-- for early-stage startups. Every piece of product data is scoped to an
-- organization (multi-tenant by design).
--
-- Tables created (in dependency order):
--   1. profiles              — app user profile, 1:1 with auth.users
--   2. organizations         — tenant / startup workspace
--   3. organization_members  — membership + role per org
--   4. waitlist_entries      — public email signups (no auth required)
--   5. feature_requests      — community-submitted feature ideas
--   6. feature_votes         — authenticated upvotes on feature requests
--   7. roadmap_items         — admin-curated public roadmap
--   8. changelogs            — shipped updates / release notes
--
-- Also included:
--   - Reusable set_updated_at() trigger function
--   - updated_at triggers on every table that tracks updated_at
--   - handle_new_user() trigger on auth.users → auto-creates profiles row
--   - Row Level Security (RLS) enabled on all public tables (policies TBD)
--
-- NOT included in this migration:
--   - beta_invites (deferred to a later migration)
--   - RLS policies (stubs only — see bottom of file)
-- =============================================================================


-- ---------------------------------------------------------------------------
-- Shared utility: automatically bump updated_at on row changes
-- ---------------------------------------------------------------------------
-- Attach this trigger to any table that has an updated_at column.
-- BEFORE UPDATE ensures the timestamp is set before the row is written.

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.set_updated_at() IS
  'Reusable trigger function: sets updated_at to now() on every UPDATE.';


-- ---------------------------------------------------------------------------
-- 1. profiles
-- ---------------------------------------------------------------------------
-- One row per authenticated user. The primary key mirrors auth.users.id so
-- we can join directly without an extra lookup column.

CREATE TABLE public.profiles (
  id           uuid        PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  display_name text,
  avatar_url   text,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.profiles IS
  'App-visible user profile. id is 1:1 with auth.users.id.';

CREATE TRIGGER profiles_set_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();


-- ---------------------------------------------------------------------------
-- 2. organizations
-- ---------------------------------------------------------------------------
-- The tenant anchor. slug is the public URL key (e.g. acme.launchbase.app/acme).

CREATE TABLE public.organizations (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  name       text        NOT NULL,
  slug       text        NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT organizations_slug_unique UNIQUE (slug)
);

COMMENT ON TABLE public.organizations IS
  'Startup workspace / tenant. All product data hangs off organization_id.';

CREATE TRIGGER organizations_set_updated_at
  BEFORE UPDATE ON public.organizations
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();


-- ---------------------------------------------------------------------------
-- 3. organization_members
-- ---------------------------------------------------------------------------
-- Links profiles to organizations with a role (owner, admin, member).

CREATE TABLE public.organization_members (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid        NOT NULL REFERENCES public.organizations (id) ON DELETE CASCADE,
  user_id         uuid        NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  role            text        NOT NULL,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT organization_members_role_check
    CHECK (role IN ('owner', 'admin', 'member')),

  CONSTRAINT organization_members_org_user_unique
    UNIQUE (organization_id, user_id)
);

COMMENT ON TABLE public.organization_members IS
  'Membership join table: which users belong to which orgs, and their role.';

CREATE INDEX organization_members_user_id_idx
  ON public.organization_members (user_id);

CREATE TRIGGER organization_members_set_updated_at
  BEFORE UPDATE ON public.organization_members
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();


-- ---------------------------------------------------------------------------
-- 4. waitlist_entries
-- ---------------------------------------------------------------------------
-- Public email signups — no authentication required.
-- One email per organization (enforced by unique constraint).

CREATE TABLE public.waitlist_entries (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid        NOT NULL REFERENCES public.organizations (id) ON DELETE CASCADE,
  email           text        NOT NULL,
  name            text,
  source          text,
  status          text        NOT NULL DEFAULT 'pending',
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT waitlist_entries_status_check
    CHECK (status IN ('pending', 'invited', 'converted')),

  CONSTRAINT waitlist_entries_org_email_unique
    UNIQUE (organization_id, email)
);

COMMENT ON TABLE public.waitlist_entries IS
  'Public waitlist signups scoped to an organization. No auth.users FK.';

CREATE INDEX waitlist_entries_organization_id_idx
  ON public.waitlist_entries (organization_id);

CREATE TRIGGER waitlist_entries_set_updated_at
  BEFORE UPDATE ON public.waitlist_entries
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();


-- ---------------------------------------------------------------------------
-- 5. feature_requests
-- ---------------------------------------------------------------------------
-- Community-submitted ideas. Auth users set created_by; anonymous submitters
-- can use submitter_email instead (at least one should be present).

CREATE TABLE public.feature_requests (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid        NOT NULL REFERENCES public.organizations (id) ON DELETE CASCADE,
  title           text        NOT NULL,
  description     text,
  status          text        NOT NULL DEFAULT 'open',
  created_by      uuid        REFERENCES public.profiles (id) ON DELETE SET NULL,
  submitter_email text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT feature_requests_status_check
    CHECK (status IN ('open', 'planned', 'in_progress', 'shipped', 'closed')),

  CONSTRAINT feature_requests_submitter_present_check
    CHECK (created_by IS NOT NULL OR submitter_email IS NOT NULL)
);

COMMENT ON TABLE public.feature_requests IS
  'Feature ideas submitted by authenticated users or anonymous email.';

CREATE INDEX feature_requests_org_status_created_idx
  ON public.feature_requests (organization_id, status, created_at DESC);

CREATE TRIGGER feature_requests_set_updated_at
  BEFORE UPDATE ON public.feature_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();


-- ---------------------------------------------------------------------------
-- 6. feature_votes
-- ---------------------------------------------------------------------------
-- Authenticated upvotes. One vote per user per feature request.

CREATE TABLE public.feature_votes (
  id                 uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  feature_request_id uuid        NOT NULL REFERENCES public.feature_requests (id) ON DELETE CASCADE,
  user_id            uuid        NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  created_at         timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT feature_votes_request_user_unique
    UNIQUE (feature_request_id, user_id)
);

COMMENT ON TABLE public.feature_votes IS
  'Upvotes on feature requests. Requires authentication (user_id → profiles).';

CREATE INDEX feature_votes_feature_request_id_idx
  ON public.feature_votes (feature_request_id);


-- ---------------------------------------------------------------------------
-- 7. roadmap_items
-- ---------------------------------------------------------------------------
-- Admin-curated public roadmap. Optionally linked to a promoted feature request.

CREATE TABLE public.roadmap_items (
  id                 uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id    uuid        NOT NULL REFERENCES public.organizations (id) ON DELETE CASCADE,
  title              text        NOT NULL,
  description        text,
  status             text        NOT NULL DEFAULT 'planned',
  sort_order         integer     NOT NULL DEFAULT 0,
  target_date        date,
  feature_request_id uuid        REFERENCES public.feature_requests (id) ON DELETE SET NULL,
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT roadmap_items_status_check
    CHECK (status IN ('planned', 'in_progress', 'done', 'cancelled'))
);

COMMENT ON TABLE public.roadmap_items IS
  'Curated public roadmap entries. May optionally reference a feature_request.';

CREATE INDEX roadmap_items_org_sort_order_idx
  ON public.roadmap_items (organization_id, sort_order);

CREATE INDEX roadmap_items_org_status_idx
  ON public.roadmap_items (organization_id, status);

CREATE TRIGGER roadmap_items_set_updated_at
  BEFORE UPDATE ON public.roadmap_items
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();


-- ---------------------------------------------------------------------------
-- 8. changelogs
-- ---------------------------------------------------------------------------
-- Release notes / shipped updates. published_at NULL means draft.

CREATE TABLE public.changelogs (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid        NOT NULL REFERENCES public.organizations (id) ON DELETE CASCADE,
  title           text        NOT NULL,
  body            text        NOT NULL,
  version         text,
  published_at    timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.changelogs IS
  'Changelog / release notes. published_at IS NULL = draft, NOT NULL = live.';

CREATE INDEX changelogs_org_published_at_idx
  ON public.changelogs (organization_id, published_at DESC);

CREATE TRIGGER changelogs_set_updated_at
  BEFORE UPDATE ON public.changelogs
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();


-- ---------------------------------------------------------------------------
-- Auth hook: auto-create a profile when a new user signs up
-- ---------------------------------------------------------------------------
-- SECURITY DEFINER lets this function write to public.profiles even though
-- the caller is the auth schema. search_path is pinned to avoid hijacking.
-- DROP first so re-running db reset is idempotent for this trigger name.

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data ->> 'display_name',
    NEW.raw_user_meta_data ->> 'avatar_url'
  );
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.handle_new_user() IS
  'Trigger function: inserts a profiles row when auth.users gets a new row.';

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();


-- ---------------------------------------------------------------------------
-- Row Level Security (RLS)
-- ---------------------------------------------------------------------------
-- Enable RLS on every public table now so no data is accidentally exposed
-- before policies are written. With RLS on and zero policies, anon and
-- authenticated roles are denied by default (service_role bypasses RLS).
--
-- Actual policies will be added in a follow-up migration. Stubs below document
-- the intended access model — they are COMMENTED OUT on purpose.

ALTER TABLE public.profiles             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organizations        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.waitlist_entries     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feature_requests     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feature_votes        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roadmap_items        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.changelogs           ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- RLS policy stubs (commented out — implement in next migration)
-- ---------------------------------------------------------------------------
--
-- profiles
--   SELECT: user can read own row (auth.uid() = id)
--   UPDATE: user can update own row (auth.uid() = id)
--
-- organizations
--   SELECT: public read by slug (for landing pages) OR member read
--   INSERT: authenticated user can create org (becomes owner)
--   UPDATE: owner/admin of org
--   DELETE: owner only
--
-- organization_members
--   SELECT: members can see fellow members of their orgs
--   INSERT: owner/admin can invite/add members
--   UPDATE: owner/admin can change roles
--   DELETE: owner/admin can remove members (owner cannot remove self if sole owner)
--
-- waitlist_entries
--   INSERT: anon/authenticated can join waitlist for a public org (by slug)
--   SELECT: org owner/admin only (dashboard)
--   UPDATE: org owner/admin only (status changes: pending → invited → converted)
--
-- feature_requests
--   SELECT: public read for org's public board
--   INSERT: authenticated users (created_by = auth.uid()) or anon with email
--   UPDATE: org admin/owner (status changes) or submitter (own open requests)
--   DELETE: org admin/owner
--
-- feature_votes
--   SELECT: public read (for vote counts) or bundled in feature_requests query
--   INSERT: authenticated, one vote per user per request
--   DELETE: voter can remove own vote (toggle)
--
-- roadmap_items
--   SELECT: public read for org's public roadmap
--   INSERT/UPDATE/DELETE: org owner/admin only
--
-- changelogs
--   SELECT: public read where published_at IS NOT NULL
--   INSERT/UPDATE/DELETE: org owner/admin only
--
-- Helper function likely needed for policies:
--   is_org_member(org_id uuid, required_role text default 'member')
--   is_org_admin(org_id uuid)  — owner or admin
-- ---------------------------------------------------------------------------
