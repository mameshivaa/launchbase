-- =============================================================================
-- LaunchBase — Demo seed (local development)
-- =============================================================================
-- Seeds public product data only. No auth.users, profiles, organization_members,
-- or feature_votes (those require authenticated users).
--
-- Organization slug: launchbase-demo
-- Safe to rerun: ON CONFLICT DO NOTHING on natural keys / primary keys.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Organization
-- ---------------------------------------------------------------------------
INSERT INTO public.organizations (id, name, slug, created_at, updated_at)
VALUES (
  '11111111-1111-4111-8111-111111111111',
  'LaunchBase Demo',
  'launchbase-demo',
  '2026-06-01 09:00:00+00',
  '2026-06-01 09:00:00+00'
)
ON CONFLICT (slug) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 2. Waitlist entries (5)
-- ---------------------------------------------------------------------------
INSERT INTO public.waitlist_entries (
  id, organization_id, email, name, source, status, created_at, updated_at
)
VALUES
  (
    '21111111-1111-4111-8111-111111111111',
    '11111111-1111-4111-8111-111111111111',
    'river.demo@example.invalid',
    'River Chen',
    'landing_page',
    'pending',
    '2026-06-02 14:22:00+00',
    '2026-06-02 14:22:00+00'
  ),
  (
    '21111111-1111-4111-8111-111111111112',
    '11111111-1111-4111-8111-111111111111',
    'sam.demo@example.invalid',
    'Sam Okonkwo',
    'product_hunt',
    'pending',
    '2026-06-03 08:15:00+00',
    '2026-06-03 08:15:00+00'
  ),
  (
    '21111111-1111-4111-8111-111111111113',
    '11111111-1111-4111-8111-111111111111',
    'morgan.demo@example.invalid',
    'Morgan Vega',
    'twitter',
    'invited',
    '2026-06-04 19:40:00+00',
    '2026-06-05 10:00:00+00'
  ),
  (
    '21111111-1111-4111-8111-111111111114',
    '11111111-1111-4111-8111-111111111111',
    'alex.demo@example.invalid',
    'Alex Park',
    'referral',
    'converted',
    '2026-05-28 11:05:00+00',
    '2026-06-01 16:30:00+00'
  ),
  (
    '21111111-1111-4111-8111-111111111115',
    '11111111-1111-4111-8111-111111111111',
    'jordan.demo@example.invalid',
    'Jordan Lee',
    'hacker_news',
    'pending',
    '2026-06-05 07:50:00+00',
    '2026-06-05 07:50:00+00'
  )
ON CONFLICT (organization_id, email) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 3. Feature requests (5) — anonymous submitters via submitter_email
-- ---------------------------------------------------------------------------
INSERT INTO public.feature_requests (
  id, organization_id, title, description, status, submitter_email, created_at, updated_at
)
VALUES
  (
    '31111111-1111-4111-8111-111111111111',
    '11111111-1111-4111-8111-111111111111',
    'Embeddable public roadmap widget',
    'A lightweight iframe or script tag so we can drop our roadmap into our marketing site without rebuilding it.',
    'open',
    'river.demo@example.invalid',
    '2026-06-02 15:00:00+00',
    '2026-06-02 15:00:00+00'
  ),
  (
    '31111111-1111-4111-8111-111111111112',
    '11111111-1111-4111-8111-111111111111',
    'Slack alerts for new waitlist signups',
    'Post a message to #growth whenever someone joins the waitlist, with source and UTM tags.',
    'open',
    'sam.demo@example.invalid',
    '2026-06-03 09:30:00+00',
    '2026-06-03 09:30:00+00'
  ),
  (
    '31111111-1111-4111-8111-111111111113',
    '11111111-1111-4111-8111-111111111111',
    'Custom domain for waitlist pages',
    'Host the public waitlist at waitlist.ourstartup.example instead of a LaunchBase subdomain.',
    'planned',
    'morgan.demo@example.invalid',
    '2026-06-04 20:10:00+00',
    '2026-06-05 11:00:00+00'
  ),
  (
    '31111111-1111-4111-8111-111111111114',
    '11111111-1111-4111-8111-111111111111',
    'Authenticated feature voting',
    'Let signed-in users upvote feature requests once, with vote counts visible on the public board.',
    'in_progress',
    'alex.demo@example.invalid',
    '2026-05-29 12:00:00+00',
    '2026-06-04 14:00:00+00'
  ),
  (
    '31111111-1111-4111-8111-111111111115',
    '11111111-1111-4111-8111-111111111111',
    'CSV export for waitlist entries',
    'One-click export of all waitlist signups with email, source, status, and signup date.',
    'shipped',
    'jordan.demo@example.invalid',
    '2026-05-20 10:00:00+00',
    '2026-06-01 17:00:00+00'
  )
ON CONFLICT (id) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 4. Roadmap items (3) — linked to promoted feature requests
-- ---------------------------------------------------------------------------
INSERT INTO public.roadmap_items (
  id, organization_id, title, description, status, sort_order, target_date,
  feature_request_id, created_at, updated_at
)
VALUES
  (
    '41111111-1111-4111-8111-111111111111',
    '11111111-1111-4111-8111-111111111111',
    'Custom domain support',
    'Allow teams to map a custom domain to their public waitlist and roadmap pages.',
    'planned',
    1,
    '2026-08-01',
    '31111111-1111-4111-8111-111111111113',
    '2026-06-05 11:00:00+00',
    '2026-06-05 11:00:00+00'
  ),
  (
    '41111111-1111-4111-8111-111111111112',
    '11111111-1111-4111-8111-111111111111',
    'Feature voting',
    'Ship authenticated upvotes on the public feature board with real-time counts.',
    'in_progress',
    2,
    '2026-07-15',
    '31111111-1111-4111-8111-111111111114',
    '2026-06-04 14:00:00+00',
    '2026-06-04 14:00:00+00'
  ),
  (
    '41111111-1111-4111-8111-111111111113',
    '11111111-1111-4111-8111-111111111111',
    'Waitlist CSV export',
    'Export waitlist data from the dashboard for CRM import and offline analysis.',
    'done',
    3,
    '2026-06-01',
    '31111111-1111-4111-8111-111111111115',
    '2026-05-25 09:00:00+00',
    '2026-06-01 17:00:00+00'
  )
ON CONFLICT (id) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 5. Changelogs (3) — 2 published, 1 draft
-- ---------------------------------------------------------------------------
INSERT INTO public.changelogs (
  id, organization_id, title, body, version, published_at, created_at, updated_at
)
VALUES
  (
    '51111111-1111-4111-8111-111111111111',
    '11111111-1111-4111-8111-111111111111',
    'Alpha launch — core tables and public pages',
    E'## What shipped\n\n- Initial schema for organizations, waitlist, roadmap, and changelog\n- Public waitlist signup form\n- Read-only public roadmap view\n\n## Notes\n\nThis is our first internal alpha build for dogfooding LaunchBase itself.',
    '0.1.0',
    '2026-06-01 10:00:00+00',
    '2026-06-01 09:00:00+00',
    '2026-06-01 10:00:00+00'
  ),
  (
    '51111111-1111-4111-8111-111111111112',
    '11111111-1111-4111-8111-111111111111',
    'Waitlist dashboard and CSV export',
    E'## What shipped\n\n- Admin dashboard for waitlist entries\n- Status workflow: pending → invited → converted\n- CSV export for all signups\n\n## Improvements\n\n- Faster table loads in Supabase Studio\n- Clearer source attribution on signup rows',
    '0.2.0',
    '2026-06-05 08:00:00+00',
    '2026-06-04 16:00:00+00',
    '2026-06-05 08:00:00+00'
  ),
  (
    '51111111-1111-4111-8111-111111111113',
    '11111111-1111-4111-8111-111111111111',
    'Feature voting and embeddable roadmap (draft)',
    E'## Planned\n\n- Authenticated upvotes on feature requests\n- Embeddable roadmap widget for marketing sites\n- Slack integration for waitlist notifications\n\n## Status\n\nStill in development — not yet published.',
    '0.3.0',
    NULL,
    '2026-06-05 12:00:00+00',
    '2026-06-05 12:00:00+00'
  )
ON CONFLICT (id) DO NOTHING;
