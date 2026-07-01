-- =============================================================================
-- LaunchBase — Row Level Security Policies (Phase 1)
-- =============================================================================
--
-- Adds helper functions and RLS policies for all 8 public tables.
-- RLS was enabled in the initial schema migration; this migration defines
-- who can read and write what.
--
-- Roles used:
--   anon          — unauthenticated visitors (public landing pages)
--   authenticated — signed-in users (auth.uid() available)
--
-- Helper functions use SECURITY DEFINER so they can read organization_members
-- without being blocked by RLS on that same table (avoids circular checks).
-- =============================================================================


-- ---------------------------------------------------------------------------
-- Helper: is_org_member(org_id)
-- ---------------------------------------------------------------------------
-- Returns true when the current user belongs to the given organization.

CREATE OR REPLACE FUNCTION public.is_org_member(org_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.organization_members AS m
    WHERE m.organization_id = org_id
      AND m.user_id = (SELECT auth.uid())
  );
$$;

COMMENT ON FUNCTION public.is_org_member(uuid) IS
  'True if auth.uid() is a member of the organization (any role).';


-- ---------------------------------------------------------------------------
-- Helper: is_org_admin(org_id)
-- ---------------------------------------------------------------------------
-- Returns true when the current user is an owner or admin of the organization.

CREATE OR REPLACE FUNCTION public.is_org_admin(org_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.organization_members AS m
    WHERE m.organization_id = org_id
      AND m.user_id = (SELECT auth.uid())
      AND m.role IN ('owner', 'admin')
  );
$$;

COMMENT ON FUNCTION public.is_org_admin(uuid) IS
  'True if auth.uid() is an owner or admin of the organization.';

GRANT EXECUTE ON FUNCTION public.is_org_member(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_org_admin(uuid) TO authenticated;


-- ---------------------------------------------------------------------------
-- 1. profiles
-- ---------------------------------------------------------------------------
-- Users manage only their own profile row (id = auth.uid()).

CREATE POLICY "profiles_select_own"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (id = (SELECT auth.uid()));

CREATE POLICY "profiles_update_own"
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (id = (SELECT auth.uid()))
  WITH CHECK (id = (SELECT auth.uid()));


-- ---------------------------------------------------------------------------
-- 2. organizations
-- ---------------------------------------------------------------------------
-- Public read for landing pages; admins can update their org settings.

CREATE POLICY "organizations_select_public"
  ON public.organizations
  FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "organizations_update_admin"
  ON public.organizations
  FOR UPDATE
  TO authenticated
  USING (public.is_org_admin(id))
  WITH CHECK (public.is_org_admin(id));


-- ---------------------------------------------------------------------------
-- 3. organization_members
-- ---------------------------------------------------------------------------
-- Members see who belongs to their org; admins manage membership rows.

CREATE POLICY "organization_members_select_member"
  ON public.organization_members
  FOR SELECT
  TO authenticated
  USING (public.is_org_member(organization_id));

CREATE POLICY "organization_members_insert_admin"
  ON public.organization_members
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_org_admin(organization_id));

CREATE POLICY "organization_members_update_admin"
  ON public.organization_members
  FOR UPDATE
  TO authenticated
  USING (public.is_org_admin(organization_id))
  WITH CHECK (public.is_org_admin(organization_id));

CREATE POLICY "organization_members_delete_admin"
  ON public.organization_members
  FOR DELETE
  TO authenticated
  USING (public.is_org_admin(organization_id));


-- ---------------------------------------------------------------------------
-- 4. waitlist_entries
-- ---------------------------------------------------------------------------
-- Anyone can join a waitlist; only org admins see and manage entries.

CREATE POLICY "waitlist_entries_insert_public"
  ON public.waitlist_entries
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "waitlist_entries_select_admin"
  ON public.waitlist_entries
  FOR SELECT
  TO authenticated
  USING (public.is_org_admin(organization_id));

CREATE POLICY "waitlist_entries_update_admin"
  ON public.waitlist_entries
  FOR UPDATE
  TO authenticated
  USING (public.is_org_admin(organization_id))
  WITH CHECK (public.is_org_admin(organization_id));


-- ---------------------------------------------------------------------------
-- 5. feature_requests
-- ---------------------------------------------------------------------------
-- Public board is readable by everyone. Anonymous users submit with email;
-- authenticated users submit as themselves. Admins triage and update status.

CREATE POLICY "feature_requests_select_public"
  ON public.feature_requests
  FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "feature_requests_insert_anon_email"
  ON public.feature_requests
  FOR INSERT
  TO anon
  WITH CHECK (
    submitter_email IS NOT NULL
    AND created_by IS NULL
  );

CREATE POLICY "feature_requests_insert_authenticated"
  ON public.feature_requests
  FOR INSERT
  TO authenticated
  WITH CHECK (created_by = (SELECT auth.uid()));

CREATE POLICY "feature_requests_update_admin"
  ON public.feature_requests
  FOR UPDATE
  TO authenticated
  USING (public.is_org_admin(organization_id))
  WITH CHECK (public.is_org_admin(organization_id));


-- ---------------------------------------------------------------------------
-- 6. feature_votes
-- ---------------------------------------------------------------------------
-- Vote counts are public; only signed-in users can vote (and only as themselves).
--
-- MVP note: feature_votes_select_public exposes raw vote rows (user_id per vote).
-- For production, replace with a vote-count view or SECURITY DEFINER RPC that
-- returns aggregated counts without revealing individual voter identities.

CREATE POLICY "feature_votes_select_public"
  ON public.feature_votes
  FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "feature_votes_insert_own"
  ON public.feature_votes
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY "feature_votes_delete_own"
  ON public.feature_votes
  FOR DELETE
  TO authenticated
  USING (user_id = (SELECT auth.uid()));


-- ---------------------------------------------------------------------------
-- 7. roadmap_items
-- ---------------------------------------------------------------------------
-- Public roadmap is readable by everyone; admins curate items.

CREATE POLICY "roadmap_items_select_public"
  ON public.roadmap_items
  FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "roadmap_items_insert_admin"
  ON public.roadmap_items
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_org_admin(organization_id));

CREATE POLICY "roadmap_items_update_admin"
  ON public.roadmap_items
  FOR UPDATE
  TO authenticated
  USING (public.is_org_admin(organization_id))
  WITH CHECK (public.is_org_admin(organization_id));

CREATE POLICY "roadmap_items_delete_admin"
  ON public.roadmap_items
  FOR DELETE
  TO authenticated
  USING (public.is_org_admin(organization_id));


-- ---------------------------------------------------------------------------
-- 8. changelogs
-- ---------------------------------------------------------------------------
-- Visitors see published release notes only. Admins see drafts and manage all.

CREATE POLICY "changelogs_select_published"
  ON public.changelogs
  FOR SELECT
  TO anon, authenticated
  USING (published_at IS NOT NULL);

CREATE POLICY "changelogs_select_admin"
  ON public.changelogs
  FOR SELECT
  TO authenticated
  USING (public.is_org_admin(organization_id));

CREATE POLICY "changelogs_insert_admin"
  ON public.changelogs
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_org_admin(organization_id));

CREATE POLICY "changelogs_update_admin"
  ON public.changelogs
  FOR UPDATE
  TO authenticated
  USING (public.is_org_admin(organization_id))
  WITH CHECK (public.is_org_admin(organization_id));

CREATE POLICY "changelogs_delete_admin"
  ON public.changelogs
  FOR DELETE
  TO authenticated
  USING (public.is_org_admin(organization_id));
