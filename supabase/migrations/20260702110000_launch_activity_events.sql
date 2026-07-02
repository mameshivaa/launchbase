-- Launch activity events
-- A compact admin-only timeline powered by Postgres triggers.

CREATE TABLE public.launch_activity_events (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid        NOT NULL REFERENCES public.organizations (id) ON DELETE CASCADE,
  actor_user_id   uuid        REFERENCES public.profiles (id) ON DELETE SET NULL,
  event_type      text        NOT NULL,
  subject_type    text        NOT NULL,
  subject_id      uuid,
  subject_label   text        NOT NULL,
  metadata        jsonb       NOT NULL DEFAULT '{}'::jsonb,
  created_at      timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT launch_activity_events_event_type_check
    CHECK (length(event_type) > 0),
  CONSTRAINT launch_activity_events_subject_type_check
    CHECK (length(subject_type) > 0)
);

COMMENT ON TABLE public.launch_activity_events IS
  'Admin-only operational activity timeline recorded by database triggers.';

CREATE INDEX launch_activity_events_org_created_idx
  ON public.launch_activity_events (organization_id, created_at DESC);

ALTER TABLE public.launch_activity_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "launch_activity_events_select_admin"
  ON public.launch_activity_events
  FOR SELECT
  TO authenticated
  USING (public.is_org_admin(organization_id));

GRANT SELECT ON public.launch_activity_events TO authenticated;

CREATE OR REPLACE FUNCTION public.log_launch_activity(
  org_id uuid,
  activity_type text,
  subject_kind text,
  subject_row_id uuid,
  label text,
  activity_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.launch_activity_events (
    organization_id,
    actor_user_id,
    event_type,
    subject_type,
    subject_id,
    subject_label,
    metadata
  )
  VALUES (
    org_id,
    auth.uid(),
    activity_type,
    subject_kind,
    subject_row_id,
    COALESCE(NULLIF(label, ''), subject_kind),
    COALESCE(activity_metadata, '{}'::jsonb)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.log_launch_activity(
  uuid,
  text,
  text,
  uuid,
  text,
  jsonb
) FROM PUBLIC;

CREATE OR REPLACE FUNCTION public.log_waitlist_activity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM public.log_launch_activity(
      NEW.organization_id,
      'waitlist_joined',
      'waitlist_entry',
      NEW.id,
      NEW.email,
      jsonb_build_object('status', NEW.status, 'source', NEW.source)
    );
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status THEN
    PERFORM public.log_launch_activity(
      NEW.organization_id,
      'waitlist_status_changed',
      'waitlist_entry',
      NEW.id,
      NEW.email,
      jsonb_build_object('from', OLD.status, 'to', NEW.status)
    );
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.log_feature_request_activity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM public.log_launch_activity(
      NEW.organization_id,
      'feature_request_created',
      'feature_request',
      NEW.id,
      NEW.title,
      jsonb_build_object('status', NEW.status)
    );
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status THEN
    PERFORM public.log_launch_activity(
      NEW.organization_id,
      'feature_request_triaged',
      'feature_request',
      NEW.id,
      NEW.title,
      jsonb_build_object('from', OLD.status, 'to', NEW.status)
    );
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.log_roadmap_activity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM public.log_launch_activity(
      NEW.organization_id,
      'roadmap_item_created',
      'roadmap_item',
      NEW.id,
      NEW.title,
      jsonb_build_object('status', NEW.status, 'sort_order', NEW.sort_order)
    );
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status THEN
    PERFORM public.log_launch_activity(
      NEW.organization_id,
      'roadmap_status_changed',
      'roadmap_item',
      NEW.id,
      NEW.title,
      jsonb_build_object('from', OLD.status, 'to', NEW.status)
    );
    RETURN NEW;
  END IF;

  IF TG_OP = 'DELETE' THEN
    PERFORM public.log_launch_activity(
      OLD.organization_id,
      'roadmap_item_deleted',
      'roadmap_item',
      OLD.id,
      OLD.title,
      jsonb_build_object('status', OLD.status)
    );
    RETURN OLD;
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.log_changelog_activity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM public.log_launch_activity(
      NEW.organization_id,
      'changelog_draft_created',
      'changelog',
      NEW.id,
      NEW.title,
      jsonb_build_object('version', NEW.version)
    );
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE'
    AND OLD.published_at IS NULL
    AND NEW.published_at IS NOT NULL THEN
    PERFORM public.log_launch_activity(
      NEW.organization_id,
      'changelog_published',
      'changelog',
      NEW.id,
      NEW.title,
      jsonb_build_object('version', NEW.version, 'published_at', NEW.published_at)
    );
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.log_invitation_activity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM public.log_launch_activity(
      NEW.organization_id,
      'team_invite_created',
      'organization_invitation',
      NEW.id,
      NEW.email,
      jsonb_build_object('role', NEW.role, 'status', NEW.status)
    );
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status THEN
    PERFORM public.log_launch_activity(
      NEW.organization_id,
      CASE
        WHEN NEW.status = 'accepted' THEN 'team_invite_accepted'
        WHEN NEW.status = 'revoked' THEN 'team_invite_revoked'
        ELSE 'team_invite_updated'
      END,
      'organization_invitation',
      NEW.id,
      NEW.email,
      jsonb_build_object('role', NEW.role, 'from', OLD.status, 'to', NEW.status)
    );
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER waitlist_entries_activity_insert
  AFTER INSERT ON public.waitlist_entries
  FOR EACH ROW
  EXECUTE FUNCTION public.log_waitlist_activity();

CREATE TRIGGER waitlist_entries_activity_status_update
  AFTER UPDATE OF status ON public.waitlist_entries
  FOR EACH ROW
  EXECUTE FUNCTION public.log_waitlist_activity();

CREATE TRIGGER feature_requests_activity_insert
  AFTER INSERT ON public.feature_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.log_feature_request_activity();

CREATE TRIGGER feature_requests_activity_status_update
  AFTER UPDATE OF status ON public.feature_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.log_feature_request_activity();

CREATE TRIGGER roadmap_items_activity_insert
  AFTER INSERT ON public.roadmap_items
  FOR EACH ROW
  EXECUTE FUNCTION public.log_roadmap_activity();

CREATE TRIGGER roadmap_items_activity_status_update
  AFTER UPDATE OF status ON public.roadmap_items
  FOR EACH ROW
  EXECUTE FUNCTION public.log_roadmap_activity();

CREATE TRIGGER roadmap_items_activity_delete
  AFTER DELETE ON public.roadmap_items
  FOR EACH ROW
  EXECUTE FUNCTION public.log_roadmap_activity();

CREATE TRIGGER changelogs_activity_insert
  AFTER INSERT ON public.changelogs
  FOR EACH ROW
  EXECUTE FUNCTION public.log_changelog_activity();

CREATE TRIGGER changelogs_activity_publish
  AFTER UPDATE OF published_at ON public.changelogs
  FOR EACH ROW
  EXECUTE FUNCTION public.log_changelog_activity();

CREATE TRIGGER organization_invitations_activity_insert
  AFTER INSERT ON public.organization_invitations
  FOR EACH ROW
  EXECUTE FUNCTION public.log_invitation_activity();

CREATE TRIGGER organization_invitations_activity_status_update
  AFTER UPDATE OF status ON public.organization_invitations
  FOR EACH ROW
  EXECUTE FUNCTION public.log_invitation_activity();
