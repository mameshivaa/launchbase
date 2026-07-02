-- =============================================================================
-- LaunchBase — MVP completion RPCs and vote privacy
-- =============================================================================
--
-- Adds production-leaning primitives without rewriting the base schema:
--   - authenticated workspace creation with automatic owner membership
--   - public vote counts without exposing raw voter user_ids
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Workspace creation
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.create_organization(org_name text, org_slug text)
RETURNS public.organizations
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  current_user_id uuid := (SELECT auth.uid());
  normalized_name text := nullif(trim(org_name), '');
  normalized_slug text := lower(nullif(trim(org_slug), ''));
  created_org public.organizations;
BEGIN
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required'
      USING ERRCODE = '28000';
  END IF;

  IF normalized_name IS NULL THEN
    RAISE EXCEPTION 'Organization name is required'
      USING ERRCODE = '22023';
  END IF;

  IF normalized_slug IS NULL THEN
    RAISE EXCEPTION 'Organization slug is required'
      USING ERRCODE = '22023';
  END IF;

  IF normalized_slug !~ '^[a-z0-9][a-z0-9-]{1,61}[a-z0-9]$' THEN
    RAISE EXCEPTION 'Slug must be 3-63 characters and contain only lowercase letters, numbers, and hyphens'
      USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.organizations (name, slug)
  VALUES (normalized_name, normalized_slug)
  RETURNING * INTO created_org;

  INSERT INTO public.organization_members (organization_id, user_id, role)
  VALUES (created_org.id, current_user_id, 'owner');

  RETURN created_org;
END;
$$;

COMMENT ON FUNCTION public.create_organization(text, text) IS
  'Authenticated RPC: creates an organization and assigns the caller as owner in one transaction.';

GRANT EXECUTE ON FUNCTION public.create_organization(text, text) TO authenticated;


-- ---------------------------------------------------------------------------
-- Vote privacy
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS "feature_votes_select_public" ON public.feature_votes;

CREATE POLICY "feature_votes_select_own"
  ON public.feature_votes
  FOR SELECT
  TO authenticated
  USING (user_id = (SELECT auth.uid()));

CREATE POLICY "feature_votes_select_admin"
  ON public.feature_votes
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.feature_requests AS request
      WHERE request.id = feature_votes.feature_request_id
        AND public.is_org_admin(request.organization_id)
    )
  );

REVOKE SELECT ON public.feature_votes FROM anon;

CREATE OR REPLACE FUNCTION public.get_feature_vote_counts(org_id uuid)
RETURNS TABLE(feature_request_id uuid, vote_count bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT
    request.id AS feature_request_id,
    count(vote.id)::bigint AS vote_count
  FROM public.feature_requests AS request
  LEFT JOIN public.feature_votes AS vote
    ON vote.feature_request_id = request.id
  WHERE request.organization_id = org_id
  GROUP BY request.id;
$$;

COMMENT ON FUNCTION public.get_feature_vote_counts(uuid) IS
  'Public-safe aggregate vote counts for one organization. Does not expose voter user_ids.';

GRANT EXECUTE ON FUNCTION public.get_feature_vote_counts(uuid) TO anon, authenticated;
