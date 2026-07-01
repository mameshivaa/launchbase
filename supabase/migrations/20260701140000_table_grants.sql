-- =============================================================================
-- LaunchBase — Table grants for Supabase API roles
-- =============================================================================
--
-- PostgREST requires table-level GRANTs on top of RLS policies.
-- RLS controls which rows are visible; GRANTs control whether a role may
-- access the table at all. Without these, authenticated clients get 403.
-- =============================================================================

GRANT USAGE ON SCHEMA public TO anon, authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;

GRANT SELECT ON public.organizations TO anon, authenticated;
GRANT UPDATE ON public.organizations TO authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.organization_members TO authenticated;

GRANT INSERT ON public.waitlist_entries TO anon, authenticated;
GRANT SELECT, UPDATE ON public.waitlist_entries TO authenticated;

GRANT SELECT ON public.feature_requests TO anon, authenticated;
GRANT INSERT, UPDATE ON public.feature_requests TO anon, authenticated;

GRANT SELECT ON public.feature_votes TO anon, authenticated;
GRANT INSERT, DELETE ON public.feature_votes TO authenticated;

GRANT SELECT ON public.roadmap_items TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.roadmap_items TO authenticated;

GRANT SELECT ON public.changelogs TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.changelogs TO authenticated;
