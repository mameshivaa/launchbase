-- =============================================================================
-- LaunchBase — Team invitation links
-- =============================================================================
--
-- DB-backed invitation links. Raw tokens are never stored; only SHA-256 hashes
-- are persisted. Admins can create/revoke invites and rotate a pending token
-- when they need a fresh copyable link.
-- =============================================================================

CREATE TABLE public.organization_invitations (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid        NOT NULL REFERENCES public.organizations (id) ON DELETE CASCADE,
  email           text        NOT NULL,
  role            text        NOT NULL,
  token_hash      text        NOT NULL,
  status          text        NOT NULL DEFAULT 'pending',
  expires_at      timestamptz NOT NULL DEFAULT (now() + interval '7 days'),
  accepted_at     timestamptz,
  created_by      uuid        REFERENCES public.profiles (id) ON DELETE SET NULL,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT organization_invitations_role_check
    CHECK (role IN ('admin', 'member')),

  CONSTRAINT organization_invitations_status_check
    CHECK (status IN ('pending', 'accepted', 'revoked', 'expired')),

  CONSTRAINT organization_invitations_token_hash_unique
    UNIQUE (token_hash)
);

CREATE UNIQUE INDEX organization_invitations_pending_email_idx
  ON public.organization_invitations (organization_id, lower(email))
  WHERE status = 'pending';

CREATE INDEX organization_invitations_organization_id_idx
  ON public.organization_invitations (organization_id, created_at DESC);

CREATE TRIGGER organization_invitations_set_updated_at
  BEFORE UPDATE ON public.organization_invitations
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.organization_invitations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "organization_invitations_select_admin"
  ON public.organization_invitations
  FOR SELECT
  TO authenticated
  USING (public.is_org_admin(organization_id));

CREATE POLICY "organization_invitations_insert_admin"
  ON public.organization_invitations
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_org_admin(organization_id));

CREATE POLICY "organization_invitations_update_admin"
  ON public.organization_invitations
  FOR UPDATE
  TO authenticated
  USING (public.is_org_admin(organization_id))
  WITH CHECK (public.is_org_admin(organization_id));

GRANT SELECT, INSERT, UPDATE ON public.organization_invitations TO authenticated;

CREATE OR REPLACE FUNCTION public.hash_invitation_token(raw_token text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = ''
AS $$
  SELECT encode(extensions.digest(raw_token, 'sha256'), 'hex');
$$;

CREATE OR REPLACE FUNCTION public.create_organization_invitation(
  org_id uuid,
  invite_email text,
  invite_role text
)
RETURNS TABLE(
  invitation_id uuid,
  invited_org_id uuid,
  invited_email text,
  invited_role text,
  invite_status text,
  invite_expires_at timestamptz,
  invite_accepted_at timestamptz,
  invite_created_at timestamptz,
  token text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  current_user_id uuid := (SELECT auth.uid());
  normalized_email text := lower(nullif(trim(invite_email), ''));
  normalized_role text := lower(nullif(trim(invite_role), ''));
  raw_token text := encode(extensions.gen_random_bytes(32), 'hex');
  invitation public.organization_invitations;
BEGIN
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '28000';
  END IF;

  IF NOT public.is_org_admin(org_id) THEN
    RAISE EXCEPTION 'Admin access required' USING ERRCODE = '42501';
  END IF;

  IF normalized_email IS NULL OR normalized_email !~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' THEN
    RAISE EXCEPTION 'Valid invite email is required' USING ERRCODE = '22023';
  END IF;

  IF normalized_role NOT IN ('admin', 'member') THEN
    RAISE EXCEPTION 'Invite role must be admin or member' USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.organization_invitations (
    organization_id,
    email,
    role,
    token_hash,
    status,
    expires_at,
    created_by
  )
  VALUES (
    org_id,
    normalized_email,
    normalized_role,
    public.hash_invitation_token(raw_token),
    'pending',
    now() + interval '7 days',
    current_user_id
  )
  ON CONFLICT (organization_id, lower(email)) WHERE status = 'pending'
  DO UPDATE SET
    role = excluded.role,
    token_hash = excluded.token_hash,
    expires_at = excluded.expires_at,
    created_by = excluded.created_by,
    updated_at = now()
  RETURNING * INTO invitation;

  RETURN QUERY
  SELECT
    invitation.id,
    invitation.organization_id,
    invitation.email,
    invitation.role,
    invitation.status,
    invitation.expires_at,
    invitation.accepted_at,
    invitation.created_at,
    raw_token;
END;
$$;

CREATE OR REPLACE FUNCTION public.rotate_organization_invitation_token(invitation_id uuid)
RETURNS TABLE(token text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  raw_token text := encode(extensions.gen_random_bytes(32), 'hex');
  invitation public.organization_invitations;
BEGIN
  SELECT *
  INTO invitation
  FROM public.organization_invitations
  WHERE id = invitation_id;

  IF invitation.id IS NULL THEN
    RAISE EXCEPTION 'Invitation not found' USING ERRCODE = '02000';
  END IF;

  IF NOT public.is_org_admin(invitation.organization_id) THEN
    RAISE EXCEPTION 'Admin access required' USING ERRCODE = '42501';
  END IF;

  IF invitation.status <> 'pending' THEN
    RAISE EXCEPTION 'Only pending invitations can be rotated' USING ERRCODE = '22023';
  END IF;

  UPDATE public.organization_invitations
  SET
    token_hash = public.hash_invitation_token(raw_token),
    expires_at = now() + interval '7 days'
  WHERE id = invitation_id;

  RETURN QUERY SELECT raw_token;
END;
$$;

CREATE OR REPLACE FUNCTION public.revoke_organization_invitation(invitation_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  invitation public.organization_invitations;
BEGIN
  SELECT *
  INTO invitation
  FROM public.organization_invitations
  WHERE id = invitation_id;

  IF invitation.id IS NULL THEN
    RAISE EXCEPTION 'Invitation not found' USING ERRCODE = '02000';
  END IF;

  IF NOT public.is_org_admin(invitation.organization_id) THEN
    RAISE EXCEPTION 'Admin access required' USING ERRCODE = '42501';
  END IF;

  UPDATE public.organization_invitations
  SET status = 'revoked'
  WHERE id = invitation_id
    AND status = 'pending';
END;
$$;

CREATE OR REPLACE FUNCTION public.accept_organization_invitation(raw_token text)
RETURNS TABLE(org_id uuid, organization_slug text, role text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  current_user_id uuid := (SELECT auth.uid());
  current_email text;
  invitation public.organization_invitations;
  org public.organizations;
BEGIN
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '28000';
  END IF;

  SELECT lower(email)
  INTO current_email
  FROM auth.users
  WHERE id = current_user_id;

  SELECT *
  INTO invitation
  FROM public.organization_invitations
  WHERE token_hash = public.hash_invitation_token(raw_token);

  IF invitation.id IS NULL THEN
    RAISE EXCEPTION 'Invitation not found' USING ERRCODE = '02000';
  END IF;

  IF invitation.status <> 'pending' THEN
    RAISE EXCEPTION 'Invitation is not pending' USING ERRCODE = '22023';
  END IF;

  IF invitation.expires_at <= now() THEN
    UPDATE public.organization_invitations
    SET status = 'expired'
    WHERE id = invitation.id;

    RAISE EXCEPTION 'Invitation has expired' USING ERRCODE = '22023';
  END IF;

  IF lower(invitation.email) <> current_email THEN
    RAISE EXCEPTION 'Invitation email does not match the signed-in user'
      USING ERRCODE = '42501';
  END IF;

  INSERT INTO public.organization_members (organization_id, user_id, role)
  VALUES (invitation.organization_id, current_user_id, invitation.role)
  ON CONFLICT (organization_id, user_id) DO UPDATE
  SET role = excluded.role;

  UPDATE public.organization_invitations
  SET status = 'accepted', accepted_at = now()
  WHERE id = invitation.id;

  SELECT *
  INTO org
  FROM public.organizations
  WHERE id = invitation.organization_id;

  RETURN QUERY SELECT org.id, org.slug, invitation.role;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_organization_invitation(uuid, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.rotate_organization_invitation_token(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.revoke_organization_invitation(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.accept_organization_invitation(text) TO authenticated;
