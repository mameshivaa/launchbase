-- =============================================================================
-- LaunchBase — Baseline input constraints for OSS safety
-- =============================================================================
--
-- Client validation is a UX layer. These CHECK constraints keep the public
-- PostgREST surface bounded when callers talk to Supabase directly with the
-- anon key.
-- =============================================================================

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_display_name_length_check
    CHECK (display_name IS NULL OR char_length(display_name) <= 120),
  ADD CONSTRAINT profiles_avatar_url_length_check
    CHECK (avatar_url IS NULL OR char_length(avatar_url) <= 2048);

ALTER TABLE public.organizations
  ADD CONSTRAINT organizations_name_length_check
    CHECK (char_length(name) BETWEEN 1 AND 120),
  ADD CONSTRAINT organizations_slug_format_check
    CHECK (slug ~ '^[a-z0-9][a-z0-9-]{1,61}[a-z0-9]$');

ALTER TABLE public.waitlist_entries
  ADD CONSTRAINT waitlist_entries_email_format_check
    CHECK (
      char_length(email) <= 254
      AND email = lower(email)
      AND email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'
    ),
  ADD CONSTRAINT waitlist_entries_name_length_check
    CHECK (name IS NULL OR char_length(name) <= 120),
  ADD CONSTRAINT waitlist_entries_source_length_check
    CHECK (source IS NULL OR char_length(source) <= 80);

ALTER TABLE public.feature_requests
  ADD CONSTRAINT feature_requests_title_length_check
    CHECK (char_length(title) BETWEEN 1 AND 160),
  ADD CONSTRAINT feature_requests_description_length_check
    CHECK (description IS NULL OR char_length(description) <= 2000),
  ADD CONSTRAINT feature_requests_submitter_email_format_check
    CHECK (
      submitter_email IS NULL
      OR (
        char_length(submitter_email) <= 254
        AND submitter_email = lower(submitter_email)
        AND submitter_email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'
      )
    );

ALTER TABLE public.roadmap_items
  ADD CONSTRAINT roadmap_items_title_length_check
    CHECK (char_length(title) BETWEEN 1 AND 160),
  ADD CONSTRAINT roadmap_items_description_length_check
    CHECK (description IS NULL OR char_length(description) <= 2000);

ALTER TABLE public.changelogs
  ADD CONSTRAINT changelogs_title_length_check
    CHECK (char_length(title) BETWEEN 1 AND 160),
  ADD CONSTRAINT changelogs_body_length_check
    CHECK (char_length(body) BETWEEN 1 AND 8000),
  ADD CONSTRAINT changelogs_version_length_check
    CHECK (version IS NULL OR char_length(version) <= 40);

ALTER TABLE public.organization_invitations
  ADD CONSTRAINT organization_invitations_email_format_check
    CHECK (
      char_length(email) <= 254
      AND email = lower(email)
      AND email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'
    );
