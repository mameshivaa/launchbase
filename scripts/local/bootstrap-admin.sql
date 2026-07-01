-- =============================================================================
-- LOCAL DEV ONLY — Bootstrap admin for launchbase-demo
-- =============================================================================
--
-- Run this AFTER signing up an admin user in the UI (/signup).
-- Do NOT commit auth UUIDs into seed.sql or migrations.
--
-- Steps:
--   1. supabase db reset
--   2. Sign up e.g. admin.demo@example.invalid via http://127.0.0.1:3000/signup
--   3. In Supabase Studio → Authentication → Users (or Table Editor → profiles),
--      copy the user's UUID (same as profiles.id).
--   4. Replace YOUR_PROFILE_UUID below and run this in Studio SQL or:
--        supabase db query --file scripts/local/bootstrap-admin.sql
--   5. Log in as that user and open http://127.0.0.1:3000/launchbase-demo/admin
--
-- Demo organization: launchbase-demo
-- Organization id: 11111111-1111-4111-8111-111111111111
-- =============================================================================

INSERT INTO public.organization_members (organization_id, user_id, role)
VALUES (
  '11111111-1111-4111-8111-111111111111',
  'YOUR_PROFILE_UUID',
  'owner'
)
ON CONFLICT (organization_id, user_id) DO UPDATE
SET role = EXCLUDED.role;
